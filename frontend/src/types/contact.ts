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

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  title: string | null;
  notes: string | null;
  linkedInUrl: string | null;
  emails: ContactEmail[];
  phones: ContactPhone[];
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
  emails: Array<{ email: string; label: string; isPrimary: boolean }>;
  phones: Array<{ phone: string; label: string; isPrimary: boolean }>;
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
  emails?: Array<{ email: string; label: string; isPrimary?: boolean }>;
  phones?: Array<{ phone: string; label: string; isPrimary?: boolean }>;
}

export type UpdateContactDTO = Partial<CreateContactDTO>;

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