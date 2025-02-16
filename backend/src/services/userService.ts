import { prisma as defaultPrisma } from '../lib/prisma';
import type { User, PrismaClient } from '@prisma/client';

export class UserService {
  // Allow overriding prisma in tests
  static prisma: PrismaClient = defaultPrisma;

  // Add method to reset prisma instance (for tests)
  static resetPrisma() {
    this.prisma = defaultPrisma;
  }

  /**
   * Find a user by their email address
   */
  static async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email }
    });
  }

  /**
   * Find a user by their ID
   */
  static async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id }
    });
  }

  /**
   * Find a user by their Google ID
   */
  static async findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { googleId }
    });
  }

  /**
   * Create a new user
   */
  static async createUser(data: {
    email: string;
    googleId?: string;
    displayName?: string;
    photoUrl?: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        ...data,
        lastLoginAt: new Date()
      }
    });
  }

  /**
   * Update user's last login timestamp
   */
  static async updateLastLogin(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() }
    });
  }

  /**
   * Update user's profile information
   */
  static async updateProfile(id: string, data: {
    displayName?: string;
    photoUrl?: string;
  }): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Find or create a user by their Google profile
   */
  static async findOrCreateGoogleUser(profile: {
    email: string;
    googleId: string;
    displayName?: string;
    photoUrl?: string;
  }): Promise<User> {
    // First try to find by Google ID
    const existingByGoogleId = await UserService.findByGoogleId(profile.googleId);
    if (existingByGoogleId) {
      // Update profile information if provided
      if (profile.displayName || profile.photoUrl) {
        return UserService.updateProfile(existingByGoogleId.id, {
          displayName: profile.displayName,
          photoUrl: profile.photoUrl
        });
      }
      return UserService.updateLastLogin(existingByGoogleId.id);
    }

    // Then try to find by email
    const existingByEmail = await UserService.findByEmail(profile.email);
    if (existingByEmail) {
      // Update with Google ID and profile if not set
      return this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          googleId: profile.googleId,
          displayName: profile.displayName,
          photoUrl: profile.photoUrl,
          lastLoginAt: new Date()
        }
      });
    }

    // Create new user if none exists
    console.log('Creating new user:', profile);
    return UserService.createUser({
      email: profile.email,
      googleId: profile.googleId,
      displayName: profile.displayName,
      photoUrl: profile.photoUrl
    });
  }
}