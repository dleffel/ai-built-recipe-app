import { GmailAccountService } from './gmailAccountService';
import { GmailHistoryService } from './gmailHistoryService';
import { EmailActionHandler } from './emailActionHandler';
import { PubSubMessage, GmailPubSubNotification } from '../types/gmail';

/**
 * Gmail Pub/Sub Service
 * Handles incoming Pub/Sub notifications from Gmail
 */
export class GmailPubSubService {
  // In-memory lock map to prevent concurrent processing for the same email account
  // Key: email address, Value: Promise that resolves when processing is complete
  private static processingLocks: Map<string, Promise<void>> = new Map();

  /**
   * Acquire a lock for processing notifications for a specific email address.
   * If a lock already exists, wait for it to be released before acquiring a new one.
   */
  private static async acquireLock(emailAddress: string): Promise<() => void> {
    // Wait for any existing lock to be released
    const existingLock = this.processingLocks.get(emailAddress);
    if (existingLock) {
      try {
        await existingLock;
      } catch {
        // Ignore errors from previous processing, we still want to proceed
      }
    }

    // Create a new lock with a resolver function
    let releaseLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    this.processingLocks.set(emailAddress, lockPromise);

    // Return the release function
    return releaseLock!;
  }

  /**
   * Process a Pub/Sub notification from Gmail
   */
  static async processNotification(pubsubMessage: PubSubMessage): Promise<void> {
    // Decode the base64 message data
    const data = Buffer.from(pubsubMessage.message.data, 'base64').toString();
    
    let notification: GmailPubSubNotification;
    try {
      notification = JSON.parse(data);
    } catch (error) {
      console.error('Failed to parse Pub/Sub notification data:', data);
      throw new Error('Invalid notification data format');
    }

    console.log('Received Gmail notification:', {
      emailAddress: notification.emailAddress,
      historyId: notification.historyId,
      messageId: pubsubMessage.message.messageId,
    });

    // Acquire lock to prevent concurrent processing for the same email address
    // This prevents race conditions when multiple notifications arrive simultaneously
    const releaseLock = await this.acquireLock(notification.emailAddress);

    try {
      // Find the Gmail account by email address
      const account = await GmailAccountService.findByEmail(notification.emailAddress);
      
      if (!account) {
        console.warn(`Received notification for unknown email: ${notification.emailAddress}`);
        return;
      }

      if (!account.isActive) {
        console.log(`Ignoring notification for inactive account: ${notification.emailAddress}`);
        return;
      }

      // Get the starting history ID
      const startHistoryId = account.historyId;
      
      if (!startHistoryId) {
        console.log(`No history ID for account ${notification.emailAddress}, setting initial history ID`);
        await GmailAccountService.updateHistoryId(account.id, notification.historyId);
        return;
      }

      // Fetch new messages since the last history ID
      try {
        const newMessages = await GmailHistoryService.getNewMessages(
          account,
          startHistoryId
        );

        console.log(`Found ${newMessages.length} new messages for ${notification.emailAddress}`);

        // Process each new message
        for (const message of newMessages) {
          await EmailActionHandler.handleNewEmail(account, message);
        }

        // Update the history ID to the latest
        await GmailAccountService.updateHistoryId(account.id, notification.historyId);
      } catch (error) {
        // If we get a 404 error, the history ID is too old
        // Reset to the new history ID and continue
        if (error instanceof Error && error.message.includes('404')) {
          console.warn(`History ID too old for ${notification.emailAddress}, resetting`);
          await GmailAccountService.updateHistoryId(account.id, notification.historyId);
        } else {
          throw error;
        }
      }
    } finally {
      // Always release the lock when done
      releaseLock();
    }
  }
}