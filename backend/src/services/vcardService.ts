import { BaseService } from './BaseService';
import { ContactService, ContactWithRelations } from './contactService';
import { CreateContactDTO } from '../types/contact';

/**
 * Parsed contact from vCard
 */
export interface ParsedVCard {
  firstName: string;
  lastName: string;
  company?: string;
  title?: string;
  notes?: string;
  birthday?: string;
  linkedInUrl?: string;
  emails: Array<{ email: string; label: string; isPrimary: boolean }>;
  phones: Array<{ phone: string; label: string; isPrimary: boolean }>;
}

/**
 * Result of import operation
 */
export interface ImportResult {
  created: number;
  skipped: number;
  errors: number;
  duplicates: Array<{
    imported: ParsedVCard;
    existingId: string;
    existingName: string;
  }>;
}

/**
 * Preview result before importing
 */
export interface ImportPreview {
  contacts: ParsedVCard[];
  duplicates: Array<{
    contact: ParsedVCard;
    existingId: string;
    existingName: string;
  }>;
  total: number;
  newCount: number;
  duplicateCount: number;
}

/**
 * Service for parsing vCard files and importing contacts
 */
export class VCardService extends BaseService {
  /**
   * Parse a vCard file content into structured contacts
   */
  static parseVCardFile(content: string): ParsedVCard[] {
    const contacts: ParsedVCard[] = [];
    
    // Normalize line endings and handle folded lines (lines starting with space are continuations)
    const normalizedContent = content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n[ \t]/g, ''); // Unfold folded lines
    
    // Split into individual vCards
    const vCardBlocks = normalizedContent.split(/(?=BEGIN:VCARD)/i);
    
    for (const block of vCardBlocks) {
      const trimmedBlock = block.trim();
      if (!trimmedBlock.toUpperCase().startsWith('BEGIN:VCARD')) {
        continue;
      }
      
      try {
        const contact = this.parseVCard(trimmedBlock);
        if (contact && (contact.firstName || contact.lastName)) {
          contacts.push(contact);
        }
      } catch (error) {
        console.error('Failed to parse vCard block:', error);
        // Continue with other contacts
      }
    }
    
