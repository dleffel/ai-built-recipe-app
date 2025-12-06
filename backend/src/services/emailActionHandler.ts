import { GmailMessage } from '../types/gmail';

// Type for GmailAccount since Prisma client isn't generated yet
interface GmailAccountType {
  id: string;
  email: string;
  userId: string;
  isPrimary: boolean;
  isActive: boolean;
}

/**
 * Email Action Handler
 * Processes new emails and triggers appropriate actions
 * 
 * For the POC, this simply logs each new email to the console.
 * In the future, this will integrate with the CRM to:
 * - Match email addresses to contacts
 * - Create activity records
 * - Update contact information
 * - Trigger automated workflows
 */
export class EmailActionHandler {
  /**
   * Handle a new email notification
   * This is the main entry point for processing new emails
   */
  static async handleNewEmail(
    account: GmailAccountType,
    message: GmailMessage
  ): Promise<void> {
    // POC: Log the email details
    console.log('='.repeat(60));
    console.log('NEW EMAIL DETECTED');
    console.log('='.repeat(60));
    console.log('Account:', account.email);
    console.log('Account ID:', account.id);
    console.log('User ID:', account.userId);
    console.log('Is Primary:', account.isPrimary);
    console.log('-'.repeat(60));
    console.log('Message ID:', message.id);
    console.log('Thread ID:', message.threadId);
    console.log('From:', message.from || 'N/A');
    console.log('To:', message.to || 'N/A');
    console.log('Subject:', message.subject || '(No Subject)');
    console.log('Date:', message.date || 'N/A');
    console.log('Labels:', message.labelIds.join(', ') || 'None');
    console.log('Snippet:', message.snippet?.substring(0, 100) || 'N/A');
    console.log('='.repeat(60));

    // Determine email direction
    const direction = this.determineEmailDirection(account.email, message);
    console.log('Direction:', direction);

    // Log additional metadata
    console.log('Processed at:', new Date().toISOString());
    console.log('='.repeat(60));
    console.log('');

    // Future enhancements would go here:
    // - await this.matchToContact(message);
    // - await this.createActivityRecord(account, message);
    // - await this.triggerWorkflows(account, message);
  }

  /**
   * Determine if the email was sent or received
   */
  private static determineEmailDirection(
    accountEmail: string,
    message: GmailMessage
  ): 'sent' | 'received' | 'unknown' {
    const normalizedAccountEmail = accountEmail.toLowerCase();
    
    // Check if the account email is in the From field
    if (message.from?.toLowerCase().includes(normalizedAccountEmail)) {
      return 'sent';
    }
    
    // Check if the account email is in the To field
    if (message.to?.toLowerCase().includes(normalizedAccountEmail)) {
      return 'received';
    }

    // Check labels as fallback
    if (message.labelIds.includes('SENT')) {
      return 'sent';
    }
    if (message.labelIds.includes('INBOX')) {
      return 'received';
    }

    return 'unknown';
  }

  /**
   * Extract email address from a formatted email string
   * e.g., "John Doe <john@example.com>" -> "john@example.com"
   */
  private static extractEmailAddress(emailString: string): string | null {
    const match = emailString.match(/<([^>]+)>/);
    if (match) {
      return match[1].toLowerCase();
    }
    // If no angle brackets, assume the whole string is an email
    if (emailString.includes('@')) {
      return emailString.trim().toLowerCase();
    }
    return null;
  }

  /**
   * Extract all email addresses from a comma-separated list
   */
  private static extractAllEmailAddresses(emailString: string): string[] {
    const addresses: string[] = [];
    const parts = emailString.split(',');
    
    for (const part of parts) {
      const email = this.extractEmailAddress(part.trim());
      if (email) {
        addresses.push(email);
      }
    }
    
    return addresses;
  }

  // ============================================================
  // Future CRM Integration Methods (Placeholders)
  // ============================================================

  /**
   * Match email addresses to existing contacts
   * @future This will query the CRM database for matching contacts
   */
  // private static async matchToContact(message: GmailMessage): Promise<void> {
  //   // TODO: Implement contact matching
  //   // const fromEmail = this.extractEmailAddress(message.from || '');
  //   // const contact = await ContactService.findByEmail(fromEmail);
  // }

  /**
   * Create an activity record for the email
   * @future This will create a record in the CRM activity timeline
   */
  // private static async createActivityRecord(
  //   account: GmailAccountType,
  //   message: GmailMessage
  // ): Promise<void> {
  //   // TODO: Implement activity recording
  // }

  /**
   * Trigger any automated workflows based on the email
   * @future This will check for and execute workflow rules
   */
  // private static async triggerWorkflows(
  //   account: GmailAccountType,
  //   message: GmailMessage
  // ): Promise<void> {
  //   // TODO: Implement workflow triggers
  // }
}