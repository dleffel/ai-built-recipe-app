import OpenAI from 'openai';
import { ContactService, ContactWithRelations } from './contactService';
import { GmailMessage } from '../types/gmail';

// Tool definitions for the agent
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'lookupContactByEmail',
      description: 'Look up a contact in the CRM by their email address. Returns the contact details if found.',
      parameters: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            description: 'The email address to search for',
          },
        },
        required: ['email'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createContact',
      description: 'Create a new contact in the CRM. Use this when lookupContactByEmail returns found: false. Extract the name from the email From field if available.',
      parameters: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            description: 'The email address for the new contact',
          },
          firstName: {
            type: 'string',
            description: 'First name extracted from the email From field or signature',
          },
          lastName: {
            type: 'string',
            description: 'Last name extracted from the email From field or signature. Use empty string if only one name is available.',
          },
          company: {
            type: 'string',
            description: 'Company name if found in email signature (optional)',
          },
          title: {
            type: 'string',
            description: 'Job title if found in email signature (optional)',
          },
        },
        required: ['email', 'firstName', 'lastName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'updateContactField',
      description: 'Update a specific field on a contact record. Only use this when there is HIGH CONFIDENCE evidence in the email (explicit mentions, clear signature blocks, or direct statements). Do not guess or infer information.',
      parameters: {
        type: 'object',
        properties: {
          contactId: {
            type: 'string',
            description: 'The ID of the contact to update',
          },
          field: {
            type: 'string',
            enum: ['firstName', 'lastName', 'company', 'title', 'notes', 'birthday'],
            description: 'The field to update',
          },
          value: {
            type: 'string',
            description: 'The new value for the field. For birthday, use ISO date format (YYYY-MM-DD). If year is unknown, use 1900 as the year.',
          },
          reason: {
            type: 'string',
            description: 'Explanation of why this update is being made and where the HIGH CONFIDENCE evidence was found in the email.',
          },
        },
        required: ['contactId', 'field', 'value', 'reason'],
      },
    },
  },
];

/**
 * Email Analysis Agent
 * Uses Claude via OpenRouter to analyze incoming emails and update CRM contacts
 */
