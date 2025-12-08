import { GmailAccount, GmailAccountListResponse, ConnectGmailResponse } from '../types/gmail';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

/**
 * Gmail API Service
 * Handles all Gmail-related API calls
 */

/**
 * Get all connected Gmail accounts for the current user
 */
export async function getGmailAccounts(): Promise<GmailAccount[]> {
  const response = await fetch(`${API_BASE_URL}/api/gmail/accounts`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Gmail accounts');
  }

  const data: GmailAccountListResponse = await response.json();
  return data.accounts;
}

/**
 * Initiate OAuth flow to connect a new Gmail account
 * Returns the authorization URL to redirect the user to
 */
export async function connectGmailAccount(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/gmail/accounts/connect`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to initiate Gmail connection');
  }

  const data: ConnectGmailResponse = await response.json();
  return data.authUrl;
}

/**
 * Activate monitoring for a Gmail account
 */
export async function activateGmailAccount(accountId: string): Promise<GmailAccount> {
  const response = await fetch(`${API_BASE_URL}/api/gmail/accounts/${accountId}/activate`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to activate Gmail account');
  }

  return response.json();
}

/**
 * Deactivate monitoring for a Gmail account
 */
export async function deactivateGmailAccount(accountId: string): Promise<GmailAccount> {
  const response = await fetch(`${API_BASE_URL}/api/gmail/accounts/${accountId}/deactivate`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to deactivate Gmail account');
  }

  return response.json();
}

/**
 * Disconnect a Gmail account
 */
export async function disconnectGmailAccount(accountId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/gmail/accounts/${accountId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to disconnect Gmail account');
  }
}