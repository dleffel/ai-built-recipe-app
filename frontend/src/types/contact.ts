/**
 * Contact type definitions for the frontend
 */

export interface ContactEmail {
  id: string;
  email: string;
  label: string;
  isPrimary: boolean;
}

export interface ContactPhone {
  id: string;
  phone: string;
  label: string;
  isPrimary: boolean;
}

export interface ContactTag {
  id: string;
  tag: {
    id: string;
    name: string;
  };
}

export interface Tag {
  id: string;
  name: string;
  createdAt: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  title: string | null;
  notes: string | null;
  linkedInUrl: string | null;
  birthday: string | null;
  emails: ContactEmail[];
  phones: ContactPhone[];
  tags: ContactTag[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

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
  tags: string[];
}

export interface ContactChanges {
  [fieldName: string]: {
    from: unknown;
    to: unknown;
  };
}

export interface ContactVersion {
  id: string;
  version: number;
  snapshot: ContactSnapshot;
  changes: ContactChanges;
  createdAt: string;
}

export interface CreateContactDTO {
  firstName: string;
  lastName: string;
  company?: string;
  title?: string;
  notes?: string;
  linkedInUrl?: string;
  birthday?: string;
  emails?: Array<{ email: string; label: string; isPrimary?: boolean }>;
  phones?: Array<{ phone: string; label: string; isPrimary?: boolean }>;
  tags?: string[];
}

export interface UpdateContactDTO {
  firstName?: string;
  lastName?: string;
  company?: string | null;
  title?: string | null;
  notes?: string | null;
  linkedInUrl?: string | null;
  birthday?: string | null;
  emails?: Array<{ email: string; label: string; isPrimary?: boolean }>;
  phones?: Array<{ phone: string; label: string; isPrimary?: boolean }>;
  tags?: string[];
}

export interface TagListResponse {
  tags: Tag[];
}

export interface ContactListParams {
  skip?: number;
  take?: number;
  search?: string;
  sortBy?: 'firstName' | 'lastName' | 'company' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ContactListResponse {
  contacts: Contact[];
  pagination: {
    total: number;
    skip: number;
    take: number;
  };
}

// Common labels for emails and phones
export const EMAIL_LABELS = ['work', 'personal', 'other'] as const;
export const PHONE_LABELS = ['mobile', 'work', 'home', 'other'] as const;

export type EmailLabel = typeof EMAIL_LABELS[number];
export type PhoneLabel = typeof PHONE_LABELS[number];

// vCard Import Types
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

// Contact Merge Types
export interface MergeContactsDTO {
  primaryContactId: string;
  secondaryContactId: string;
  fieldResolution?: {
    firstName?: 'primary' | 'secondary';
    lastName?: 'primary' | 'secondary';
    company?: 'primary' | 'secondary';
    title?: 'primary' | 'secondary';
    notes?: 'primary' | 'secondary' | 'merge';
    linkedInUrl?: 'primary' | 'secondary';
    birthday?: 'primary' | 'secondary';
  };
  mergeEmails?: boolean;
  mergePhones?: boolean;
  mergeTags?: boolean;
}

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

export type FieldResolutionKey = 'firstName' | 'lastName' | 'company' | 'title' | 'notes' | 'linkedInUrl' | 'birthday';
export type FieldResolutionValue = 'primary' | 'secondary' | 'merge';