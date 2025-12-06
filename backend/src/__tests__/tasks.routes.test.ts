import { jest, describe, it, beforeEach, afterEach, expect } from '@jest/globals';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// Create mock functions with proper types
const mockCreateTask = jest.fn<() => Promise<any>>();
const mockGetTasksByUserId = jest.fn<() => Promise<any>>();
const mockGetTasksByUserIdAndDate = jest.fn<() => Promise<any>>();
const mockUpdateTask = jest.fn<() => Promise<any>>();
const mockDeleteTask = jest.fn<() => Promise<any>>();
const mockMoveTask = jest.fn<() => Promise<any>>();
const mockReorderTask = jest.fn<() => Promise<any>>();
const mockFindById = jest.fn<() => Promise<any>>();
const mockGetTaskCount = jest.fn<() => Promise<any>>();
const mockBulkMoveTasks = jest.fn<() => Promise<any>>();

// Mock the TaskService
jest.mock('../services/taskService', () => ({
  TaskService: {
    createTask: mockCreateTask,
    getTasksByUserId: mockGetTasksByUserId,
    getTasksByUserIdAndDate: mockGetTasksByUserIdAndDate,
    updateTask: mockUpdateTask,
    deleteTask: mockDeleteTask,
    moveTask: mockMoveTask,
    reorderTask: mockReorderTask,
    findById: mockFindById,
    getTaskCount: mockGetTaskCount,
    bulkMoveTasks: mockBulkMoveTasks
  }
}));

// Mock the auth middleware
jest.mock('../middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id' };
    next();
  }
}));

// Import the actual routes after mocking
import taskRoutes from '../routes/tasks';

// Create a simple express app for testing
const app = express();
app.use(express.json());
app.use('/api/tasks', taskRoutes);

