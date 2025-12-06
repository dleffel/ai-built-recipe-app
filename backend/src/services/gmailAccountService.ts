import type { GmailAccount, GmailWatch } from '@prisma/client';
import { BaseService } from './BaseService';
import { encrypt, decrypt } from '../utils/encryption';
import {
  CreateGmailAccountDTO,
  UpdateGmailAccountDTO,
  GmailAccountResponse,
} from '../types/gmail';

// Gmail account with relations type
export type GmailAccountWithWatches = GmailAccount & {
  watches: GmailWatch[];
};

export class GmailAccountService extends BaseService {
  /**
   * Create a new Gmail account connection
   */
  static async createAccount(
    userId: string,
    data: CreateGmailAccountDTO
  ): Promise<GmailAccount> {
    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(data.accessToken);
    const encryptedRefreshToken = encrypt(data.refreshToken);

    return this.prisma.gmailAccount.create({
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
  }

  /**
   * Create or update the primary Gmail account for a user
   * Used during OAuth login flow
   */
  static async createOrUpdatePrimaryAccount(
    userId: string,
    data: CreateGmailAccountDTO
  ): Promise<GmailAccount> {
    const existing = await this.prisma.gmailAccount.findFirst({
      where: {
        userId,
        email: data.email,
      },
    });

    if (existing) {
      return this.updateAccount(existing.id, userId, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
      });
    }

    // Check if user already has a primary account
    const hasPrimary = await this.prisma.gmailAccount.findFirst({
      where: {
        userId,
        isPrimary: true,
      },
    });

    return this.createAccount(userId, {
      ...data,
      isPrimary: !hasPrimary, // Make primary if no existing primary
    });
  }

  /**
   * Find a Gmail account by ID
   */
  static async findById(id: string): Promise<GmailAccountWithWatches | null> {
    return this.prisma.gmailAccount.findUnique({
      where: { id },
      include: { watches: true },
    });
  }

  /**
   * Find a Gmail account by email address
   */
  static async findByEmail(email: string): Promise<GmailAccount | null> {
    return this.prisma.gmailAccount.findFirst({
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
    return this.prisma.gmailAccount.findUnique({
      where: {
        userId_email: {
          userId,
          email,
        },
      },
    });
  }

  /**
   * Get all Gmail accounts for a user
   */
  static async getAccountsByUserId(userId: string): Promise<GmailAccount[]> {
    return this.prisma.gmailAccount.findMany({
      where: { userId },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' },
      ],
    });
  }

  /**
   * Get all active Gmail accounts (for watch renewal)
   */
  static async getActiveAccounts(): Promise<GmailAccount[]> {
    return this.prisma.gmailAccount.findMany({
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
    // Verify ownership
    const account = await this.prisma.gmailAccount.findUnique({
      where: { id },
    });

    if (!account || account.userId !== userId) {
      throw new Error('Gmail account not found or unauthorized');
    }

    const updateData: Record<string, unknown> = {};

    if (data.accessToken !== undefined) {
      updateData.accessToken = encrypt(data.accessToken);
    }
    if (data.refreshToken !== undefined) {
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

    return this.prisma.gmailAccount.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Update the history ID for a Gmail account (internal use)
   */
  static async updateHistoryId(id: string, historyId: string): Promise<GmailAccount> {
    return this.prisma.gmailAccount.update({
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
    const account = await this.prisma.gmailAccount.findUnique({
      where: { id },
    });

    if (!account || account.userId !== userId) {
      throw new Error('Gmail account not found or unauthorized');
    }

    // Don't allow deleting primary account
    if (account.isPrimary) {
      throw new Error('Cannot delete primary Gmail account');
    }

    await this.prisma.gmailAccount.delete({
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