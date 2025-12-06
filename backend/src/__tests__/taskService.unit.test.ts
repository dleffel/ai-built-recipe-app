import { jest, describe, it, beforeEach, afterEach, expect } from '@jest/globals';
import { TaskService } from '../services/taskService';
import { prisma } from '../lib/prisma';
import { TaskCategory, TaskStatus } from '../types/task';

// Mock Prisma
jest.mock('../lib/prisma', () => ({
  prisma: {
    task: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    }
  }
}));

// Use any type for mocks to avoid TypeScript errors in tests
const mockPrismaTask = prisma.task as any;

describe('TaskService Unit Tests', () => {
  const userId = 'test-user-id';
  const mockTask = {
    id: 'task-1',
    title: 'Test Task',
    status: 'incomplete' as TaskStatus,
    dueDate: new Date('2025-05-28T07:00:00.000Z'),
    category: 'Roo Code' as TaskCategory,
    isPriority: false,
    displayOrder: 0,
    userId,
    createdAt: new Date(),
    completedAt: null,
    isRolledOver: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    TaskService.resetPrisma();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createTask', () => {
    it('should create a task with all required fields', async () => {
      const taskData = {
        title: 'New Task',
        status: 'incomplete' as TaskStatus,
        dueDate: new Date('2025-05-28T07:00:00.000Z'),
        category: 'Roo Code' as TaskCategory,
        isPriority: false,
        displayOrder: 0
      };

      mockPrismaTask.create.mockResolvedValue({ ...taskData, id: 'new-task', userId });

      const result = await TaskService.createTask(userId, taskData);

      expect(mockPrismaTask.create).toHaveBeenCalledWith({
        data: { ...taskData, userId }
      });
      expect(result.id).toBe('new-task');
    });
  });

  describe('findById', () => {
    it('should find a task by ID', async () => {
      mockPrismaTask.findUnique.mockResolvedValue(mockTask);

      const result = await TaskService.findById('task-1');

      expect(mockPrismaTask.findUnique).toHaveBeenCalledWith({
        where: { id: 'task-1' }
      });
      expect(result).toEqual(mockTask);
    });

    it('should return null if task not found', async () => {
      mockPrismaTask.findUnique.mockResolvedValue(null);

      const result = await TaskService.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getTasksByUserId', () => {
    it('should get tasks for a user without options', async () => {
      mockPrismaTask.findMany.mockResolvedValue([mockTask]);

      const result = await TaskService.getTasksByUserId(userId);

      expect(mockPrismaTask.findMany).toHaveBeenCalledWith({
        where: { userId },
        skip: undefined,
        take: undefined,
        orderBy: [{ dueDate: 'asc' }, { displayOrder: 'asc' }]
      });
      expect(result).toHaveLength(1);
    });

    it('should get tasks with status filter', async () => {
      mockPrismaTask.findMany.mockResolvedValue([mockTask]);

      const result = await TaskService.getTasksByUserId(userId, { status: 'incomplete' });

      expect(mockPrismaTask.findMany).toHaveBeenCalledWith({
        where: { userId, status: 'incomplete' },
        skip: undefined,
        take: undefined,
        orderBy: [{ dueDate: 'asc' }, { displayOrder: 'asc' }]
      });
      expect(result).toHaveLength(1);
    });

    it('should get tasks with date range filter', async () => {
      const startDate = new Date('2025-05-01');
      const endDate = new Date('2025-05-31');
      mockPrismaTask.findMany.mockResolvedValue([mockTask]);

      const result = await TaskService.getTasksByUserId(userId, { startDate, endDate });

      expect(mockPrismaTask.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          dueDate: { gte: startDate, lte: endDate }
        },
        skip: undefined,
        take: undefined,
        orderBy: [{ dueDate: 'asc' }, { displayOrder: 'asc' }]
      });
      expect(result).toHaveLength(1);
    });

    it('should get tasks with only startDate filter', async () => {
      const startDate = new Date('2025-05-01');
      mockPrismaTask.findMany.mockResolvedValue([mockTask]);

      const result = await TaskService.getTasksByUserId(userId, { startDate });

      expect(mockPrismaTask.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          dueDate: { gte: startDate }
        },
        skip: undefined,
        take: undefined,
        orderBy: [{ dueDate: 'asc' }, { displayOrder: 'asc' }]
      });
      expect(result).toHaveLength(1);
    });

    it('should get tasks with only endDate filter', async () => {
      const endDate = new Date('2025-05-31');
      mockPrismaTask.findMany.mockResolvedValue([mockTask]);

      const result = await TaskService.getTasksByUserId(userId, { endDate });

      expect(mockPrismaTask.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          dueDate: { lte: endDate }
        },
        skip: undefined,
        take: undefined,
        orderBy: [{ dueDate: 'asc' }, { displayOrder: 'asc' }]
      });
      expect(result).toHaveLength(1);
    });

    it('should get tasks with pagination', async () => {
      mockPrismaTask.findMany.mockResolvedValue([mockTask]);

      const result = await TaskService.getTasksByUserId(userId, { skip: 10, take: 20 });

      expect(mockPrismaTask.findMany).toHaveBeenCalledWith({
        where: { userId },
        skip: 10,
        take: 20,
        orderBy: [{ dueDate: 'asc' }, { displayOrder: 'asc' }]
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('getTaskCount', () => {
    it('should get task count without options', async () => {
      mockPrismaTask.count.mockResolvedValue(5);

      const result = await TaskService.getTaskCount(userId);

      expect(mockPrismaTask.count).toHaveBeenCalledWith({
        where: { userId }
      });
      expect(result).toBe(5);
    });

    it('should get task count with status filter', async () => {
      mockPrismaTask.count.mockResolvedValue(3);

      const result = await TaskService.getTaskCount(userId, { status: 'incomplete' });

      expect(mockPrismaTask.count).toHaveBeenCalledWith({
        where: { userId, status: 'incomplete' }
      });
      expect(result).toBe(3);
    });

    it('should get task count with date range filter', async () => {
      const startDate = new Date('2025-05-01');
      const endDate = new Date('2025-05-31');
      mockPrismaTask.count.mockResolvedValue(2);

      const result = await TaskService.getTaskCount(userId, { startDate, endDate });

      expect(mockPrismaTask.count).toHaveBeenCalledWith({
        where: {
          userId,
          dueDate: { gte: startDate, lte: endDate }
        }
      });
      expect(result).toBe(2);
    });

    it('should get task count with only startDate filter', async () => {
      const startDate = new Date('2025-05-01');
      mockPrismaTask.count.mockResolvedValue(4);

      const result = await TaskService.getTaskCount(userId, { startDate });

      expect(mockPrismaTask.count).toHaveBeenCalledWith({
        where: {
          userId,
          dueDate: { gte: startDate }
        }
      });
      expect(result).toBe(4);
    });

    it('should get task count with only endDate filter', async () => {
      const endDate = new Date('2025-05-31');
      mockPrismaTask.count.mockResolvedValue(6);

      const result = await TaskService.getTaskCount(userId, { endDate });

      expect(mockPrismaTask.count).toHaveBeenCalledWith({
        where: {
          userId,
          dueDate: { lte: endDate }
        }
      });
      expect(result).toBe(6);
    });
  });

  describe('getTasksByUserIdAndDate', () => {
    it('should get tasks for a specific date', async () => {
      const date = new Date('2025-05-28T12:00:00.000Z');
      mockPrismaTask.findMany.mockResolvedValue([mockTask]);

      const result = await TaskService.getTasksByUserIdAndDate(userId, date);

      expect(mockPrismaTask.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('updateTask', () => {
    it('should update a task successfully', async () => {
      mockPrismaTask.findUnique.mockResolvedValue(mockTask);
      const updatedTask = { ...mockTask, title: 'Updated Title' };
      mockPrismaTask.update.mockResolvedValue(updatedTask);

      const result = await TaskService.updateTask('task-1', userId, { title: 'Updated Title' });

      expect(result.title).toBe('Updated Title');
    });

    it('should throw error if task not found', async () => {
      mockPrismaTask.findUnique.mockResolvedValue(null);

      await expect(TaskService.updateTask('non-existent', userId, { title: 'Test' }))
        .rejects.toThrow('Task not found or unauthorized');
    });

    it('should throw error if user is not authorized', async () => {
      mockPrismaTask.findUnique.mockResolvedValue({ ...mockTask, userId: 'other-user' });

      await expect(TaskService.updateTask('task-1', userId, { title: 'Test' }))
        .rejects.toThrow('Task not found or unauthorized');
    });

    it('should set completedAt when status changes to complete', async () => {
      mockPrismaTask.findUnique.mockResolvedValue(mockTask);
      const completedTask = { ...mockTask, status: 'complete', completedAt: new Date() };
      mockPrismaTask.update.mockResolvedValue(completedTask);

      const result = await TaskService.updateTask('task-1', userId, { status: 'complete' });

      expect(mockPrismaTask.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: expect.objectContaining({
          status: 'complete',
          completedAt: expect.any(Date)
        })
      });
      expect(result.status).toBe('complete');
    });

    it('should clear completedAt when status changes to incomplete', async () => {
      const completedTask = { ...mockTask, status: 'complete', completedAt: new Date() };
      mockPrismaTask.findUnique.mockResolvedValue(completedTask);
      const incompleteTask = { ...mockTask, status: 'incomplete', completedAt: null };
      mockPrismaTask.update.mockResolvedValue(incompleteTask);

      const result = await TaskService.updateTask('task-1', userId, { status: 'incomplete' });

      expect(mockPrismaTask.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: expect.objectContaining({
          status: 'incomplete',
          completedAt: null
        })
      });
      expect(result.completedAt).toBeNull();
    });
  });

  describe('deleteTask', () => {
    it('should delete a task successfully', async () => {
      mockPrismaTask.findUnique.mockResolvedValue(mockTask);
      mockPrismaTask.delete.mockResolvedValue(mockTask);

      const result = await TaskService.deleteTask('task-1', userId);

      expect(mockPrismaTask.delete).toHaveBeenCalledWith({
        where: { id: 'task-1' }
      });
      expect(result).toEqual(mockTask);
    });

    it('should throw error if task not found', async () => {
      mockPrismaTask.findUnique.mockResolvedValue(null);

      await expect(TaskService.deleteTask('non-existent', userId))
        .rejects.toThrow('Task not found or unauthorized');
    });

    it('should throw error if user is not authorized', async () => {
      mockPrismaTask.findUnique.mockResolvedValue({ ...mockTask, userId: 'other-user' });

      await expect(TaskService.deleteTask('task-1', userId))
        .rejects.toThrow('Task not found or unauthorized');
    });
  });

  describe('moveTask', () => {
    it('should move a task to a new date', async () => {
      mockPrismaTask.findUnique.mockResolvedValue(mockTask);
      const newDate = new Date('2025-05-30T07:00:00.000Z');
      const movedTask = { ...mockTask, dueDate: newDate, isRolledOver: false };
      mockPrismaTask.update.mockResolvedValue(movedTask);

      const result = await TaskService.moveTask('task-1', userId, { dueDate: newDate });

      expect(mockPrismaTask.update).toHaveBeenCalled();
      expect(result.isRolledOver).toBe(false);
    });

    it('should throw error if task not found', async () => {
      mockPrismaTask.findUnique.mockResolvedValue(null);

      await expect(TaskService.moveTask('non-existent', userId, { dueDate: new Date() }))
        .rejects.toThrow('Task not found or unauthorized');
    });

    it('should preserve isRolledOver when explicitly set', async () => {
      mockPrismaTask.findUnique.mockResolvedValue(mockTask);
      const newDate = new Date('2025-05-30T07:00:00.000Z');
      const movedTask = { ...mockTask, dueDate: newDate, isRolledOver: true };
      mockPrismaTask.update.mockResolvedValue(movedTask);

      const result = await TaskService.moveTask('task-1', userId, { dueDate: newDate, isRolledOver: true });

      expect(result.isRolledOver).toBe(true);
    });
  });

  describe('reorderTask', () => {
    it('should reorder a task', async () => {
      mockPrismaTask.findUnique.mockResolvedValue(mockTask);
      const reorderedTask = { ...mockTask, displayOrder: 100 };
      mockPrismaTask.update.mockResolvedValue(reorderedTask);

      const result = await TaskService.reorderTask('task-1', userId, { displayOrder: 100 });

      expect(mockPrismaTask.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { displayOrder: 100 }
      });
      expect(result.displayOrder).toBe(100);
    });

    it('should throw error if task not found', async () => {
      mockPrismaTask.findUnique.mockResolvedValue(null);

      await expect(TaskService.reorderTask('non-existent', userId, { displayOrder: 100 }))
        .rejects.toThrow('Task not found or unauthorized');
    });
  });

  describe('rollOverTasks', () => {
    it('should roll over incomplete tasks to the next day', async () => {
      const fromDate = new Date('2025-05-28');
      const toDate = new Date('2025-05-29');
      const incompleteTasks = [
        { ...mockTask, id: 'task-1', displayOrder: 0 },
        { ...mockTask, id: 'task-2', displayOrder: 10 }
      ];

      // First call returns incomplete tasks, second call returns existing tasks for target date
      mockPrismaTask.findMany
        .mockResolvedValueOnce(incompleteTasks)
        .mockResolvedValueOnce([]);

      mockPrismaTask.update.mockResolvedValue({ ...mockTask, isRolledOver: true });

      const result = await TaskService.rollOverTasks(fromDate, toDate);

      expect(result).toBe(2);
      expect(mockPrismaTask.update).toHaveBeenCalledTimes(2);
    });

    it('should return 0 if no incomplete tasks', async () => {
      const fromDate = new Date('2025-05-28');
      const toDate = new Date('2025-05-29');

      mockPrismaTask.findMany.mockResolvedValueOnce([]);

      const result = await TaskService.rollOverTasks(fromDate, toDate);

      expect(result).toBe(0);
      expect(mockPrismaTask.update).not.toHaveBeenCalled();
    });

    it('should calculate display order based on existing tasks', async () => {
      const fromDate = new Date('2025-05-28');
      const toDate = new Date('2025-05-29');
      const incompleteTasks = [{ ...mockTask, id: 'task-1', displayOrder: 0 }];
      const existingTasks = [{ ...mockTask, id: 'existing-task', displayOrder: 50 }];

      mockPrismaTask.findMany
        .mockResolvedValueOnce(incompleteTasks)
        .mockResolvedValueOnce(existingTasks);

      mockPrismaTask.update.mockResolvedValue({ ...mockTask, isRolledOver: true });

      await TaskService.rollOverTasks(fromDate, toDate);

      expect(mockPrismaTask.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: expect.objectContaining({
          displayOrder: 60, // 50 + 10
          isRolledOver: true
        })
      });
    });
  });

  describe('getTasksToRollOver', () => {
    it('should get incomplete tasks from yesterday', async () => {
      mockPrismaTask.findMany.mockResolvedValue([mockTask]);

      const result = await TaskService.getTasksToRollOver();

      expect(mockPrismaTask.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: 'incomplete',
          dueDate: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date)
          })
        })
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('bulkMoveTasks', () => {
    it('should bulk move multiple tasks', async () => {
      const taskIds = ['task-1', 'task-2'];
      const targetDate = new Date('2025-05-30');
      const task1 = { ...mockTask, id: 'task-1' };
      const task2 = { ...mockTask, id: 'task-2' };

      mockPrismaTask.findMany.mockResolvedValue([]);
      mockPrismaTask.findUnique
        .mockResolvedValueOnce(task1)
        .mockResolvedValueOnce(task2);
      mockPrismaTask.update
        .mockResolvedValueOnce({ ...task1, dueDate: targetDate })
        .mockResolvedValueOnce({ ...task2, dueDate: targetDate });

      const result = await TaskService.bulkMoveTasks(userId, { taskIds, targetDate });

      expect(result.tasks).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle task not found errors', async () => {
      const taskIds = ['task-1', 'non-existent'];
      const targetDate = new Date('2025-05-30');
      const task1 = { ...mockTask, id: 'task-1' };

      mockPrismaTask.findMany.mockResolvedValue([]);
      mockPrismaTask.findUnique
        .mockResolvedValueOnce(task1)
        .mockResolvedValueOnce(null);
      mockPrismaTask.update.mockResolvedValue({ ...task1, dueDate: targetDate });

      const result = await TaskService.bulkMoveTasks(userId, { taskIds, targetDate });

      expect(result.tasks).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({ taskId: 'non-existent', error: 'Task not found' });
    });

    it('should handle unauthorized task errors', async () => {
      const taskIds = ['task-1', 'task-2'];
      const targetDate = new Date('2025-05-30');
      const task1 = { ...mockTask, id: 'task-1' };
      const task2 = { ...mockTask, id: 'task-2', userId: 'other-user' };

      mockPrismaTask.findMany.mockResolvedValue([]);
      mockPrismaTask.findUnique
        .mockResolvedValueOnce(task1)
        .mockResolvedValueOnce(task2);
      mockPrismaTask.update.mockResolvedValue({ ...task1, dueDate: targetDate });

      const result = await TaskService.bulkMoveTasks(userId, { taskIds, targetDate });

      expect(result.tasks).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({ taskId: 'task-2', error: 'Unauthorized' });
    });

    it('should handle update errors', async () => {
      const taskIds = ['task-1'];
      const targetDate = new Date('2025-05-30');
      const task1 = { ...mockTask, id: 'task-1' };

      mockPrismaTask.findMany.mockResolvedValue([]);
      mockPrismaTask.findUnique.mockResolvedValue(task1);
      mockPrismaTask.update.mockRejectedValue(new Error('Database error'));

      const result = await TaskService.bulkMoveTasks(userId, { taskIds, targetDate });

      expect(result.tasks).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({ taskId: 'task-1', error: 'Database error' });
    });

    it('should calculate display order based on existing tasks', async () => {
      const taskIds = ['task-1'];
      const targetDate = new Date('2025-05-30');
      const task1 = { ...mockTask, id: 'task-1' };
      const existingTask = { ...mockTask, id: 'existing', displayOrder: 500 };

      mockPrismaTask.findMany.mockResolvedValue([existingTask]);
      mockPrismaTask.findUnique.mockResolvedValue(task1);
      mockPrismaTask.update.mockResolvedValue({ ...task1, dueDate: targetDate, displayOrder: 1500 });

      const result = await TaskService.bulkMoveTasks(userId, { taskIds, targetDate });

      expect(mockPrismaTask.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: expect.objectContaining({
          displayOrder: 1500 // 500 + 1000
        })
      });
      expect(result.tasks).toHaveLength(1);
    });
  });
});