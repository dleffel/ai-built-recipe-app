import { BaseService } from './BaseService';
import { encrypt, decrypt } from '../utils/encryption';
import {
  CreateGmailAccountDTO,
  UpdateGmailAccountDTO,
  GmailAccountResponse,
} from '../types/gmail';

// Local type definitions for Gmail models
// These match the Prisma schema but are defined locally to avoid
// compilation errors before prisma generate is run
export interface GmailAccount {
  id: string;
  email: string;
  isPrimary: boolean;
  isActive: boolean;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  historyId: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastSyncAt: Date | null;
  userId: string;
}

export interface GmailWatch {
  id: string;
  resourceId: string;
  expiration: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  gmailAccountId: string;
}

// Gmail account with relations type
export type GmailAccountWithWatches = GmailAccount & {
  watches: GmailWatch[];
};

// Helper to access gmailAccount model (will be available after prisma generate)
// Using 'any' to bypass TypeScript errors until Prisma client is regenerated
const getGmailAccountModel = (prisma: any) => prisma.gmailAccount;
const getGmailWatchModel = (prisma: any) => prisma.gmailWatch;

export class GmailAccountService extends BaseService {
  /**
   * Create a new Gmail account connection
   */
  static async createAccount(
    userId: string,
    data: CreateGmailAccountDTO
  ): Promise<GmailAccount> {
    console.log('[GmailAccount] createAccount: Starting', { userId, email: data.email, isPrimary: data.isPrimary });
    
    // Encrypt tokens before storing
    console.log('[GmailAccount] createAccount: Encrypting tokens...');
    const encryptedAccessToken = encrypt(data.accessToken);
    const encryptedRefreshToken = encrypt(data.refreshToken);
    console.log('[GmailAccount] createAccount: Tokens encrypted successfully');

    console.log('[GmailAccount] createAccount: Creating account in database...');
    const account = await getGmailAccountModel(this.prisma).create({
      data: {
        userId,
        email: data.email,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
        isPrimary: data.isPrimary ?? false,
        isActive: true,
      },
    });
    console.log('[GmailAccount] createAccount: Account created successfully', {
      id: account.id,
      email: account.email,
      isPrimary: account.isPrimary,
    });
    
    return account;
  }

  /**
   * Create or update the primary Gmail account for a user
   * Used during OAuth login flow
   */
  static async createOrUpdatePrimaryAccount(
    userId: string,
    data: CreateGmailAccountDTO
  ): Promise<GmailAccount> {
    console.log('[GmailAccount] createOrUpdatePrimaryAccount: Starting', { userId, email: data.email });
    
    console.log('[GmailAccount] createOrUpdatePrimaryAccount: Checking for existing account...');
    const existing = await getGmailAccountModel(this.prisma).findFirst({
      where: {
        userId,
        email: data.email,
      },
    });
    console.log('[GmailAccount] createOrUpdatePrimaryAccount: Existing account check result', {
      found: !!existing,
      existingId: existing?.id,
    });

    if (existing) {
      console.log('[GmailAccount] createOrUpdatePrimaryAccount: Updating existing account');
      return this.updateAccount(existing.id, userId, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
      });
    }

    // Check if user already has a primary account
    console.log('[GmailAccount] createOrUpdatePrimaryAccount: Checking for existing primary account...');
    const hasPrimary = await getGmailAccountModel(this.prisma).findFirst({
      where: {
        userId,
        isPrimary: true,
      },
    });
    console.log('[GmailAccount] createOrUpdatePrimaryAccount: Has primary account:', !!hasPrimary);

