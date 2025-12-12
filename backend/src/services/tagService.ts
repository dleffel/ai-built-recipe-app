import type { Tag } from '@prisma/client';
import { BaseService } from './BaseService';

/**
 * Service for managing user tags
 */
export class TagService extends BaseService {
  /**
   * Find or create tags by name for a user
   * Creates new tags if they don't exist, returns existing ones if they do
   */
  static async findOrCreateTags(userId: string, tagNames: string[]): Promise<Tag[]> {
    if (!tagNames || tagNames.length === 0) {
      return [];
    }

    // Normalize tag names (trim whitespace, convert to lowercase for comparison)
    const normalizedNames = tagNames
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (normalizedNames.length === 0) {
      return [];
    }

    // Get existing tags for this user
    const existingTags = await this.prisma.tag.findMany({
      where: {
        userId,
        name: {
          in: normalizedNames,
          mode: 'insensitive',
        },
      },
    });

    // Find which tags need to be created
    const existingNamesLower = existingTags.map(t => t.name.toLowerCase());
    const newTagNames = normalizedNames.filter(
      name => !existingNamesLower.includes(name.toLowerCase())
    );

    // Create new tags
    if (newTagNames.length > 0) {
      await this.prisma.tag.createMany({
        data: newTagNames.map(name => ({
          name,
          userId,
        })),
        skipDuplicates: true,
      });
    }

    // Return all tags (existing + newly created)
    return this.prisma.tag.findMany({
      where: {
        userId,
        name: {
          in: normalizedNames,
          mode: 'insensitive',
        },
      },
    });
  }

  /**
   * Get all tags for a user
   * Optionally filter by search query
   */
  static async getUserTags(userId: string, search?: string): Promise<Tag[]> {
    const whereClause: { userId: string; name?: { contains: string; mode: 'insensitive' } } = {
      userId,
    };

    if (search) {
      whereClause.name = {
        contains: search.trim(),
        mode: 'insensitive',
      };
    }

    return this.prisma.tag.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get a tag by ID
   */
  static async findById(id: string): Promise<Tag | null> {
    return this.prisma.tag.findUnique({
      where: { id },
    });
  }

  /**
   * Delete orphan tags (tags not associated with any contacts)
   * This is a maintenance operation that can be run periodically
   */
  static async cleanupOrphanTags(userId: string): Promise<number> {
    const result = await this.prisma.tag.deleteMany({
      where: {
        userId,
        contacts: {
          none: {},
        },
      },
    });

    return result.count;
  }
}
