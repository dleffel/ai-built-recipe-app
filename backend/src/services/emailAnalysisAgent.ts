import OpenAI from 'openai';
import { ContactService, ContactWithRelations } from './contactService';
import { GmailMessage } from '../types/gmail';

// Structured notes template - the format we want notes to evolve into
const STRUCTURED_NOTES_TEMPLATE = `RELATIONSHIP SUMMARY
- Role in our world:
- How we met / intro:
- Relationship owner:

WHAT THEY CARE ABOUT
- Goals / KPIs:
- Main pains:
- Hot buttons / themes:

KEY HISTORY

CURRENT STATUS
- Where things stand:
- Deal / project risks:
- Next step + timing:

PREFERENCES / NOTES
- Comms:
- Personal rapport:
- Landmines:`;

// Section names for the structured notes
type NotesSection = 
  | 'RELATIONSHIP SUMMARY'
  | 'WHAT THEY CARE ABOUT'
  | 'KEY HISTORY'
  | 'CURRENT STATUS'
  | 'PREFERENCES / NOTES';

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
      description: 'Update a specific field on a contact record. Use this to update basic contact information (name, company, title, birthday) discovered in the email. Only use when there is HIGH CONFIDENCE evidence in the email (explicit mentions, clear signature blocks, or direct statements). Do not guess or infer information.',
      parameters: {
        type: 'object',
        properties: {
          contactId: {
            type: 'string',
            description: 'The ID of the contact to update',
          },
          field: {
            type: 'string',
            enum: ['firstName', 'lastName', 'company', 'title', 'birthday'],
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
  {
    type: 'function',
    function: {
      name: 'updateNotesSection',
      description: `Update a specific section or field in the contact's structured notes. The notes follow a structured format with sections like RELATIONSHIP SUMMARY, WHAT THEY CARE ABOUT, KEY HISTORY, CURRENT STATUS, and PREFERENCES / NOTES.

Use this to record insights about the contact that would be useful for future interactions. Each section has specific fields:

RELATIONSHIP SUMMARY:
- "Role in our world": Their role relative to us (prospect, customer, partner, vendor, etc.)
- "How we met / intro": How the relationship started
- "Relationship owner": Who on our team owns this relationship

WHAT THEY CARE ABOUT:
- "Goals / KPIs": What they're trying to achieve
- "Main pains": Their challenges and frustrations
- "Hot buttons / themes": Topics that resonate with them

KEY HISTORY:
- Use this for chronological entries about significant interactions (format: "YYYY-MM-DD - Event description")

CURRENT STATUS:
- "Where things stand": Current state of the relationship/deal
- "Deal / project risks": Potential blockers or concerns
- "Next step + timing": What's next and when

PREFERENCES / NOTES:
- "Comms": Communication preferences (email vs phone, time zones, etc.)
- "Personal rapport": Personal details for building relationship
- "Landmines": Things to avoid, past negative experiences`,
      parameters: {
        type: 'object',
        properties: {
          contactId: {
            type: 'string',
            description: 'The ID of the contact to update',
          },
          section: {
            type: 'string',
            enum: ['RELATIONSHIP SUMMARY', 'WHAT THEY CARE ABOUT', 'KEY HISTORY', 'CURRENT STATUS', 'PREFERENCES / NOTES'],
            description: 'The section of the notes to update',
          },
          field: {
            type: 'string',
            description: 'The specific field within the section to update (e.g., "Role in our world", "Goals / KPIs"). For KEY HISTORY, leave this empty and use the value for the chronological entry.',
          },
          value: {
            type: 'string',
            description: 'The value to set or append. For KEY HISTORY, include the date prefix (e.g., "2025-03-10 - First call, interested in X").',
          },
          append: {
            type: 'boolean',
            description: 'If true, append to existing value instead of replacing. Default is false for fields, true for KEY HISTORY entries.',
          },
        },
        required: ['contactId', 'section', 'value'],
      },
    },
  },
];

/**
 * Helper functions for structured notes management
 */
class StructuredNotesHelper {
  /**
   * Parse structured notes into sections
   */
  static parseSections(notes: string): Map<string, string> {
    const sections = new Map<string, string>();
    if (!notes) return sections;

    const sectionHeaders = [
      'RELATIONSHIP SUMMARY',
      'WHAT THEY CARE ABOUT',
      'KEY HISTORY',
      'CURRENT STATUS',
      'PREFERENCES / NOTES',
    ];

    let currentSection = '';
    let currentContent: string[] = [];

    const lines = notes.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (sectionHeaders.includes(trimmedLine)) {
        // Save previous section
        if (currentSection) {
          sections.set(currentSection, currentContent.join('\n').trim());
        }
        currentSection = trimmedLine;
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentSection) {
      sections.set(currentSection, currentContent.join('\n').trim());
    }

    return sections;
  }

  /**
   * Update a specific field within a section
   */
  static updateSectionField(
    sectionContent: string,
    field: string,
    value: string,
    append: boolean = false
  ): string {
    const lines = sectionContent.split('\n');
    const fieldPrefix = `- ${field}:`;
    let fieldFound = false;
    
    const updatedLines = lines.map(line => {
      if (line.trim().startsWith(fieldPrefix)) {
        fieldFound = true;
        const existingValue = line.substring(line.indexOf(':') + 1).trim();
        if (append && existingValue) {
          return `- ${field}: ${existingValue}; ${value}`;
        }
        return `- ${field}: ${value}`;
      }
      return line;
    });

    // If field wasn't found, add it
    if (!fieldFound) {
      updatedLines.push(`- ${field}: ${value}`);
    }

    return updatedLines.join('\n');
  }

  /**
   * Add an entry to KEY HISTORY section
   */
  static addHistoryEntry(sectionContent: string, entry: string): string {
    const lines = sectionContent.split('\n').filter(l => l.trim());
    lines.push(`- ${entry}`);
    return lines.join('\n');
  }

  /**
   * Rebuild the full notes from sections
   */
  static rebuildNotes(sections: Map<string, string>): string {
    const sectionOrder = [
      'RELATIONSHIP SUMMARY',
      'WHAT THEY CARE ABOUT',
      'KEY HISTORY',
      'CURRENT STATUS',
      'PREFERENCES / NOTES',
    ];

    const parts: string[] = [];
    for (const section of sectionOrder) {
      const content = sections.get(section) || this.getDefaultSectionContent(section);
      parts.push(`${section}\n${content}`);
    }

    return parts.join('\n\n');
  }

  /**
   * Get default content for a section
   */
  static getDefaultSectionContent(section: string): string {
    switch (section) {
      case 'RELATIONSHIP SUMMARY':
        return '- Role in our world:\n- How we met / intro:\n- Relationship owner:';
      case 'WHAT THEY CARE ABOUT':
        return '- Goals / KPIs:\n- Main pains:\n- Hot buttons / themes:';
      case 'KEY HISTORY':
        return '';
      case 'CURRENT STATUS':
        return '- Where things stand:\n- Deal / project risks:\n- Next step + timing:';
      case 'PREFERENCES / NOTES':
        return '- Comms:\n- Personal rapport:\n- Landmines:';
      default:
        return '';
    }
  }

  /**
   * Initialize notes with the structured template
   */
  static initializeStructuredNotes(): string {
    return STRUCTURED_NOTES_TEMPLATE;
  }

  /**
   * Check if notes are already in structured format
   */
  static isStructuredFormat(notes: string): boolean {
    if (!notes) return false;
    return notes.includes('RELATIONSHIP SUMMARY') || 
           notes.includes('KEY HISTORY') || 
           notes.includes('CURRENT STATUS');
  }

  /**
   * Migrate unstructured notes to structured format
   * Preserves existing content in the KEY HISTORY section
   */
  static migrateToStructuredFormat(existingNotes: string): string {
    if (!existingNotes || this.isStructuredFormat(existingNotes)) {
      return existingNotes || this.initializeStructuredNotes();
    }

    // Put existing unstructured notes into KEY HISTORY
    const sections = new Map<string, string>();
    sections.set('RELATIONSHIP SUMMARY', this.getDefaultSectionContent('RELATIONSHIP SUMMARY'));
    sections.set('WHAT THEY CARE ABOUT', this.getDefaultSectionContent('WHAT THEY CARE ABOUT'));
    
    // Add existing notes as legacy content in KEY HISTORY
    const historyContent = `[Legacy notes migrated]\n${existingNotes}`;
    sections.set('KEY HISTORY', historyContent);
    
    sections.set('CURRENT STATUS', this.getDefaultSectionContent('CURRENT STATUS'));
    sections.set('PREFERENCES / NOTES', this.getDefaultSectionContent('PREFERENCES / NOTES'));

    return this.rebuildNotes(sections);
  }
}

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
   - Update basic fields (name, company, title, birthday) from signatures

2. MAINTAIN STRUCTURED NOTES
   The contact notes follow a structured format that you should evolve over time. The format has these sections:

   RELATIONSHIP SUMMARY
   - Role in our world: Their role relative to us (prospect, customer, partner, etc.)
   - How we met / intro: How the relationship started
   - Relationship owner: Who on our team owns this relationship

   WHAT THEY CARE ABOUT
   - Goals / KPIs: What they're trying to achieve
   - Main pains: Their challenges and frustrations
   - Hot buttons / themes: Topics that resonate with them

   KEY HISTORY
   - Chronological entries of significant interactions (format: YYYY-MM-DD - Event description)
   - Examples: "2025-03-10 - First call, interested in X, skeptical about Y"
   - Only record SIGNIFICANT events, not every email

   CURRENT STATUS
   - Where things stand: Current state of the relationship/deal
   - Deal / project risks: Potential blockers or concerns
   - Next step + timing: What's next and when

   PREFERENCES / NOTES
   - Comms: Communication preferences (email vs phone, time zones, etc.)
   - Personal rapport: Personal details for building relationship (hobbies, family, etc.)
   - Landmines: Things to avoid, past negative experiences

3. WHAT TO RECORD
   Focus on INSIGHTS about the contact that would help future interactions:
   - Their preferences, values, and decision-making style
   - Their goals, pain points, and what motivates them
   - Significant milestones in the relationship
   - Communication preferences and personal details
   - Risks and things to avoid

   DO NOT record:
   - Routine email exchanges with no new information
   - Every single interaction (only significant ones in KEY HISTORY)
   - Summaries of what emails discussed (unless it reveals something about the person)

4. GUIDELINES
   - Be factual and professional
   - Keep entries concise but informative
   - Use updateNotesSection to update specific fields or add history entries
   - Skip updates entirely if no genuine insights found (most emails won't have any!)
   - Do NOT create contacts for automated/system emails (noreply@, no-reply@, mailer-daemon@, etc.)
   - Do NOT create a contact for the user's own email address (${accountEmail})

Guidelines for name parsing:
- From field format is typically "First Last <email@domain.com>"
- If only one name is present, use it as firstName and set lastName to empty string
- If no name is present (just email), use the part before @ as firstName

HIGH CONFIDENCE REQUIREMENT FOR ALL UPDATES:
Only update contact fields when there is EXPLICIT, HIGH-CONFIDENCE evidence in the email.
Do not guess, infer, or make assumptions about contact information.

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
3. Review the contact's existing notes and update relevant sections if you discover:
   - New information about their role, goals, or pain points
   - Significant events worth recording in KEY HISTORY
   - Communication preferences or personal details
   - Current status changes or next steps
4. Most emails will have NO insights worth recording - that's fine, skip updateNotesSection`;

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
            } else if (functionName === 'updateNotesSection') {
              result = await this.handleUpdateNotesSection(userId, args);
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

      // Initialize with structured notes template
      const initialNotes = StructuredNotesHelper.initializeStructuredNotes();

      const contact = await ContactService.createContact(userId, {
        firstName: args.firstName,
        lastName: args.lastName,
        company: args.company,
        title: args.title,
        notes: initialNotes,
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
          
          // Ensure notes are in structured format
          let notes = contact.notes || '';
          if (!StructuredNotesHelper.isStructuredFormat(notes)) {
            notes = StructuredNotesHelper.migrateToStructuredFormat(notes);
          }
          
          // Add birthday discovery to KEY HISTORY
          const sections = StructuredNotesHelper.parseSections(notes);
          const historyContent = sections.get('KEY HISTORY') || '';
          const newHistoryEntry = `${timestamp} - Birthday discovered: ${args.value} (${args.reason})`;
          sections.set('KEY HISTORY', StructuredNotesHelper.addHistoryEntry(historyContent, newHistoryEntry));
          const updatedNotes = StructuredNotesHelper.rebuildNotes(sections);
          
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
   * Handle updateNotesSection tool call - update structured notes sections
   */
  private static async handleUpdateNotesSection(
    userId: string,
    args: {
      contactId: string;
      section: NotesSection;
      field?: string;
      value: string;
      append?: boolean;
    }
  ): Promise<string> {
    console.log(`[Tool] updateNotesSection:`);
    console.log(`  Contact ID: ${args.contactId}`);
    console.log(`  Section: ${args.section}`);
    console.log(`  Field: ${args.field || '(none)'}`);
    console.log(`  Value: ${args.value}`);
    console.log(`  Append: ${args.append ?? 'default'}`);

    try {
      // Get current contact
      const contact = await ContactService.findById(args.contactId);
      if (!contact) {
        return JSON.stringify({ success: false, message: 'Contact not found' });
      }
      if (contact.userId !== userId) {
        return JSON.stringify({ success: false, message: 'Unauthorized' });
      }

      // Ensure notes are in structured format
      let notes = contact.notes || '';
      if (!StructuredNotesHelper.isStructuredFormat(notes)) {
        notes = StructuredNotesHelper.migrateToStructuredFormat(notes);
      }

      // Parse sections
      const sections = StructuredNotesHelper.parseSections(notes);

      // Get current section content
      let sectionContent = sections.get(args.section) || 
        StructuredNotesHelper.getDefaultSectionContent(args.section);

      // Update based on section type
      if (args.section === 'KEY HISTORY') {
        // For KEY HISTORY, always append entries
        sectionContent = StructuredNotesHelper.addHistoryEntry(sectionContent, args.value);
      } else if (args.field) {
        // For other sections with a field, update the specific field
        const shouldAppend = args.append ?? false;
        sectionContent = StructuredNotesHelper.updateSectionField(
          sectionContent,
          args.field,
          args.value,
          shouldAppend
        );
      } else {
        // No field specified for non-history section - append as a new line
        sectionContent = sectionContent ? `${sectionContent}\n- ${args.value}` : `- ${args.value}`;
      }

      // Update the section
      sections.set(args.section, sectionContent);

      // Rebuild notes
      const updatedNotes = StructuredNotesHelper.rebuildNotes(sections);

      // Update contact
      await ContactService.updateContact(args.contactId, userId, {
        notes: updatedNotes,
      });

      console.log(`[Tool] Successfully updated notes section: ${args.section}`);
      return JSON.stringify({
        success: true,
        message: `Updated ${args.section}${args.field ? ` - ${args.field}` : ''}`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Tool] Failed to update notes section:`, errorMessage);
      return JSON.stringify({
        success: false,
        message: `Failed to update notes: ${errorMessage}`,
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

// Export the helper for testing purposes
export { StructuredNotesHelper };
