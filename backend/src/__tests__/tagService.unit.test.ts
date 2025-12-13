import { jest, describe, it, beforeEach, afterEach, expect } from '@jest/globals';
import { TagService } from '../services/tagService';
import { prisma } from '../lib/prisma';

// Mock Prisma
jest.mock('../lib/prisma', () => ({
  prisma: {
    tag: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

// Use any type for mocks to avoid TypeScript errors in tests
const mockPrismaTag = prisma.tag as any;

describe('TagService Unit Tests', () => {
  const userId = 'test-user-id';
  const mockTag = {
    id: 'tag-1',
    name: 'Work',
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    TagService.resetPrisma();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('findOrCreateTags', () => {
    it('should return empty array when no tag names provided', async () => {
      const result = await TagService.findOrCreateTags(userId, []);
      expect(result).toEqual([]);
      expect(mockPrismaTag.findMany).not.toHaveBeenCalled();
    });

    it('should return empty array when null tag names provided', async () => {
      const result = await TagService.findOrCreateTags(userId, null as any);
      expect(result).toEqual([]);
    });

    it('should return empty array when all tag names are empty strings', async () => {
      const result = await TagService.findOrCreateTags(userId, ['', '  ', '   ']);
      expect(result).toEqual([]);
    });

    it('should find existing tags without creating new ones', async () => {
      const existingTags = [mockTag];
      mockPrismaTag.findMany
        .mockResolvedValueOnce(existingTags) // First call to find existing
        .mockResolvedValueOnce(existingTags); // Second call to return all

      const result = await TagService.findOrCreateTags(userId, ['Work']);

      expect(mockPrismaTag.findMany).toHaveBeenCalledTimes(2);
      expect(mockPrismaTag.createMany).not.toHaveBeenCalled();
      expect(result).toEqual(existingTags);
    });

    it('should create new tags when they do not exist', async () => {
      mockPrismaTag.findMany
        .mockResolvedValueOnce([]) // No existing tags
        .mockResolvedValueOnce([mockTag]); // Return created tag
      mockPrismaTag.createMany.mockResolvedValue({ count: 1 });

      const result = await TagService.findOrCreateTags(userId, ['Work']);

      expect(mockPrismaTag.createMany).toHaveBeenCalledWith({
        data: [{ name: 'Work', userId }],
        skipDuplicates: true,
      });
      expect(result).toEqual([mockTag]);
    });

    it('should handle mixed existing and new tags', async () => {
      const existingTag = { ...mockTag, name: 'Work' };
      const newTag = { ...mockTag, id: 'tag-2', name: 'Personal' };

      mockPrismaTag.findMany
        .mockResolvedValueOnce([existingTag]) // Only Work exists
        .mockResolvedValueOnce([existingTag, newTag]); // Return all tags
      mockPrismaTag.createMany.mockResolvedValue({ count: 1 });

      const result = await TagService.findOrCreateTags(userId, ['Work', 'Personal']);

      expect(mockPrismaTag.createMany).toHaveBeenCalledWith({
        data: [{ name: 'Personal', userId }],
        skipDuplicates: true,
      });
      expect(result).toHaveLength(2);
    });

    it('should normalize tag names by trimming whitespace', async () => {
      mockPrismaTag.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockTag]);
      mockPrismaTag.createMany.mockResolvedValue({ count: 1 });

      await TagService.findOrCreateTags(userId, ['  Work  ']);

      expect(mockPrismaTag.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          name: {
            in: ['Work'],
            mode: 'insensitive',
          },
        },
      });
    });

    it('should handle case-insensitive tag matching', async () => {
      const existingTag = { ...mockTag, name: 'work' };
      mockPrismaTag.findMany
        .mockResolvedValueOnce([existingTag])
        .mockResolvedValueOnce([existingTag]);

      const result = await TagService.findOrCreateTags(userId, ['WORK']);

      expect(mockPrismaTag.createMany).not.toHaveBeenCalled();
      expect(result).toEqual([existingTag]);
    });
  });

  describe('getUserTags', () => {
    it('should get all tags for a user without search', async () => {
      const tags = [mockTag, { ...mockTag, id: 'tag-2', name: 'Personal' }];
      mockPrismaTag.findMany.mockResolvedValue(tags);

      const result = await TagService.getUserTags(userId);

      expect(mockPrismaTag.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(tags);
    });

    it('should filter tags by search query', async () => {
      mockPrismaTag.findMany.mockResolvedValue([mockTag]);

      const result = await TagService.getUserTags(userId, 'Work');

      expect(mockPrismaTag.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          name: {
            contains: 'Work',
            mode: 'insensitive',
          },
        },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual([mockTag]);
    });

    it('should trim search query whitespace', async () => {
      mockPrismaTag.findMany.mockResolvedValue([mockTag]);

      await TagService.getUserTags(userId, '  Work  ');

      expect(mockPrismaTag.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          name: {
            contains: 'Work',
            mode: 'insensitive',
          },
        },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findById', () => {
    it('should find a tag by ID', async () => {
      mockPrismaTag.findUnique.mockResolvedValue(mockTag);

      const result = await TagService.findById('tag-1');

      expect(mockPrismaTag.findUnique).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
      });
      expect(result).toEqual(mockTag);
    });

    it('should return null if tag not found', async () => {
      mockPrismaTag.findUnique.mockResolvedValue(null);

      const result = await TagService.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('cleanupOrphanTags', () => {
    it('should delete tags with no associated contacts', async () => {
      mockPrismaTag.deleteMany.mockResolvedValue({ count: 3 });

      const result = await TagService.cleanupOrphanTags(userId);

      expect(mockPrismaTag.deleteMany).toHaveBeenCalledWith({
        where: {
          userId,
          contacts: {
            none: {},
          },
        },
      });
      expect(result).toBe(3);
    });

    it('should return 0 when no orphan tags exist', async () => {
      mockPrismaTag.deleteMany.mockResolvedValue({ count: 0 });

      const result = await TagService.cleanupOrphanTags(userId);

      expect(result).toBe(0);
    });
  });
});
