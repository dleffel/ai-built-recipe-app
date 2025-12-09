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
      name: 'updateContactField',
      description: 'Update a specific field on a contact record. Use this to update information discovered in the email.',
      parameters: {
        type: 'object',
        properties: {
          contactId: {
            type: 'string',
            description: 'The ID of the contact to update',
          },
          field: {
            type: 'string',
            enum: ['firstName', 'lastName', 'company', 'title', 'notes'],
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
4. Update the contact record with any new information you discover

Only update fields if you find clear, reliable information in the email signature or body. Do not guess or make assumptions.
Always explain your reasoning when making updates.

Important guidelines:
- Extract email addresses from format like "John Doe <john@example.com>"
- Look for signature blocks at the end of emails for contact info
- Company names often appear after job titles in signatures
- Phone numbers may be formatted in various ways

Current user context:
- User ID: ${userId}
- Account Email: ${accountEmail}`;

    const userPrompt = `Analyze this email and update the CRM contact if needed:

From: ${message.from || 'Unknown'}
To: ${message.to || 'Unknown'}
Subject: ${message.subject || '(No Subject)'}
Date: ${message.date || 'Unknown'}

Email Body:
${emailBody || message.snippet || '(No body content)'}

First, extract the sender's email address and look up the contact. Then analyze the email for any contact information updates.`;

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
          const args = JSON.parse(toolCall.function.arguments);

          console.log(`[Tool] Calling ${functionName} with:`, args);

          let result: string;
          try {
            if (functionName === 'lookupContactByEmail') {
              result = await this.handleLookupContact(userId, args.email);
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
    return JSON.stringify({ found: false, contact: null });
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
