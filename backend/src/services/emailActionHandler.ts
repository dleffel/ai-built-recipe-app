import { GmailMessage } from '../types/gmail';
import { EmailAnalysisAgent } from './emailAnalysisAgent';

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
 * Processes new emails and triggers AI analysis for CRM updates
 * 
 * This handler receives new emails from Gmail and invokes the
 * EmailAnalysisAgent to analyze them and update CRM contacts.
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
    // Log basic info for debugging
    console.log('New email received:', {
      from: message.from,
      subject: message.subject,
      date: message.date,
      hasBody: !!message.body,
      bodyLength: message.body?.length || 0,
    });

    // Determine email direction
    const direction = this.determineEmailDirection(account.email, message);
    console.log('Email direction:', direction);

    // Invoke the AI agent to analyze and process the email
    await EmailAnalysisAgent.analyzeEmail(
      account.userId,
      account.email,
      message,
      message.body || message.snippet || ''
    );
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
  static extractEmailAddress(emailString: string): string | null {
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
  static extractAllEmailAddresses(emailString: string): string[] {
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
}
