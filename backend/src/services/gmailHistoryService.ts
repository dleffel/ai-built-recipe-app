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
   * Get details for a specific message including full body
   * Falls back to metadata format if the user's OAuth scope doesn't allow full format
   */
  private static async getMessageDetails(
    gmail: any,
    messageId: string
  ): Promise<GmailMessage | null> {
    try {
      // First try to get full message (requires gmail.readonly scope)
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full', // Get full message including body
      });

      const message = response.data;
      if (!message) return null;

      return this.parseMessage(message);
    } catch (error: any) {
      // Check if the error is due to metadata scope limitation
      const isMetadataScopeError =
        error?.status === 403 &&
        error?.errors?.some((e: any) =>
          e.message?.includes("Metadata scope doesn't allow format FULL")
        );

      if (isMetadataScopeError) {
        // Fall back to metadata format (works with gmail.metadata scope)
        console.log(`Falling back to metadata format for message ${messageId} (user has metadata-only scope)`);
        try {
          const metadataResponse = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'metadata',
            metadataHeaders: ['From', 'To', 'Subject', 'Date'],
          });

          const message = metadataResponse.data;
          if (!message) return null;

          return this.parseMessage(message);
        } catch (metadataError) {
          console.error(`Error fetching message ${messageId} with metadata format:`, metadataError);
          return null;
        }
      }

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
      body?: { data?: string | null } | null;
      parts?: any[] | null;
    } | null;
  }): GmailMessage {
    const headers = message.payload?.headers || [];
    
    const getHeader = (name: string): string | undefined => {
      const header = headers.find(
        (h) => h.name?.toLowerCase() === name.toLowerCase()
      );
      return header?.value || undefined;
    };

    // Extract plain text body from message parts
    const body = this.extractPlainTextBody(message.payload);

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
      body,
    };
  }

  /**
   * Extract plain text body from Gmail message payload
   * Handles both simple messages and multipart messages
   */
  private static extractPlainTextBody(payload: any): string {
    if (!payload) return '';

    // Direct body data (simple messages)
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    // Check parts for text/plain (multipart messages)
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
        // Recursively check nested parts (e.g., multipart/alternative)
        if (part.parts) {
          const nested = this.extractPlainTextBody(part);
          if (nested) return nested;
        }
      }
    }

    return '';
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
