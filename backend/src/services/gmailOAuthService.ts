// Note: googleapis import will work after npm install
// eslint-disable-next-line @typescript-eslint/no-var-requires
let google: any;
try {
  google = require('googleapis').google;
} catch {
  // googleapis not installed yet, will be available after npm install
  google = null;
}

import { GmailAccountService, GmailAccount } from './gmailAccountService';
import { GMAIL_SCOPES, GmailTokens } from '../types/gmail';

/**
 * Gmail OAuth Service
 * Handles OAuth2 client creation and token management for Gmail API access
 */
export class GmailOAuthService {
  /**
   * Create an OAuth2 client with the application credentials
   */
  static createOAuth2Client(): any {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GMAIL_REDIRECT_URL || 
      process.env.REDIRECT_URL?.replace('/auth/google/callback', '/api/gmail/callback');

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  /**
   * Get an authenticated OAuth2 client for a Gmail account
   */
  static async getAuthenticatedClient(
    account: GmailAccount
  ): Promise<any> {
    const oauth2Client = this.createOAuth2Client();
    
    // Get decrypted tokens
    const tokens = await GmailAccountService.getDecryptedTokens(account as any);
    
    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expiry_date: account.tokenExpiresAt.getTime(),
    });

    // Set up automatic token refresh
    oauth2Client.on('tokens', async (newTokens: any) => {
      console.log('Gmail tokens refreshed for account:', account.email);
      
      try {
        const updateData: Record<string, unknown> = {};
        
        if (newTokens.access_token) {
          updateData.accessToken = newTokens.access_token;
        }
        if (newTokens.refresh_token) {
          updateData.refreshToken = newTokens.refresh_token;
        }
        if (newTokens.expiry_date) {
          updateData.tokenExpiresAt = new Date(newTokens.expiry_date);
        }

        await GmailAccountService.updateAccount(account.id, account.userId, updateData as any);
      } catch (error) {
        console.error('Failed to save refreshed tokens:', error);
      }
    });

    return oauth2Client;
  }

  /**
   * Generate the OAuth2 authorization URL for connecting a new Gmail account
   */
  static generateAuthUrl(state?: string): string {
    const oauth2Client = this.createOAuth2Client();
    
    return oauth2Client.generateAuthUrl({
      access_type: 'offline', // Required for refresh token
      scope: GMAIL_SCOPES as unknown as string[],
      prompt: 'consent', // Force consent to ensure refresh token is returned
      state,
    });
  }

  /**
   * Exchange an authorization code for tokens
   */
  static async exchangeCodeForTokens(code: string): Promise<GmailTokens> {
    const oauth2Client = this.createOAuth2Client();
    
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to obtain tokens from Google');
    }

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(tokens.expiry_date || Date.now() + 3600 * 1000),
    };
  }

  /**
   * Get the email address associated with the OAuth tokens
   */
  static async getEmailFromTokens(tokens: GmailTokens): Promise<string> {
    const oauth2Client = this.createOAuth2Client();
    
    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    
    if (!userInfo.data.email) {
      throw new Error('Could not retrieve email from Google');
    }

    return userInfo.data.email;
  }

  /**
   * Revoke OAuth tokens (when disconnecting an account)
   */
  static async revokeTokens(account: GmailAccount): Promise<void> {
    const oauth2Client = this.createOAuth2Client();
    const tokens = await GmailAccountService.getDecryptedTokens(account as any);
    
    try {
      await oauth2Client.revokeToken(tokens.accessToken);
    } catch (error) {
      console.error('Failed to revoke access token:', error);
    }

    try {
      await oauth2Client.revokeToken(tokens.refreshToken);
    } catch (error) {
      console.error('Failed to revoke refresh token:', error);
    }
  }

  /**
   * Check if tokens are expired or about to expire
   */
  static isTokenExpired(expiresAt: Date, bufferMinutes: number = 5): boolean {
    const bufferMs = bufferMinutes * 60 * 1000;
    return Date.now() >= expiresAt.getTime() - bufferMs;
  }

  /**
   * Manually refresh tokens for an account
   */
  static async refreshTokens(account: GmailAccount): Promise<GmailTokens> {
    const oauth2Client = this.createOAuth2Client();
    const tokens = await GmailAccountService.getDecryptedTokens(account as any);
    
    oauth2Client.setCredentials({
      refresh_token: tokens.refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    
    if (!credentials.access_token) {
      throw new Error('Failed to refresh access token');
    }

    const newTokens: GmailTokens = {
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token || tokens.refreshToken,
      expiresAt: new Date(credentials.expiry_date || Date.now() + 3600 * 1000),
    };

    // Update stored tokens
    await GmailAccountService.updateAccount(account.id, account.userId, {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      tokenExpiresAt: newTokens.expiresAt,
    });

    return newTokens;
  }
}