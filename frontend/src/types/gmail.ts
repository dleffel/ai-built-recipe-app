/**
 * Gmail Integration Type Definitions for Frontend
 */

export interface GmailAccount {
  id: string;
  email: string;
  isPrimary: boolean;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
}

export interface GmailAccountListResponse {
  accounts: GmailAccount[];
}

export interface ConnectGmailResponse {
  authUrl: string;
}