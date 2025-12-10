import OpenAI from 'openai';
import { ContactService, ContactWithRelations } from './contactService';
import { GmailMessage } from '../types/gmail';
import { NotesParser, parseNotes, serializeNotes, applyUpdate, NoteUpdate } from '../utils/notesParser';

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
      description: 'Update a specific field on a contact record. Use this to update basic contact information (name, company, title) discovered in the email.',
      parameters: {
        type: 'object',
        properties: {
          contactId: {
            type: 'string',
            description: 'The ID of the contact to update',
          },
          field: {
            type: 'string',
            enum: ['firstName', 'lastName', 'company', 'title'],
            description: 'The field to update',
          },
          value: {
            type: 'string',
            description: 'The new value for the field',
          },
          reason: {
            type: 'string',
            description: 'Explanation of why this update is being made and where the information was found',
          },
        },
        required: ['contactId', 'field', 'value', 'reason'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'enhanceContactNotes',
      description: `Add high-confidence information to contact notes. Use this to record relationship context, preferences, key interactions, and insights learned from emails.
      
SECTIONS:
- relationshipSummary: How you know them, their role, who introduced you
- whatTheyCareAbout: Their goals, pain points, topics that engage them
- keyHistory: Dated entries of important interactions (always include date)
- currentStatus: Where things stand, risks, next steps
- preferences: Communication preferences, style, things to avoid, personal details

Only use this for HIGH-CONFIDENCE information that is explicitly stated or clearly inferable from the email.`,
      parameters: {
        type: 'object',
        properties: {
          contactId: {
            type: 'string',
            description: 'The ID of the contact to update',
          },
          section: {
            type: 'string',
            enum: ['relationshipSummary', 'whatTheyCareAbout', 'keyHistory', 'currentStatus', 'preferences'],
            description: 'The notes section to update',
          },
          field: {
            type: 'string',
            description: `The specific field within the section:
- relationshipSummary: role, howWeMet, relationshipOwner
- whatTheyCareAbout: goals, pains, hotButtons
- keyHistory: (use "entry" - value should be the interaction summary)
- currentStatus: whereThingsStand, risks, nextStep
- preferences: communication, style, landmines, personal`,
          },
          value: {
            type: 'string',
            description: 'The information to add. For keyHistory, this is the interaction summary.',
          },
          confidence: {
            type: 'string',
            enum: ['explicit', 'inferred'],
            description: 'Whether this was explicitly stated in the email or inferred from context',
          },
          source: {
            type: 'string',
            description: 'Brief description of where in the email this information was found',
          },
        },
        required: ['contactId', 'section', 'field', 'value', 'confidence', 'source'],
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

    const emailDate = message.date || new Date().toISOString().split('T')[0];
    
    const systemPrompt = `You are an email analysis agent for a CRM system. Your job is to:

1. CONTACT MANAGEMENT
   - Extract sender email and look up existing contact
   - Create new contacts for unknown senders (skip automated emails)
   - Update basic fields (name, company, title) from signatures

2. NOTES ENHANCEMENT (PRIMARY FOCUS)
   Analyze each email for high-signal information to add to contact notes.
   Only record HIGH-CONFIDENCE information - things explicitly stated or clearly inferable.

   WHAT TO CAPTURE:

   A. Relationship Context (relationshipSummary section)
      - How you connected (if mentioned: "Great meeting you at...")
      - Their role/influence level (decision-maker, champion, blocker)
      - Who introduced them or how they found you

   B. What They Care About (whatTheyCareAbout section)
      - Goals they mention ("We're trying to improve...")
      - Pain points ("Our biggest challenge is...")
      - Topics that engage them (what they ask about, emphasize)

   C. Key Interactions (keyHistory section - add dated entries)
      - Important requests or asks
      - Commitments made (by them or to them)
      - Decisions or outcomes ("We've decided to...")
      - Significant updates to the relationship

   D. Current Status (currentStatus section)
      - Where things stand in any ongoing discussion
      - Blockers or risks mentioned
      - Next steps discussed

   E. Preferences & Personal (preferences section)
      - Communication preferences (if stated: "Best to reach me by...")
      - Working style hints (detail-oriented, prefers brevity, etc.)
      - Personal details for rapport (mentioned hobbies, family, etc.)
      - Things to avoid (complaints, sensitivities)

   WHAT NOT TO CAPTURE:
   - Gossip or subjective judgments
   - Sensitive personal information
   - Anything discriminatory
   - Low-confidence guesses
   - Routine pleasantries

   CONFIDENCE LEVELS:
   - "explicit": Directly stated in the email
   - "inferred": Clearly implied by context (e.g., signature shows title)

3. GUIDELINES
   - Be factual and professional
   - Date all history entries using the email date
   - Keep entries concise but informative
   - Preserve existing notes - add to them, don't replace
   - Skip if no high-signal information found
   - Do NOT create contacts for automated/system emails (noreply@, no-reply@, mailer-daemon@, etc.)
   - Do NOT create a contact for the user's own email address (${accountEmail})

Guidelines for name parsing:
- From field format is typically "First Last <email@domain.com>"
- If only one name is present, use it as firstName and set lastName to empty string
- If no name is present (just email), use the part before @ as firstName

Current context:
- User ID: ${userId}
- Account Email: ${accountEmail}
- Email Date: ${emailDate}`;

    const userPrompt = `Analyze this email and update CRM contacts:

From: ${message.from || 'Unknown'}
To: ${message.to || 'Unknown'}
Subject: ${message.subject || '(No Subject)'}
Date: ${emailDate}

Email Body:
${emailBody || message.snippet || '(No body content)'}

INSTRUCTIONS:
1. Look up the sender contact (or create if new, skip automated emails)
2. Update basic contact info if found in signature (company, title)
3. Analyze for high-signal information to add to notes:
   - Relationship context clues
   - Goals, pains, interests mentioned
   - Key interaction details worth recording
   - Status updates on any ongoing matters
   - Communication preferences or personal details
4. Use enhanceContactNotes for each piece of valuable information found
5. Skip routine emails with no notable content`;

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
            } else if (functionName === 'enhanceContactNotes') {
              result = await this.handleEnhanceNotes(userId, args, emailDate);
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
   * Handle enhanceContactNotes tool call
   */
  private static async handleEnhanceNotes(
    userId: string,
    args: {
      contactId: string;
      section: 'relationshipSummary' | 'whatTheyCareAbout' | 'keyHistory' | 'currentStatus' | 'preferences';
      field: string;
      value: string;
      confidence: 'explicit' | 'inferred';
      source: string;
    },
    emailDate: string
  ): Promise<string> {
    console.log(`[Tool] enhanceContactNotes:`);
    console.log(`  Contact ID: ${args.contactId}`);
    console.log(`  Section: ${args.section}`);
    console.log(`  Field: ${args.field}`);
    console.log(`  Value: ${args.value}`);
    console.log(`  Confidence: ${args.confidence}`);
    console.log(`  Source: ${args.source}`);

    try {
      // Get current contact
      const contact = await ContactService.findById(args.contactId);
      if (!contact) {
        return JSON.stringify({ success: false, message: 'Contact not found' });
      }
      if (contact.userId !== userId) {
        return JSON.stringify({ success: false, message: 'Unauthorized' });
      }

      // Parse existing notes
      const existingNotes = contact.notes || '';
      const parsed = parseNotes(existingNotes);

      // Apply the update
      const update: NoteUpdate = {
        section: args.section,
        field: args.field,
        value: args.value,
        confidence: args.confidence,
        date: emailDate,
      };
      const updated = applyUpdate(parsed, update);

      // Serialize back to markdown
      const newNotes = serializeNotes(updated);

      // Update contact (this creates a version automatically)
      await ContactService.updateContact(args.contactId, userId, {
        notes: newNotes,
      });

      console.log(`[Tool] Successfully enhanced notes: ${args.section}.${args.field}`);
      return JSON.stringify({
        success: true,
        message: `Added ${args.field} to ${args.section}`,
        confidence: args.confidence,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Tool] Failed to enhance notes:`, errorMessage);
      return JSON.stringify({
        success: false,
        message: `Failed to enhance notes: ${errorMessage}`,
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
