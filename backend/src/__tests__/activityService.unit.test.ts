import { jest, describe, it, beforeEach, afterEach, expect } from '@jest/globals';
import { ActivityService } from '../services/activityService';
import { prisma } from '../lib/prisma';

// Mock Prisma
jest.mock('../lib/prisma', () => ({
  prisma: {
    contactVersion: {
      findMany: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
    },
  },
}));

// Use any type for mocks to avoid TypeScript errors in tests
const mockPrismaContactVersion = prisma.contactVersion as any;
const mockPrismaTask = prisma.task as any;

describe('ActivityService Unit Tests', () => {
  const userId = 'test-user-id';
  const now = new Date();

  const mockContactVersion = {
    id: 'cv-1',
    contactId: 'contact-1',
    version: 2,
    snapshot: {},
    changes: { firstName: { from: 'John', to: 'Johnny' } },
    createdAt: now,
    contact: {
      id: 'contact-1',
      firstName: 'Johnny',
      lastName: 'Doe',
    },
  };

  const mockTask = {
    id: 'task-1',
    title: 'Test Task',
    status: 'incomplete',
    category: 'Work',
    dueDate: now,
    createdAt: now,
    completedAt: null,
    userId,
  };

  const mockCompletedTask = {
    ...mockTask,
    id: 'task-2',
    status: 'complete',
    completedAt: now,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    ActivityService.resetPrisma();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getRecentActivity', () => {
    it('should return empty activities when no data exists', async () => {
      mockPrismaContactVersion.findMany.mockResolvedValue([]);
      mockPrismaTask.findMany.mockResolvedValue([]);

      const result = await ActivityService.getRecentActivity(userId);

      expect(result.activities).toEqual([]);
      expect(result.hasMore).toBe(false);
    });

    it('should return contact edit activities', async () => {
      mockPrismaContactVersion.findMany.mockResolvedValue([mockContactVersion]);
      mockPrismaTask.findMany.mockResolvedValue([]);

      const result = await ActivityService.getRecentActivity(userId);

      expect(result.activities).toHaveLength(1);
      expect(result.activities[0].type).toBe('contact_edited');
      expect(result.activities[0].contact).toBeDefined();
      expect(result.activities[0].contact?.name).toBe('Johnny Doe');
      expect(result.activities[0].contact?.changes).toEqual(mockContactVersion.changes);
    });

    it('should return task created activities', async () => {
      mockPrismaContactVersion.findMany.mockResolvedValue([]);
      mockPrismaTask.findMany
        .mockResolvedValueOnce([mockTask]) // Recent tasks
        .mockResolvedValueOnce([]); // Completed tasks

      const result = await ActivityService.getRecentActivity(userId);

      expect(result.activities).toHaveLength(1);
      expect(result.activities[0].type).toBe('task_created');
      expect(result.activities[0].task).toBeDefined();
      expect(result.activities[0].task?.title).toBe('Test Task');
    });

    it('should return task completed activities', async () => {
      mockPrismaContactVersion.findMany.mockResolvedValue([]);
      mockPrismaTask.findMany
        .mockResolvedValueOnce([]) // Recent tasks
        .mockResolvedValueOnce([mockCompletedTask]); // Completed tasks

      const result = await ActivityService.getRecentActivity(userId);

      expect(result.activities).toHaveLength(1);
      expect(result.activities[0].type).toBe('task_completed');
      expect(result.activities[0].task?.previousStatus).toBe('incomplete');
    });

    it('should merge and sort activities by timestamp (most recent first)', async () => {
      const olderDate = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
      const newerDate = new Date(now.getTime() + 1000 * 60 * 60); // 1 hour later

      const olderContactVersion = {
        ...mockContactVersion,
        createdAt: olderDate,
      };

      const newerTask = {
        ...mockTask,
        createdAt: newerDate,
      };

      mockPrismaContactVersion.findMany.mockResolvedValue([olderContactVersion]);
      mockPrismaTask.findMany
        .mockResolvedValueOnce([newerTask])
        .mockResolvedValueOnce([]);

      const result = await ActivityService.getRecentActivity(userId);

      expect(result.activities).toHaveLength(2);
      expect(result.activities[0].type).toBe('task_created'); // Newer
      expect(result.activities[1].type).toBe('contact_edited'); // Older
    });

    it('should apply pagination with default limit', async () => {
      mockPrismaContactVersion.findMany.mockResolvedValue([]);
      mockPrismaTask.findMany.mockResolvedValue([]);

      await ActivityService.getRecentActivity(userId);

      // Default limit is 20, but we fetch limit + 10 = 30
      expect(mockPrismaContactVersion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 30,
        })
      );
    });

    it('should apply custom limit and offset', async () => {
      mockPrismaContactVersion.findMany.mockResolvedValue([]);
      mockPrismaTask.findMany.mockResolvedValue([]);

      await ActivityService.getRecentActivity(userId, { limit: 10, offset: 5 });

      // Custom limit is 10, so we fetch 10 + 10 = 20
      expect(mockPrismaContactVersion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        })
      );
    });

    it('should indicate hasMore when more activities exist', async () => {
      // Create more activities than the limit
      const manyTasks = Array.from({ length: 25 }, (_, i) => ({
        ...mockTask,
        id: `task-${i}`,
        createdAt: new Date(now.getTime() - i * 1000),
      }));

      mockPrismaContactVersion.findMany.mockResolvedValue([]);
      mockPrismaTask.findMany
        .mockResolvedValueOnce(manyTasks)
        .mockResolvedValueOnce([]);

      const result = await ActivityService.getRecentActivity(userId, { limit: 10 });

      expect(result.hasMore).toBe(true);
      expect(result.activities).toHaveLength(10);
    });

    it('should filter contact versions to only include edits (version > 1)', async () => {
      mockPrismaContactVersion.findMany.mockResolvedValue([]);
      mockPrismaTask.findMany.mockResolvedValue([]);

      await ActivityService.getRecentActivity(userId);

      expect(mockPrismaContactVersion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            version: { gt: 1 },
          }),
        })
      );
    });

    it('should only include non-deleted contacts', async () => {
      mockPrismaContactVersion.findMany.mockResolvedValue([]);
      mockPrismaTask.findMany.mockResolvedValue([]);

      await ActivityService.getRecentActivity(userId);

      expect(mockPrismaContactVersion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contact: expect.objectContaining({
              isDeleted: false,
            }),
          }),
        })
      );
    });

    it('should handle task without completedAt in completed tasks query', async () => {
      const taskWithoutCompletedAt = {
        ...mockCompletedTask,
        completedAt: null, // Edge case: status is complete but completedAt is null
      };

      mockPrismaContactVersion.findMany.mockResolvedValue([]);
      mockPrismaTask.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([taskWithoutCompletedAt]);

      const result = await ActivityService.getRecentActivity(userId);

      // Should not include the task since completedAt is null
      expect(result.activities).toHaveLength(0);
    });
  });
});