describe('Tasks Routes - Direct Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('POST /api/tasks (create task)', () => {
    it('should create a new task successfully', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        status: 'incomplete',
        dueDate: new Date('2025-04-16'),
        category: 'Roo Code',
        isPriority: false,
        displayOrder: 0,
        userId: 'test-user-id',
        createdAt: new Date(),
        completedAt: null,
        isRolledOver: false
      };

      mockCreateTask.mockResolvedValue(mockTask);

      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Test Task',
          status: 'incomplete',
          dueDate: '2025-04-16',
          category: 'Roo Code',
          displayOrder: 0
        })
        .expect(200);

      expect(response.body.id).toBe('task-1');
      expect(mockCreateTask).toHaveBeenCalled();
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Test Task'
          // Missing other required fields
        })
        .expect(400);

      expect(response.body.error).toContain('Missing required fields');
    });

    it('should handle PrismaClientKnownRequestError', async () => {
      const prismaError = new PrismaClientKnownRequestError('Invalid data', {
        code: 'P2002',
        clientVersion: '5.0.0'
      });

      mockCreateTask.mockRejectedValue(prismaError);

      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Test Task',
          status: 'incomplete',
          dueDate: '2025-04-16',
          category: 'Roo Code',
          displayOrder: 0
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid task data');
    });

    it('should handle generic errors', async () => {
      mockCreateTask.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Test Task',
          status: 'incomplete',
          dueDate: '2025-04-16',
          category: 'Roo Code',
          displayOrder: 0
        })
        .expect(500);

      expect(response.body.error).toBe('Failed to create task');
    });
  });

  describe('GET /api/tasks (get user tasks)', () => {
    it('should return tasks for the user', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Test Task',
          status: 'incomplete',
          dueDate: new Date(),
          category: 'Roo Code',
          isPriority: false,
          displayOrder: 0,
          userId: 'test-user-id'
        }
      ];

      mockGetTasksByUserId.mockResolvedValue(mockTasks);

      const response = await request(app)
        .get('/api/tasks')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(mockGetTasksByUserId).toHaveBeenCalledWith('test-user-id', expect.any(Object));
    });

    it('should handle query parameters', async () => {
      mockGetTasksByUserId.mockResolvedValue([]);

      await request(app)
        .get('/api/tasks?skip=10&take=20&status=complete&startDate=2025-01-01&endDate=2025-12-31')
        .expect(200);

      expect(mockGetTasksByUserId).toHaveBeenCalledWith('test-user-id', {
        skip: 10,
        take: 20,
        status: 'complete',
        startDate: expect.any(Date),
        endDate: expect.any(Date)
      });
    });

    it('should handle errors', async () => {
      mockGetTasksByUserId.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/tasks')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch tasks');
    });
  });

  describe('GET /api/tasks/count', () => {
    it('should return task count', async () => {
      mockGetTaskCount.mockResolvedValue(42);

      const response = await request(app)
        .get('/api/tasks/count')
        .expect(200);

      expect(response.body.count).toBe(42);
    });

    it('should handle query parameters', async () => {
      mockGetTaskCount.mockResolvedValue(10);

      await request(app)
        .get('/api/tasks/count?status=incomplete&startDate=2025-01-01&endDate=2025-12-31')
        .expect(200);

      expect(mockGetTaskCount).toHaveBeenCalledWith('test-user-id', {
        status: 'incomplete',
        startDate: expect.any(Date),
        endDate: expect.any(Date)
      });
    });

    it('should handle errors', async () => {
      mockGetTaskCount.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/tasks/count')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch task count');
    });
  });

  describe('GET /api/tasks/:date', () => {
    it('should return tasks for a specific date', async () => {
      const mockTasks = [{ id: 'task-1', title: 'Test' }];
      mockGetTasksByUserIdAndDate.mockResolvedValue(mockTasks);

      const response = await request(app)
        .get('/api/tasks/2025-04-16')
        .expect(200);

      expect(response.body).toHaveLength(1);
    });

    it('should handle invalid date format', async () => {
      // The route uses createPTDate which may throw for invalid dates
      // The error is caught by the generic error handler
      const response = await request(app)
        .get('/api/tasks/invalid-date');

      // Either 400 or 500 is acceptable depending on how the date parsing fails
      expect([400, 500]).toContain(response.status);
    });

    it('should handle errors', async () => {
      mockGetTasksByUserIdAndDate.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/tasks/2025-04-16')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch tasks for the specified date');
    });
  });

  describe('PUT /api/tasks/:id (update task)', () => {
    it('should update a task successfully', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Updated Task',
        status: 'complete'
      };

      mockUpdateTask.mockResolvedValue(mockTask);

      const response = await request(app)
        .put('/api/tasks/task-1')
        .send({ title: 'Updated Task', status: 'complete' })
        .expect(200);

      expect(response.body.title).toBe('Updated Task');
    });

    it('should handle dueDate in update', async () => {
      const mockTask = { id: 'task-1', dueDate: new Date('2025-05-01') };
      mockUpdateTask.mockResolvedValue(mockTask);

      await request(app)
        .put('/api/tasks/task-1')
        .send({ dueDate: '2025-05-01' })
        .expect(200);

      expect(mockUpdateTask).toHaveBeenCalledWith(
        'task-1',
        'test-user-id',
        expect.objectContaining({ dueDate: expect.any(Date) })
      );
    });

    it('should return 404 for task not found', async () => {
      mockUpdateTask.mockRejectedValue(new Error('Task not found or unauthorized'));

      const response = await request(app)
        .put('/api/tasks/non-existent')
        .send({ title: 'Test' })
        .expect(404);

      expect(response.body.error).toBe('Task not found or unauthorized');
    });

    it('should handle PrismaClientKnownRequestError', async () => {
      const prismaError = new PrismaClientKnownRequestError('Invalid data', {
        code: 'P2002',
        clientVersion: '5.0.0'
      });

      mockUpdateTask.mockRejectedValue(prismaError);

      const response = await request(app)
        .put('/api/tasks/task-1')
        .send({ title: 'Test' })
        .expect(400);

      expect(response.body.error).toBe('Invalid task data');
    });

    it('should handle generic errors', async () => {
      mockUpdateTask.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put('/api/tasks/task-1')
        .send({ title: 'Test' })
        .expect(500);

      expect(response.body.error).toBe('Failed to update task');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete a task successfully', async () => {
      mockDeleteTask.mockResolvedValue({ id: 'task-1' });

      const response = await request(app)
        .delete('/api/tasks/task-1')
        .expect(200);

      expect(response.body.message).toBe('Task deleted successfully');
    });

    it('should return 404 for task not found', async () => {
      mockDeleteTask.mockRejectedValue(new Error('Task not found or unauthorized'));

      const response = await request(app)
        .delete('/api/tasks/non-existent')
        .expect(404);

      expect(response.body.error).toBe('Task not found or unauthorized');
    });

    it('should handle generic errors', async () => {
      mockDeleteTask.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/api/tasks/task-1')
        .expect(500);

      expect(response.body.error).toBe('Failed to delete task');
    });
  });

  describe('PUT /api/tasks/:id/move', () => {
    it('should move a task successfully', async () => {
      const mockTask = {
        id: 'task-1',
        dueDate: new Date('2025-05-01'),
        isRolledOver: false
      };

      mockMoveTask.mockResolvedValue(mockTask);

      const response = await request(app)
        .put('/api/tasks/task-1/move')
        .send({ dueDate: '2025-05-01' })
        .expect(200);

      expect(response.body.id).toBe('task-1');
    });

    it('should return 400 for missing dueDate', async () => {
      const response = await request(app)
        .put('/api/tasks/task-1/move')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('dueDate is required');
    });

    it('should return 404 for task not found', async () => {
      mockMoveTask.mockRejectedValue(new Error('Task not found or unauthorized'));

      const response = await request(app)
        .put('/api/tasks/non-existent/move')
        .send({ dueDate: '2025-05-01' })
        .expect(404);

      expect(response.body.error).toBe('Task not found or unauthorized');
    });

    it('should handle generic errors', async () => {
      mockMoveTask.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put('/api/tasks/task-1/move')
        .send({ dueDate: '2025-05-01' })
        .expect(500);

      expect(response.body.error).toBe('Failed to move task');
    });
  });

  describe('PUT /api/tasks/:id/reorder', () => {
    it('should reorder a task successfully', async () => {
      const mockTask = { id: 'task-1', displayOrder: 100 };
      mockReorderTask.mockResolvedValue(mockTask);

      const response = await request(app)
        .put('/api/tasks/task-1/reorder')
        .send({ displayOrder: 100 })
        .expect(200);

      expect(response.body.displayOrder).toBe(100);
    });

    it('should return 400 for missing displayOrder', async () => {
      const response = await request(app)
        .put('/api/tasks/task-1/reorder')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('displayOrder is required');
    });

    it('should return 404 for task not found', async () => {
      mockReorderTask.mockRejectedValue(new Error('Task not found or unauthorized'));

      const response = await request(app)
        .put('/api/tasks/non-existent/reorder')
        .send({ displayOrder: 100 })
        .expect(404);

      expect(response.body.error).toBe('Task not found or unauthorized');
    });

    it('should handle generic errors', async () => {
      mockReorderTask.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put('/api/tasks/task-1/reorder')
        .send({ displayOrder: 100 })
        .expect(500);

      expect(response.body.error).toBe('Failed to reorder task');
    });
  });

  describe('POST /api/tasks/bulk-move', () => {
    it('should bulk move tasks successfully', async () => {
      const mockResult = {
        tasks: [
          { id: 'task-1', dueDate: new Date('2025-05-01') },
          { id: 'task-2', dueDate: new Date('2025-05-01') }
        ],
        errors: []
      };

      mockBulkMoveTasks.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/tasks/bulk-move')
        .send({
          taskIds: ['task-1', 'task-2'],
          targetDate: '2025-05-01'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.movedCount).toBe(2);
      expect(response.body.tasks).toHaveLength(2);
    });

    it('should return 400 for missing taskIds', async () => {
      const response = await request(app)
        .post('/api/tasks/bulk-move')
        .send({ targetDate: '2025-05-01' })
        .expect(400);

      expect(response.body.error).toBe('taskIds must be a non-empty array');
    });

    it('should return 400 for empty taskIds array', async () => {
      const response = await request(app)
        .post('/api/tasks/bulk-move')
        .send({ taskIds: [], targetDate: '2025-05-01' })
        .expect(400);

      expect(response.body.error).toBe('taskIds must be a non-empty array');
    });

    it('should return 400 for missing targetDate', async () => {
      const response = await request(app)
        .post('/api/tasks/bulk-move')
        .send({ taskIds: ['task-1'] })
        .expect(400);

      expect(response.body.error).toBe('targetDate is required');
    });

    it('should handle partial success with errors', async () => {
      const mockResult = {
        tasks: [{ id: 'task-1', dueDate: new Date('2025-05-01') }],
        errors: [{ taskId: 'task-2', error: 'Task not found' }]
      };

      mockBulkMoveTasks.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/tasks/bulk-move')
        .send({
          taskIds: ['task-1', 'task-2'],
          targetDate: '2025-05-01'
        })
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.movedCount).toBe(1);
      expect(response.body.errors).toHaveLength(1);
    });

    it('should handle generic errors', async () => {
      mockBulkMoveTasks.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/tasks/bulk-move')
        .send({
          taskIds: ['task-1'],
          targetDate: '2025-05-01'
        })
        .expect(500);

      expect(response.body.error).toBe('Failed to bulk move tasks');
    });
  });
});