export class EmailAnalysisAgent {
  private static getOpenAIClient() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.warn('[EmailAnalysisAgent] OPENROUTER_API_KEY not configured');
      return null;
    }
    return new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }

  /**
   * Analyze an email and update CRM contacts if relevant information is found
   */
  static async analyzeEmail(
    userId: string,
    accountEmail: string,
    message: GmailMessage,
    emailBody: string
  ): Promise<void> {
    console.log('='.repeat(60));
    console.log('EMAIL ANALYSIS AGENT STARTING');
    console.log('='.repeat(60));
    console.log('From:', message.from);
    console.log('Subject:', message.subject);
    console.log('Date:', message.date);

    const client = this.getOpenAIClient();
    if (!client) {
      console.log('[EmailAnalysisAgent] Skipping analysis - no API key configured');
      console.log('='.repeat(60));
      return;
    }

    const systemPrompt = `You are an email analysis agent for a CRM system. Your job is to:
1. Extract the sender's email address from the "From" field
2. Look up if we have an existing contact with that email
3. If a contact exists, analyze the email for any updated contact information such as:
   - Name changes or corrections
   - Company name from signature
   - Job title from signature
   - Phone numbers from signature
   - Birthday
4. If NO contact exists, CREATE a new contact using:
   - The email address from the From field
   - The name parsed from the From field (e.g., "John Doe" from "John Doe <john@example.com>")
   - Any company/title information found in the email signature
5. Update the contact record with any new information you discover

Guidelines for name parsing:
- From field format is typically "First Last <email@domain.com>"
- If only one name is present, use it as firstName and set lastName to empty string
- If no name is present (just email), use the part before @ as firstName

HIGH CONFIDENCE REQUIREMENT FOR ALL UPDATES:
Only update contact fields when there is EXPLICIT, HIGH-CONFIDENCE evidence in the email.
Do not guess, infer, or make assumptions about contact information.
Always document the source of information in the reason field.

Examples of HIGH-CONFIDENCE evidence:
- Name: Explicit signature block, "My name is...", corrections like "Actually, it's spelled..."
- Company: Clear signature block with company name, "I work at...", company email domain
- Title: Signature block with job title, "I'm the [title] at..."
- Birthday: Direct statements like "my birthday is January 15th", "I was born on 03/20/1985", or "It's my birthday today!"

Examples of LOW-CONFIDENCE evidence (DO NOT USE):
- Name: Informal nicknames without confirmation, ambiguous references
- Company: Vague mentions of organizations, assumptions from email domain
- Title: Informal role descriptions, assumptions based on email content
- Birthday: Age mentions without dates, zodiac references, vague celebration mentions

BIRTHDAY FIELD SPECIFIC GUIDELINES:
- Use ISO date format (YYYY-MM-DD). If year is unknown, use 1900 as the year (e.g., "1900-01-15")
- The source will be automatically appended to the contact's notes for audit purposes

Important guidelines:
- Extract email addresses from format like "John Doe <john@example.com>"
- Look for signature blocks at the end of emails for contact info
- Company names often appear after job titles in signatures
- Phone numbers may be formatted in various ways
- Do NOT create contacts for automated/system emails (noreply@, no-reply@, mailer-daemon@, etc.)
- Do NOT create a contact for the user's own email address (${accountEmail})

Current user context:
- User ID: ${userId}
- Account Email: ${accountEmail}`;

    const userPrompt = `Analyze this email and update or create CRM contacts as needed:

From: ${message.from || 'Unknown'}
To: ${message.to || 'Unknown'}
Subject: ${message.subject || '(No Subject)'}
Date: ${message.date || 'Unknown'}

Email Body:
${emailBody || message.snippet || '(No body content)'}

Instructions:
1. First, extract the sender's email address from the From field and look up the contact
2. If no contact exists, create one using the name and email from the From field
3. Analyze the email for any contact information updates (company, title, etc.)
4. Skip creating contacts for automated emails (noreply, no-reply, mailer-daemon, etc.)`;

    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      let iterations = 0;
      const maxIterations = 5;

      while (iterations < maxIterations) {
        iterations++;
        console.log(`[Agent] Iteration ${iterations}...`);

        const response = await client.chat.completions.create({
          model: 'anthropic/claude-sonnet-4',
          messages,
          tools,
          tool_choice: 'auto',
        });

        const assistantMessage = response.choices[0].message;
        messages.push(assistantMessage);

        // Check if the model wants to use tools
        if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
          // No more tool calls, agent is done
          console.log('-'.repeat(60));
          console.log('AGENT ANALYSIS COMPLETE');
          console.log('Final response:', assistantMessage.content);
          break;
        }

        // Process tool calls
        for (const toolCall of assistantMessage.tool_calls) {
          const functionName = toolCall.function.name;
          let args;
          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch (parseError) {
            console.error(`[Agent] Failed to parse tool arguments for ${functionName}:`, parseError);
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: 'Invalid tool arguments' }),
            });
            continue;
          }

          console.log(`[Tool] Calling ${functionName} with:`, args);

          let result: string;
          try {
            if (functionName === 'lookupContactByEmail') {
              result = await this.handleLookupContact(userId, args.email);
            } else if (functionName === 'createContact') {
              result = await this.handleCreateContact(userId, args);
            } else if (functionName === 'updateContactField') {
              result = await this.handleUpdateContact(userId, args);
            } else {
              result = JSON.stringify({ error: `Unknown function: ${functionName}` });
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            result = JSON.stringify({ error: errorMessage });
          }

          // Add tool result to messages
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result,
          });
        }
      }

      if (iterations >= maxIterations) {
        console.log('[Agent] Reached maximum iterations');
      }

      console.log('='.repeat(60));

    } catch (error) {
      console.error('[EmailAnalysisAgent] Error during analysis:', error);
      console.log('='.repeat(60));
    }
  }

  /**
   * Handle lookupContactByEmail tool call
   */
  private static async handleLookupContact(userId: string, email: string): Promise<string> {
    console.log(`[Tool] lookupContactByEmail: ${email}`);
    
    const contact = await ContactService.findByEmailAddress(userId, email);
    if (contact) {
      console.log(`[Tool] Found contact: ${contact.firstName} ${contact.lastName} (ID: ${contact.id})`);
      return JSON.stringify({
        found: true,
        contact: this.formatContactForAgent(contact),
      });
    }
    
    console.log(`[Tool] No contact found for email: ${email}`);
    return JSON.stringify({
      found: false,
      contact: null,
      message: 'No contact found. You should create a new contact using the createContact tool.',
    });
  }

  /**
   * Handle createContact tool call
   */
  private static async handleCreateContact(
    userId: string,
    args: {
      email: string;
      firstName: string;
      lastName: string;
      company?: string;
      title?: string;
    }
  ): Promise<string> {
    console.log('[Tool] createContact:');
    console.log('  Email:', args.email);
    console.log('  Name:', args.firstName, args.lastName);
    if (args.company) console.log('  Company:', args.company);
    if (args.title) console.log('  Title:', args.title);

    // Validate email
    if (!args.email || !args.email.includes('@')) {
      console.log('[Tool] Invalid email address');
      return JSON.stringify({
        success: false,
        message: 'Invalid email address provided',
      });
    }

    // Check for automated email addresses that should be skipped
    const automatedPatterns = [
      'noreply@', 'no-reply@', 'no_reply@',
      'mailer-daemon@', 'postmaster@',
      'notifications@', 'notification@',
      'donotreply@', 'do-not-reply@',
    ];
    const emailLower = args.email.toLowerCase();
    if (automatedPatterns.some(pattern => emailLower.startsWith(pattern))) {
      console.log('[Tool] Skipping automated email address');
      return JSON.stringify({
        success: false,
        message: 'Skipped: This appears to be an automated email address',
      });
    }

    try {
      // Check if contact already exists (race condition protection)
      const existingContact = await ContactService.findByEmailAddress(userId, args.email);
      if (existingContact) {
        console.log('[Tool] Contact already exists:', existingContact.id);
        return JSON.stringify({
          success: false,
          message: 'Contact with this email already exists',
          contact: this.formatContactForAgent(existingContact),
        });
      }

      const contact = await ContactService.createContact(userId, {
        firstName: args.firstName,
        lastName: args.lastName,
        company: args.company,
        title: args.title,
        emails: [{ email: args.email, label: 'work', isPrimary: true }],
      });
      
      console.log('[Tool] Successfully created contact:', contact.id);
      return JSON.stringify({
        success: true,
        message: `Created new contact: ${args.firstName} ${args.lastName}`,
        contact: this.formatContactForAgent(contact),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Tool] Failed to create contact:', errorMessage);
      return JSON.stringify({
        success: false,
        message: `Failed to create contact: ${errorMessage}`,
      });
    }
  }

  /**
   * Handle updateContactField tool call
   */
  private static async handleUpdateContact(
    userId: string,
    args: { contactId: string; field: string; value: string; reason: string }
  ): Promise<string> {
    console.log(`[Tool] updateContactField:`);
    console.log(`  Contact ID: ${args.contactId}`);
    console.log(`  Field: ${args.field}`);
    console.log(`  Value: ${args.value}`);
    console.log(`  Reason: ${args.reason}`);

    try {
      // For birthday field, also append source information to notes
      if (args.field === 'birthday') {
        // First get the current contact to access existing notes
        const contact = await ContactService.findById(args.contactId);
        if (contact && contact.userId === userId) {
          const timestamp = new Date().toISOString().split('T')[0];
          const sourceNote = `[${timestamp}] Birthday set via email analysis: ${args.reason}`;
          const existingNotes = contact.notes || '';
          const updatedNotes = existingNotes
            ? `${existingNotes}\n\n${sourceNote}`
            : sourceNote;
          
          // Parse the birthday value - convert YYYY-MM-DD to ISO date string
          let birthdayValue = args.value;
          if (/^\d{4}-\d{2}-\d{2}$/.test(args.value)) {
            // It's in YYYY-MM-DD format, convert to ISO string
            const [year, month, day] = args.value.split('-').map(Number);
            birthdayValue = new Date(Date.UTC(year, month - 1, day)).toISOString();
          }
          
          await ContactService.updateContact(args.contactId, userId, {
            birthday: birthdayValue,
            notes: updatedNotes,
          });
          console.log(`[Tool] Successfully updated birthday and appended source to notes`);
          return JSON.stringify({
            success: true,
            message: `Updated birthday to "${args.value}" and documented source in notes`
          });
        }
      }
      
      await ContactService.updateContact(args.contactId, userId, {
        [args.field]: args.value,
      });
      console.log(`[Tool] Successfully updated ${args.field}`);
      return JSON.stringify({
        success: true,
        message: `Updated ${args.field} to "${args.value}"`
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Tool] Failed to update contact:`, errorMessage);
      return JSON.stringify({
        success: false,
        message: `Failed to update: ${errorMessage}`
      });
    }
  }

  /**
   * Format contact data for the agent to understand
   */
  private static formatContactForAgent(contact: ContactWithRelations) {
    return {
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      company: contact.company,
      title: contact.title,
      notes: contact.notes,
      emails: contact.emails.map((e) => ({ 
        email: e.email, 
        label: e.label 
      })),
      phones: contact.phones.map((p) => ({ 
        phone: p.phone, 
        label: p.label 
      })),
    };
  }

  /**
   * Extract email address from a formatted string like "John Doe <john@example.com>"
   */
  static extractEmailAddress(emailString: string): string | null {
    const match = emailString.match(/<([^>]+)>/);
    if (match) {
      return match[1].toLowerCase();
    }
    // If no angle brackets, check if the whole string is an email
    if (emailString.includes('@')) {
      return emailString.trim().toLowerCase();
    }
    return null;
  }
}
