import { GmailAccountService } from './gmailAccountService';
import { GmailHistoryService } from './gmailHistoryService';
import { EmailActionHandler } from './emailActionHandler';
import { PubSubMessage, GmailPubSubNotification } from '../types/gmail';

/**
 * Lock state for an email account
 */
interface LockState {
  promise: Promise<void>;
  resolve: () => void;
}

/**
 * Gmail Pub/Sub Service
 * Handles incoming Pub/Sub notifications from Gmail
 */
export class GmailPubSubService {
  // In-memory lock map to prevent concurrent processing for the same email account
  // Key: email address, Value: LockState with promise and resolver
  private static processingLocks: Map<string, LockState> = new Map();

  // Track recently processed message IDs to prevent duplicate processing
  // Key: message ID, Value: timestamp when processed
  private static processedMessages: Map<string, number> = new Map();

  // How long to keep processed message IDs in memory (5 minutes)
  private static readonly MESSAGE_CACHE_TTL_MS = 5 * 60 * 1000;

  // Cleanup interval for processed messages cache
  private static cleanupInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Start the cleanup interval for processed messages cache
   */
  private static startCleanupInterval(): void {
    if (this.cleanupInterval) return;
    
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [messageId, timestamp] of this.processedMessages) {
        if (now - timestamp > this.MESSAGE_CACHE_TTL_MS) {
          this.processedMessages.delete(messageId);
        }
      }
    }, 60 * 1000); // Run cleanup every minute
  }

  /**
   * Check if a message has already been processed recently
   */
  private static isMessageProcessed(messageId: string): boolean {
    const timestamp = this.processedMessages.get(messageId);
    if (!timestamp) return false;
    
    // Check if the cache entry has expired
    if (Date.now() - timestamp > this.MESSAGE_CACHE_TTL_MS) {
      this.processedMessages.delete(messageId);
      return false;
    }
    
    return true;
  }

  /**
   * Mark a message as processed
   */
  private static markMessageProcessed(messageId: string): void {
    this.processedMessages.set(messageId, Date.now());
    this.startCleanupInterval();
  }

  /**
   * Acquire a lock for processing notifications for a specific email address.
   * Uses a proper mutex pattern to prevent race conditions.
   * If a lock already exists, wait for it to be released before acquiring a new one.
   */
  private static async acquireLock(emailAddress: string): Promise<() => void> {
    // Keep trying until we successfully acquire the lock
    while (true) {
      const existingLock = this.processingLocks.get(emailAddress);
      
      if (existingLock) {
        // Wait for the existing lock to be released
        try {
          await existingLock.promise;
        } catch {
          // Ignore errors from previous processing
        }
        // After waiting, check again - another waiter might have acquired the lock
        continue;
      }

      // No existing lock - try to acquire it
      // Create a new lock state
      let resolve: () => void;
      const promise = new Promise<void>((res) => {
        resolve = res;
      });
      
      const lockState: LockState = { promise, resolve: resolve! };
      
      // Double-check no one else acquired the lock while we were setting up
      // This is the critical section - in JS single-threaded model this is safe
      // because there's no await between the check and the set
      if (!this.processingLocks.has(emailAddress)) {
        this.processingLocks.set(emailAddress, lockState);
        
        // Return a release function that cleans up properly
        return () => {
          this.processingLocks.delete(emailAddress);
          lockState.resolve();
        };
      }
      
      // Someone else got the lock, try again
      continue;
    }
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

    const pubsubMessageId = pubsubMessage.message.messageId;
    
    console.log('Received Gmail notification:', {
      emailAddress: notification.emailAddress,
      historyId: notification.historyId,
      messageId: pubsubMessageId,
    });

    // Check if this exact Pub/Sub message was already processed (deduplication)
    if (this.isMessageProcessed(pubsubMessageId)) {
      console.log(`Skipping duplicate Pub/Sub message: ${pubsubMessageId}`);
      return;
    }

    // Mark this Pub/Sub message as being processed
    this.markMessageProcessed(pubsubMessageId);

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
      
      // Gmail API returns historyId as an integer, but Prisma expects a string
      const notificationHistoryId = String(notification.historyId);
      
      if (!startHistoryId) {
        console.log(`No history ID for account ${notification.emailAddress}, setting initial history ID`);
        await GmailAccountService.updateHistoryId(account.id, notificationHistoryId);
        return;
      }

      // Skip if we've already processed up to or past this history ID
      // historyId is a monotonically increasing integer (as string)
      if (BigInt(startHistoryId) >= BigInt(notificationHistoryId)) {
        console.log(`Already processed up to history ID ${startHistoryId}, notification has ${notificationHistoryId}, skipping`);
        return;
      }

      // Fetch new messages since the last history ID
      try {
        const newMessages = await GmailHistoryService.getNewMessages(
          account,
          startHistoryId
        );

        console.log(`Found ${newMessages.length} new messages for ${notification.emailAddress}`);

        // Filter out any messages we've already processed
        const unprocessedMessages = newMessages.filter(msg => {
          if (this.isMessageProcessed(`gmail:${msg.id}`)) {
            console.log(`Skipping already processed Gmail message: ${msg.id}`);
            return false;
          }
          return true;
        });

        console.log(`Processing ${unprocessedMessages.length} unprocessed messages`);

        // Process each new message
        for (const message of unprocessedMessages) {
          // Mark the Gmail message as processed before handling
          // This prevents reprocessing if another notification arrives
          this.markMessageProcessed(`gmail:${message.id}`);
          
          try {
            await EmailActionHandler.handleNewEmail(account, message);
          } catch (error) {
            console.error(`Error processing message ${message.id}:`, error);
            // Continue processing other messages even if one fails
          }
        }

        // Update the history ID to the latest
        await GmailAccountService.updateHistoryId(account.id, notificationHistoryId);
      } catch (error) {
        // If we get a 404 error, the history ID is too old
        // Reset to the new history ID and continue
        if (error instanceof Error && error.message.includes('404')) {
          console.warn(`History ID too old for ${notification.emailAddress}, resetting`);
          await GmailAccountService.updateHistoryId(account.id, notificationHistoryId);
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
