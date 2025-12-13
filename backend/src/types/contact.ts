/**
 * Centralized contact type definitions for the backend
 * These types are used across the backend application for type safety
 */

/**
 * Email entry for a contact
 */
export interface ContactEmailDTO {
  email: string;
  label: string;
  isPrimary?: boolean;
}

/**
 * Phone entry for a contact
 */
export interface ContactPhoneDTO {
  phone: string;
  label: string;
  isPrimary?: boolean;
}

/**
 * Tag entry for a contact
 */
export interface TagDTO {
  id?: string;
  name: string;
}

/**
 * Snapshot of contact data for versioning
 */
export interface ContactSnapshot {
  firstName: string;
  lastName: string;
  company: string | null;
  title: string | null;
  notes: string | null;
  linkedInUrl: string | null;
  birthday: string | null;
  emails: Array<{ email: string; label: string; isPrimary: boolean }>;
  phones: Array<{ phone: string; label: string; isPrimary: boolean }>;
  tags: string[];  // Array of tag names
}

/**
 * Object describing what changed between versions
 */
export interface ContactChanges {
  [fieldName: string]: {
    from: unknown;
    to: unknown;
  };
}

/**
 * DTO for creating a new contact
 */
export interface CreateContactDTO {
  firstName: string;
  lastName: string;
  company?: string;
  title?: string;
  notes?: string;
  linkedInUrl?: string;
  birthday?: string;
  emails?: ContactEmailDTO[];
  phones?: ContactPhoneDTO[];
  tags?: string[];  // Array of tag names
}

/**
 * DTO for updating an existing contact
 */
export interface UpdateContactDTO {
  firstName?: string;
  lastName?: string;
  company?: string | null;
  title?: string | null;
  notes?: string | null;
  linkedInUrl?: string | null;
  birthday?: string | null;
  emails?: ContactEmailDTO[];
  phones?: ContactPhoneDTO[];
  tags?: string[];  // Array of tag names
}

/**
 * Parameters for listing contacts
 */
export interface ContactListParams {
  skip?: number;
  take?: number;
  search?: string;
  sortBy?: 'firstName' | 'lastName' | 'company' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Common email labels
 */
export const EMAIL_LABELS = ['work', 'personal', 'other'] as const;
export type EmailLabel = typeof EMAIL_LABELS[number];

/**
 * Common phone labels
 */
export const PHONE_LABELS = ['mobile', 'work', 'home', 'other'] as const;
export type PhoneLabel = typeof PHONE_LABELS[number];

/**
 * DTO for merging two contacts
 * The primary contact is kept, the secondary contact is merged into it and deleted
 */
export interface MergeContactsDTO {
  primaryContactId: string;
  secondaryContactId: string;
  /**
   * Field resolution strategy - which contact's value to use for each field
   * If not specified, primary contact's value is used (unless empty, then secondary's)
   */
  fieldResolution?: {
    firstName?: 'primary' | 'secondary';
    lastName?: 'primary' | 'secondary';
    company?: 'primary' | 'secondary';
    title?: 'primary' | 'secondary';
    notes?: 'primary' | 'secondary' | 'merge';  // 'merge' concatenates both notes
    linkedInUrl?: 'primary' | 'secondary';
    birthday?: 'primary' | 'secondary';
  };
  /**
   * Whether to merge emails from both contacts (default: true)
   */
  mergeEmails?: boolean;
  /**
   * Whether to merge phones from both contacts (default: true)
   */
  mergePhones?: boolean;
  /**
   * Whether to merge tags from both contacts (default: true)
   */
  mergeTags?: boolean;
}

/**
 * Result of a contact merge operation
 */
export interface MergeContactsResult {
  mergedContact: {
    id: string;
    firstName: string;
    lastName: string;
  };
  deletedContactId: string;
  fieldsFromPrimary: string[];
  fieldsFromSecondary: string[];
  emailsMerged: number;
  phonesMerged: number;
  tagsMerged: number;
}