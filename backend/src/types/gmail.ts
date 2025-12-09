/**
 * Gmail Integration Type Definitions
 */

// Gmail Account DTOs
export interface CreateGmailAccountDTO {
  email: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  isPrimary?: boolean;
}

export interface UpdateGmailAccountDTO {
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  historyId?: string;
  isActive?: boolean;
  lastSyncAt?: Date;
}

// Gmail Watch DTOs
export interface CreateGmailWatchDTO {
  gmailAccountId: string;
  resourceId: string;
  expiration: Date;
}

// Gmail Message Types (from Gmail API)
export interface GmailMessageHeader {
  name: string;
  value: string;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  from?: string;
  to?: string;
  subject?: string;
  date?: string;
  body?: string; // Plain text email body for agent analysis
}

export interface GmailHistoryItem {
  id: string;
  messages?: Array<{ id: string; threadId: string }>;
  messagesAdded?: Array<{
    message: { id: string; threadId: string; labelIds: string[] };
  }>;
  messagesDeleted?: Array<{
    message: { id: string; threadId: string; labelIds: string[] };
  }>;
  labelsAdded?: Array<{
    message: { id: string; threadId: string; labelIds: string[] };
    labelIds: string[];
  }>;
  labelsRemoved?: Array<{
    message: { id: string; threadId: string; labelIds: string[] };
    labelIds: string[];
  }>;
}

export interface GmailHistoryResponse {
  history?: GmailHistoryItem[];
  historyId: string;
  nextPageToken?: string;
}

// Pub/Sub Notification Types
export interface GmailPubSubNotification {
  emailAddress: string;
  historyId: string;
}

export interface PubSubMessage {
  message: {
    data: string; // Base64 encoded JSON
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

// Gmail Watch Response (from Gmail API)
export interface GmailWatchResponse {
  historyId: string;
  expiration: string; // Unix timestamp in milliseconds as string
}

// OAuth Token Types
export interface GmailTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

// Gmail Account List Response
export interface GmailAccountListResponse {
  accounts: GmailAccountResponse[];
}

export interface GmailAccountResponse {
  id: string;
  email: string;
  isPrimary: boolean;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
}

// Gmail Scopes
// Note: gmail.readonly provides full read access to messages including body content
// This is required for the email analysis agent to extract contact information from signatures
export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
] as const;

// Gmail Labels
export const GMAIL_LABELS = {
  INBOX: 'INBOX',
  SENT: 'SENT',
  DRAFT: 'DRAFT',
  SPAM: 'SPAM',
  TRASH: 'TRASH',
  UNREAD: 'UNREAD',
  STARRED: 'STARRED',
  IMPORTANT: 'IMPORTANT',
} as const;

export type GmailLabel = typeof GMAIL_LABELS[keyof typeof GMAIL_LABELS];
