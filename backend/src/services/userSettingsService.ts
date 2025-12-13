import { BaseService } from './BaseService';

/**
 * User settings response type
 */
export interface UserSettings {
  hiddenFeedTags: string[];
}

/**
 * Update user settings DTO
 */
export interface UpdateUserSettingsDTO {
  hiddenFeedTags?: string[];
}

/**
 * Service for managing user settings
 */
export class UserSettingsService extends BaseService {
  /**
   * Get user settings
   */
  static async getUserSettings(userId: string): Promise<UserSettings> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        hiddenFeedTags: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      hiddenFeedTags: user.hiddenFeedTags,
    };
  }

  /**
   * Update user settings
   */
  static async updateUserSettings(
    userId: string,
    settings: UpdateUserSettingsDTO
  ): Promise<UserSettings> {
    // Validate that all tag IDs exist and belong to the user
    if (settings.hiddenFeedTags && settings.hiddenFeedTags.length > 0) {
      const validTags = await this.prisma.tag.findMany({
        where: {
          id: { in: settings.hiddenFeedTags },
          userId,
        },
        select: { id: true },
      });

      const validTagIds = validTags.map((t) => t.id);
      const invalidTagIds = settings.hiddenFeedTags.filter(
        (id) => !validTagIds.includes(id)
      );

      if (invalidTagIds.length > 0) {
        throw new Error(`Invalid tag IDs: ${invalidTagIds.join(', ')}`);
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        hiddenFeedTags: settings.hiddenFeedTags ?? [],
      },
      select: {
        hiddenFeedTags: true,
      },
    });

    return {
      hiddenFeedTags: user.hiddenFeedTags,
    };
  }

  /**
   * Get hidden feed tag IDs for a user
   */
  static async getHiddenFeedTags(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        hiddenFeedTags: true,
      },
    });

    return user?.hiddenFeedTags ?? [];
  }
}