    console.log('[GmailAccount] createOrUpdatePrimaryAccount: Creating new account, isPrimary:', !hasPrimary);
    return this.createAccount(userId, {
      ...data,
      isPrimary: !hasPrimary, // Make primary if no existing primary
    });
  }

  /**
   * Find a Gmail account by ID
   */
  static async findById(id: string): Promise<GmailAccountWithWatches | null> {
    return getGmailAccountModel(this.prisma).findUnique({
      where: { id },
      include: { watches: true },
    });
  }

  /**
   * Find a Gmail account by email address
   */
  static async findByEmail(email: string): Promise<GmailAccount | null> {
    return getGmailAccountModel(this.prisma).findFirst({
      where: { email },
    });
  }

  /**
   * Find a Gmail account by user ID and email
   */
  static async findByUserAndEmail(
    userId: string,
    email: string
  ): Promise<GmailAccount | null> {
    console.log('[GmailAccount] findByUserAndEmail: Searching', { userId, email });
    const account = await getGmailAccountModel(this.prisma).findUnique({
      where: {
        userId_email: {
          userId,
          email,
        },
      },
    });
    console.log('[GmailAccount] findByUserAndEmail: Result', {
      found: !!account,
      accountId: account?.id,
    });
    return account;
  }

  /**
   * Get all Gmail accounts for a user
   */
  static async getAccountsByUserId(userId: string): Promise<GmailAccount[]> {
    console.log('[GmailAccount] getAccountsByUserId: Fetching accounts for user:', userId);
    const accounts = await getGmailAccountModel(this.prisma).findMany({
      where: { userId },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' },
      ],
    });
    console.log('[GmailAccount] getAccountsByUserId: Found accounts:', accounts.length);
    return accounts;
  }

  /**
   * Get all active Gmail accounts (for watch renewal)
   */
  static async getActiveAccounts(): Promise<GmailAccount[]> {
    return getGmailAccountModel(this.prisma).findMany({
      where: { isActive: true },
    });
  }

  /**
   * Update a Gmail account
   */
  static async updateAccount(
    id: string,
    userId: string,
    data: UpdateGmailAccountDTO
  ): Promise<GmailAccount> {
    console.log('[GmailAccount] updateAccount: Starting', { id, userId });
    
    // Verify ownership
    console.log('[GmailAccount] updateAccount: Verifying ownership...');
    const account = await getGmailAccountModel(this.prisma).findUnique({
      where: { id },
    });

    if (!account || account.userId !== userId) {
      console.error('[GmailAccount] updateAccount: Account not found or unauthorized', {
        found: !!account,
        accountUserId: account?.userId,
        requestUserId: userId,
      });
      throw new Error('Gmail account not found or unauthorized');
    }
    console.log('[GmailAccount] updateAccount: Ownership verified');

    const updateData: Record<string, unknown> = {};

    if (data.accessToken !== undefined) {
      console.log('[GmailAccount] updateAccount: Encrypting access token...');
      updateData.accessToken = encrypt(data.accessToken);
    }
    if (data.refreshToken !== undefined) {
      console.log('[GmailAccount] updateAccount: Encrypting refresh token...');
      updateData.refreshToken = encrypt(data.refreshToken);
    }
    if (data.tokenExpiresAt !== undefined) {
      updateData.tokenExpiresAt = data.tokenExpiresAt;
    }
    if (data.historyId !== undefined) {
      updateData.historyId = data.historyId;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }
    if (data.lastSyncAt !== undefined) {
      updateData.lastSyncAt = data.lastSyncAt;
    }

    console.log('[GmailAccount] updateAccount: Updating account in database...');
    const updatedAccount = await getGmailAccountModel(this.prisma).update({
      where: { id },
      data: updateData,
    });
    console.log('[GmailAccount] updateAccount: Account updated successfully', {
      id: updatedAccount.id,
      email: updatedAccount.email,
    });
    
    return updatedAccount;
  }

  /**
   * Update the history ID for a Gmail account (internal use)
   */
  static async updateHistoryId(id: string, historyId: string): Promise<GmailAccount> {
    return getGmailAccountModel(this.prisma).update({
      where: { id },
      data: {
        historyId,
        lastSyncAt: new Date(),
      },
    });
  }

  /**
   * Activate monitoring for a Gmail account
   */
  static async activateAccount(id: string, userId: string): Promise<GmailAccount> {
    return this.updateAccount(id, userId, { isActive: true });
  }

  /**
   * Deactivate monitoring for a Gmail account
   */
  static async deactivateAccount(id: string, userId: string): Promise<GmailAccount> {
    return this.updateAccount(id, userId, { isActive: false });
  }

  /**
   * Delete a Gmail account connection
   */
  static async deleteAccount(id: string, userId: string): Promise<void> {
    // Verify ownership
    const account = await getGmailAccountModel(this.prisma).findUnique({
      where: { id },
    });

    if (!account || account.userId !== userId) {
      throw new Error('Gmail account not found or unauthorized');
    }

    // Don't allow deleting primary account
    if (account.isPrimary) {
      throw new Error('Cannot delete primary Gmail account');
    }

    await getGmailAccountModel(this.prisma).delete({
      where: { id },
    });
  }

  /**
   * Get decrypted tokens for a Gmail account
   */
  static async getDecryptedTokens(
    account: GmailAccount
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return {
      accessToken: decrypt(account.accessToken),
      refreshToken: decrypt(account.refreshToken),
    };
  }

  /**
   * Format a Gmail account for API response (excludes sensitive data)
   */
  static formatForResponse(account: GmailAccount): GmailAccountResponse {
    return {
      id: account.id,
      email: account.email,
      isPrimary: account.isPrimary,
      isActive: account.isActive,
      lastSyncAt: account.lastSyncAt?.toISOString() ?? null,
      createdAt: account.createdAt.toISOString(),
    };
  }
}