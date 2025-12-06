import { GmailAccountService } from './gmailAccountService';
import { GmailHistoryService } from './gmailHistoryService';
import { EmailActionHandler } from './emailActionHandler';
import { PubSubMessage, GmailPubSubNotification } from '../types/gmail';

/**
 * Gmail Pub/Sub Service
 * Handles incoming Pub/Sub notifications from Gmail
 */
export class GmailPubSubService {
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
  }
}