// Note: googleapis import will work after npm install
// eslint-disable-next-line @typescript-eslint/no-var-requires
let google: any;
try {
  google = require('googleapis').google;
} catch {
  // googleapis not installed yet, will be available after npm install
  google = null;
}

import { GmailOAuthService } from './gmailOAuthService';
import { GmailAccountService, GmailAccount } from './gmailAccountService';
import { GmailMessage } from '../types/gmail';

/**
 * Gmail History Service
 * Fetches email changes using the Gmail History API for incremental sync
 */
export class GmailHistoryService {
  /**
   * Get new messages since the specified history ID
   */
  static async getNewMessages(
    account: GmailAccount,
    startHistoryId: string
  ): Promise<GmailMessage[]> {
    const oauth2Client = await GmailOAuthService.getAuthenticatedClient(account);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const messages: GmailMessage[] = [];
    let pageToken: string | undefined;

    do {
      const response = await gmail.users.history.list({
        userId: 'me',
        startHistoryId,
        historyTypes: ['messageAdded'],
        pageToken,
      });

      if (response.data.history) {
        for (const historyItem of response.data.history) {
          if (historyItem.messagesAdded) {
            for (const added of historyItem.messagesAdded) {
              const messageId = added.message?.id;
              if (messageId) {
                try {
                  const fullMessage = await this.getMessageDetails(gmail, messageId);
                  if (fullMessage) {
                    messages.push(fullMessage);
                  }
                } catch (error) {
                  console.error(`Failed to fetch message ${messageId}:`, error);
                }
              }
            }
          }
        }
      }

      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    // Update the stored historyId
    if (messages.length > 0) {
      const latestHistoryId = await this.getLatestHistoryId(gmail);
      if (latestHistoryId) {
        await GmailAccountService.updateHistoryId(account.id, latestHistoryId);
      }
    }

    return messages;
  }

  /**
   * Get details for a specific message
   */
  private static async getMessageDetails(
    gmail: any,
    messageId: string
  ): Promise<GmailMessage | null> {
    try {
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      });

      const message = response.data;
      if (!message) return null;

      return this.parseMessage(message);
    } catch (error) {
      console.error(`Error fetching message ${messageId}:`, error);
      return null;
    }
  }

  /**
   * Parse a Gmail API message response into our GmailMessage type
   */
  private static parseMessage(message: {
    id?: string | null;
    threadId?: string | null;
    labelIds?: string[] | null;
    snippet?: string | null;
    historyId?: string | null;
    internalDate?: string | null;
    payload?: {
      headers?: Array<{ name?: string | null; value?: string | null }> | null;
    } | null;
  }): GmailMessage {
    const headers = message.payload?.headers || [];
    
    const getHeader = (name: string): string | undefined => {
      const header = headers.find(
        (h) => h.name?.toLowerCase() === name.toLowerCase()
      );
      return header?.value || undefined;
    };

    return {
      id: message.id || '',
      threadId: message.threadId || '',
      labelIds: message.labelIds || [],
      snippet: message.snippet || '',
      historyId: message.historyId || '',
      internalDate: message.internalDate || '',
      from: getHeader('From'),
      to: getHeader('To'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
    };
  }

  /**
   * Get the latest history ID for the account
   */
  private static async getLatestHistoryId(
    gmail: any
  ): Promise<string | null> {
    try {
      const response = await gmail.users.getProfile({
        userId: 'me',
      });
      return response.data.historyId || null;
    } catch (error) {
      console.error('Error getting latest history ID:', error);
      return null;
    }
  }

  /**
   * Get a single message by ID
   */
  static async getMessage(
    account: GmailAccount,
    messageId: string
  ): Promise<GmailMessage | null> {
    const oauth2Client = await GmailOAuthService.getAuthenticatedClient(account);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    return this.getMessageDetails(gmail, messageId);
  }

  /**
   * List recent messages (for initial sync or debugging)
   */
  static async listRecentMessages(
    account: GmailAccount,
    maxResults: number = 10
  ): Promise<GmailMessage[]> {
    const oauth2Client = await GmailOAuthService.getAuthenticatedClient(account);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
    });

    const messages: GmailMessage[] = [];
    
    if (response.data.messages) {
      for (const msg of response.data.messages) {
        if (msg.id) {
          const fullMessage = await this.getMessageDetails(gmail, msg.id);
          if (fullMessage) {
            messages.push(fullMessage);
          }
        }
      }
    }

    return messages;
  }
}