    return contacts;
  }

  /**
   * Parse a single vCard block
   */
  private static parseVCard(vCardText: string): ParsedVCard | null {
    const lines = vCardText.split('\n');
    
    const contact: ParsedVCard = {
      firstName: '',
      lastName: '',
      emails: [],
      phones: [],
    };
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.toUpperCase() === 'BEGIN:VCARD' || trimmedLine.toUpperCase() === 'END:VCARD') {
        continue;
      }
      
      // Parse property name and value
      const colonIndex = trimmedLine.indexOf(':');
      if (colonIndex === -1) continue;
      
      const propertyPart = trimmedLine.substring(0, colonIndex);
      const valuePart = trimmedLine.substring(colonIndex + 1);
      
      // Extract property name and parameters
      const [propertyName, ...params] = propertyPart.split(';');
      const upperPropertyName = propertyName.toUpperCase();
      
      // Parse parameters into object, collecting all TYPE values
      // vCard can have multiple TYPE parameters like TEL;TYPE=CELL;TYPE=PREF
      // or comma-separated like TEL;TYPE=CELL,PREF
      const parameters: Record<string, string> = {};
      const typeValues: string[] = [];
      
      for (const param of params) {
        const [key, value] = param.split('=');
        if (key && value) {
          const upperKey = key.toUpperCase();
          const upperValue = value.toUpperCase();
          
          if (upperKey === 'TYPE') {
            // Handle comma-separated TYPE values (e.g., TYPE=CELL,PREF)
            const types = upperValue.split(',').map(t => t.trim());
            typeValues.push(...types);
          } else {
            parameters[upperKey] = upperValue;
          }
        } else if (key) {
          // Handle implicit TYPE format (e.g., TEL;CELL;PREF)
          typeValues.push(key.toUpperCase());
        }
      }
      
      // Join all TYPE values into a single string for easy checking
      if (typeValues.length > 0) {
        parameters['TYPE'] = typeValues.join(',');
      }
      
      // Unescape vCard values
      const value = this.unescapeVCardValue(valuePart);
      
      switch (upperPropertyName) {
        case 'N':
          // N:LastName;FirstName;MiddleName;Prefix;Suffix
          const nameParts = value.split(';');
          contact.lastName = nameParts[0] || '';
          contact.firstName = nameParts[1] || '';
          break;
          
        case 'FN':
          // Full name - use as fallback if N is not present
          if (!contact.firstName && !contact.lastName) {
            const fnParts = value.trim().split(/\s+/);
            if (fnParts.length >= 2) {
              contact.firstName = fnParts[0];
              contact.lastName = fnParts.slice(1).join(' ');
            } else {
              contact.firstName = value.trim();
            }
          }
          break;
          
        case 'ORG':
          contact.company = value.split(';')[0]; // Take first part of org
          break;
          
        case 'TITLE':
          contact.title = value;
          break;
          
        case 'NOTE':
          contact.notes = value;
          break;
          
        case 'BDAY':
          // Handle various birthday formats
          contact.birthday = this.parseBirthday(value);
          break;
          
        case 'TEL':
          const phoneLabel = this.mapPhoneLabel(parameters['TYPE'] || '');
          const isPrimaryPhone = (parameters['TYPE'] || '').includes('PREF');
          contact.phones.push({
            phone: value,
            label: phoneLabel,
            isPrimary: isPrimaryPhone,
          });
          break;
          
        case 'EMAIL':
          const emailLabel = this.mapEmailLabel(parameters['TYPE'] || '');
          const isPrimaryEmail = (parameters['TYPE'] || '').includes('PREF');
          contact.emails.push({
            email: value,
            label: emailLabel,
            isPrimary: isPrimaryEmail,
          });
          break;
          
        case 'URL':
          // Check if it's a LinkedIn URL
          if (value.toLowerCase().includes('linkedin.com')) {
            contact.linkedInUrl = value;
          }
          break;
      }
    }
    
    // Ensure at least one primary email/phone if there are any
    if (contact.emails.length > 0 && !contact.emails.some(e => e.isPrimary)) {
      contact.emails[0].isPrimary = true;
    }
    if (contact.phones.length > 0 && !contact.phones.some(p => p.isPrimary)) {
      contact.phones[0].isPrimary = true;
    }
    
    return contact;
  }

  /**
   * Unescape vCard special characters
   */
  private static unescapeVCardValue(value: string): string {
    return value
      .replace(/\\n/gi, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\');
  }

  /**
   * Parse birthday from various formats
   */
  private static parseBirthday(value: string): string | undefined {
    // Handle formats: YYYY-MM-DD, YYYYMMDD, --MM-DD (year unknown)
    const cleanValue = value.replace(/[^\d-]/g, '');
    
    // YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanValue)) {
      return cleanValue;
    }
    
    // YYYYMMDD format
    if (/^\d{8}$/.test(cleanValue)) {
      return `${cleanValue.slice(0, 4)}-${cleanValue.slice(4, 6)}-${cleanValue.slice(6, 8)}`;
    }
    
    // --MM-DD format (no year)
    if (/^--?\d{2}-?\d{2}$/.test(cleanValue)) {
      const monthDay = cleanValue.replace(/^-+/, '').replace(/-/g, '');
      // Use year 1900 as placeholder for unknown year
      return `1900-${monthDay.slice(0, 2)}-${monthDay.slice(2, 4)}`;
    }
    
    return undefined;
  }

  /**
   * Map vCard phone TYPE to CRM label
   */
  private static mapPhoneLabel(type: string): string {
    const upperType = type.toUpperCase();
    
    if (upperType.includes('CELL') || upperType.includes('MOBILE')) {
      return 'mobile';
    }
    if (upperType.includes('WORK')) {
      return 'work';
    }
    if (upperType.includes('HOME')) {
      return 'home';
    }
    return 'other';
  }

  /**
   * Map vCard email TYPE to CRM label
   */
  private static mapEmailLabel(type: string): string {
    const upperType = type.toUpperCase();
    
    if (upperType.includes('WORK')) {
      return 'work';
    }
    if (upperType.includes('HOME') || upperType.includes('PERSONAL')) {
      return 'personal';
    }
    return 'other';
  }

  /**
   * Preview import - check for duplicates without actually importing
   */
  static async previewImport(userId: string, contacts: ParsedVCard[]): Promise<ImportPreview> {
    const duplicates: ImportPreview['duplicates'] = [];
    const newContacts: ParsedVCard[] = [];
    
    for (const contact of contacts) {
      const existing = await this.findDuplicate(userId, contact);
      if (existing) {
        duplicates.push({
          contact,
          existingId: existing.id,
          existingName: `${existing.firstName} ${existing.lastName}`.trim(),
        });
      } else {
        newContacts.push(contact);
      }
    }
    
    return {
      contacts,
      duplicates,
      total: contacts.length,
      newCount: newContacts.length,
      duplicateCount: duplicates.length,
    };
  }

  /**
   * Import contacts into CRM
   */
  static async importContacts(
    userId: string,
    contacts: ParsedVCard[],
    options: { skipDuplicates: boolean } = { skipDuplicates: true }
  ): Promise<ImportResult> {
    const result: ImportResult = {
      created: 0,
      skipped: 0,
      errors: 0,
      duplicates: [],
    };
    
    for (const contact of contacts) {
      try {
        // Check for duplicates
        const existing = await this.findDuplicate(userId, contact);
        
        if (existing) {
          result.duplicates.push({
            imported: contact,
            existingId: existing.id,
            existingName: `${existing.firstName} ${existing.lastName}`.trim(),
          });
          
          if (options.skipDuplicates) {
            result.skipped++;
            continue;
          }
        }
        
        // Create the contact
        const createDTO: CreateContactDTO = {
          firstName: contact.firstName || 'Unknown',
          lastName: contact.lastName || '',
          company: contact.company,
          title: contact.title,
          notes: contact.notes,
          birthday: contact.birthday,
          linkedInUrl: contact.linkedInUrl,
          emails: contact.emails,
          phones: contact.phones,
        };
        
        await ContactService.createContact(userId, createDTO);
        result.created++;
      } catch (error) {
        console.error('Failed to import contact:', contact, error);
        result.errors++;
      }
    }
    
    return result;
  }

  /**
   * Find a duplicate contact by email match
   */
  private static async findDuplicate(
    userId: string,
    contact: ParsedVCard
  ): Promise<ContactWithRelations | null> {
    // Check by email addresses first (most reliable)
    for (const email of contact.emails) {
      const existing = await ContactService.findByEmailAddress(userId, email.email);
      if (existing) {
        return existing;
      }
    }
    
    // Check by exact name + phone match as secondary check
    if (contact.firstName && contact.lastName && contact.phones.length > 0) {
      const potentialMatches = await this.prisma.contact.findMany({
        where: {
          userId,
          isDeleted: false,
          firstName: {
            equals: contact.firstName,
            mode: 'insensitive',
          },
          lastName: {
            equals: contact.lastName,
            mode: 'insensitive',
          },
        },
        include: {
          emails: true,
          phones: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });
      
      // Check if any phone numbers match
      for (const match of potentialMatches) {
        const matchPhones = match.phones.map(p => this.normalizePhone(p.phone));
        const contactPhones = contact.phones.map(p => this.normalizePhone(p.phone));
        
        if (matchPhones.some(mp => contactPhones.includes(mp))) {
          return match;
        }
      }
    }
    
    return null;
  }

  /**
   * Normalize phone number for comparison
   */
  private static normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '').slice(-10); // Last 10 digits
  }
}
