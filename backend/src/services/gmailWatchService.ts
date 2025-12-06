import { google } from 'googleapis';
import { BaseService } from './BaseService';
import { GmailAccountService } from './gmailAccountService';
import { GmailOAuthService } from './gmailOAuthService';
import { GmailWatchResponse } from '../types/gmail';

// Type for GmailWatch since Prisma client isn't generated yet
interface GmailWatchType {
  id: string;
  resourceId: string;
  expiration: Date;
  isActive: boolean;
  gmailAccountId: string;
}

// Type for GmailAccount since Prisma client isn't generated yet
interface GmailAccountType {
  id: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  historyId: string | null;
  userId: string;
  isActive: boolean;
}

/**
 * Gmail Watch Service
 * Manages Gmail Pub/Sub watch subscriptions for real-time email notifications
 */
export class GmailWatchService extends BaseService {
  /**
   * Set up a Gmail watch for an account
   * This creates a Pub/Sub subscription that notifies us of new emails
   */
  static async setupWatch(gmailAccountId: string): Promise<GmailWatchType> {
    const account = await GmailAccountService.findById(gmailAccountId);
    if (!account) {
      throw new Error('Gmail account not found');
    }

    const topicName = process.env.GMAIL_PUBSUB_TOPIC;
    if (!topicName) {
      throw new Error('GMAIL_PUBSUB_TOPIC environment variable not set');
    }

    // Get authenticated client
    const oauth2Client = await GmailOAuthService.getAuthenticatedClient(account as GmailAccountType);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Set up the watch
    const response = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName,
        labelFilterBehavior: 'include',
        // Monitor all important labels
        labelIds: ['INBOX', 'SENT', 'DRAFT'],
      },
    });

    const watchData = response.data as GmailWatchResponse;

    // Deactivate any existing watches for this account
    await this.prisma.gmailWatch.updateMany({
      where: {
        gmailAccountId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Create new watch record
    const watch = await this.prisma.gmailWatch.create({
      data: {
        gmailAccountId,
        resourceId: watchData.historyId, // Gmail returns historyId, not resourceId
        expiration: new Date(parseInt(watchData.expiration)),
        isActive: true,
      },
    });

    // Update the account's historyId if not set
    if (!account.historyId) {
      await GmailAccountService.updateHistoryId(gmailAccountId, watchData.historyId);
    }

    console.log(`Gmail watch set up for ${account.email}, expires at ${watch.expiration}`);

    return watch as GmailWatchType;
  }

  /**
   * Stop a Gmail watch for an account
   */
  static async stopWatch(gmailAccountId: string): Promise<void> {
    const account = await GmailAccountService.findById(gmailAccountId);
    if (!account) {
      throw new Error('Gmail account not found');
    }

    try {
      // Get authenticated client
      const oauth2Client = await GmailOAuthService.getAuthenticatedClient(account as GmailAccountType);
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Stop the watch
      await gmail.users.stop({
        userId: 'me',
      });

      console.log(`Gmail watch stopped for ${account.email}`);
    } catch (error) {
      console.error(`Error stopping Gmail watch for ${account.email}:`, error);
      // Continue to deactivate local records even if API call fails
    }

    // Deactivate all watches for this account
    await this.prisma.gmailWatch.updateMany({
      where: {
        gmailAccountId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Get active watch for an account
   */
  static async getActiveWatch(gmailAccountId: string): Promise<GmailWatchType | null> {
    return this.prisma.gmailWatch.findFirst({
      where: {
        gmailAccountId,
        isActive: true,
      },
    }) as Promise<GmailWatchType | null>;
  }

  /**
   * Get all watches expiring within the specified time window
   */
  static async getExpiringWatches(withinMinutes: number = 60): Promise<GmailWatchType[]> {
    const expirationThreshold = new Date(Date.now() + withinMinutes * 60 * 1000);

    return this.prisma.gmailWatch.findMany({
      where: {
        isActive: true,
        expiration: {
          lte: expirationThreshold,
        },
      },
      include: {
        gmailAccount: true,
      },
    }) as Promise<GmailWatchType[]>;
  }

  /**
   * Renew all expiring watches
   * Should be called periodically (e.g., every hour)
   */
  static async renewExpiringWatches(): Promise<number> {
    const expiringWatches = await this.getExpiringWatches(60); // Watches expiring in next hour
    let renewedCount = 0;

    for (const watch of expiringWatches) {
      try {
        // Check if the account is still active
        const account = await GmailAccountService.findById(watch.gmailAccountId);
        if (!account || !account.isActive) {
          // Deactivate the watch if account is inactive
          await this.prisma.gmailWatch.update({
            where: { id: watch.id },
            data: { isActive: false },
          });
          continue;
        }

        // Set up a new watch (this will deactivate the old one)
        await this.setupWatch(watch.gmailAccountId);
        renewedCount++;

        console.log(`Renewed Gmail watch for account ${watch.gmailAccountId}`);
      } catch (error) {
        console.error(`Failed to renew watch for account ${watch.gmailAccountId}:`, error);
      }
    }

    return renewedCount;
  }

  /**
   * Set up watches for all active accounts that don't have one
   * Useful for initial setup or recovery
   */
  static async setupMissingWatches(): Promise<number> {
    const activeAccounts = await GmailAccountService.getActiveAccounts();
    let setupCount = 0;

    for (const account of activeAccounts) {
      const existingWatch = await this.getActiveWatch(account.id);
      
      if (!existingWatch) {
        try {
          await this.setupWatch(account.id);
          setupCount++;
          console.log(`Set up missing watch for ${account.email}`);
        } catch (error) {
          console.error(`Failed to set up watch for ${account.email}:`, error);
        }
      }
    }

    return setupCount;
  }
}