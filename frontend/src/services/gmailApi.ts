import api from './api';
import { GmailAccount, GmailAccountListResponse, ConnectGmailResponse } from '../types/gmail';

/**
 * Gmail API Service
 * Handles all Gmail-related API calls
 * Uses the shared axios instance which includes auth token interceptor
 */

/**
 * Get all connected Gmail accounts for the current user
 */
export async function getGmailAccounts(): Promise<GmailAccount[]> {
  const response = await api.get<GmailAccountListResponse>('/api/gmail/accounts');
  return response.data.accounts;
}

/**
 * Initiate OAuth flow to connect a new Gmail account
 * Returns the authorization URL to redirect the user to
 */
export async function connectGmailAccount(): Promise<string> {
  const response = await api.post<ConnectGmailResponse>('/api/gmail/accounts/connect');
  return response.data.authUrl;
}

/**
 * Activate monitoring for a Gmail account
 */
export async function activateGmailAccount(accountId: string): Promise<GmailAccount> {
  const response = await api.post<GmailAccount>(`/api/gmail/accounts/${accountId}/activate`);
  return response.data;
}

/**
 * Deactivate monitoring for a Gmail account
 */
export async function deactivateGmailAccount(accountId: string): Promise<GmailAccount> {
  const response = await api.post<GmailAccount>(`/api/gmail/accounts/${accountId}/deactivate`);
  return response.data;
}

/**
 * Disconnect a Gmail account
 */
export async function disconnectGmailAccount(accountId: string): Promise<void> {
  await api.delete(`/api/gmail/accounts/${accountId}`);
}