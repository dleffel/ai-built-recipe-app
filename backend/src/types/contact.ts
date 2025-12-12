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