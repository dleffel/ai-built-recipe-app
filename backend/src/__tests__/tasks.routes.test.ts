import request from 'supertest';
import express from 'express';
import taskRoutes from '../routes/tasks';
import { TaskService } from '../services/taskService';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { User } from '@prisma/client';

// Mock the TaskService
jest.mock('../services/taskService');
const mockTaskService = TaskService as jest.Mocked<typeof TaskService>;

// Mock timezone utils
jest.mock('../utils/timezoneUtils', () => ({
  createPTDate: jest.fn((date) => new Date(date))
}));

describe('Task Routes', () => {
  let app: express.Application;
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoUrl: null,
    googleId: 'google-123',
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock authentication middleware
    app.use((req, res, next) => {
      req.user = mockUser;
      next();
    });

    app.use('/api/tasks', taskRoutes);

    jest.clearAllMocks();
  });

  describe('Authentication Middleware', () => {
    it('should return 401 when user is not authenticated', async () => {
      const unauthApp = express();
      unauthApp.use(express.json());
      unauthApp.use('/api/tasks', taskRoutes);

      const response = await request(unauthApp)
        .post('/api/tasks')
        .send({ title: 'Test Task' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('POST /', () => {
    const validTaskData = {
      title: 'Test Task',
      dueDate: '2024-01-01',
      status: 'incomplete',
      category: 'Personal',
      displayOrder: 1
    };

    it('should create a task successfully', async () => {
      const mockTask = { id: 'task-123', ...validTaskData };
      mockTaskService.createTask.mockResolvedValue(mockTask as any);

      const response = await request(app)
        .post('/api/tasks')
        .send(validTaskData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTask);
      expect(mockTaskService.createTask).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          ...validTaskData,
          dueDate: expect.any(Date)
        })
      );
    });

    it('should return 400 when title is missing', async () => {
      const invalidData = { ...validTaskData };
      delete (invalidData as any).title;

      const response = await request(app)
        .post('/api/tasks')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return 400 when dueDate is missing', async () => {
      const invalidData = { ...validTaskData };
      delete (invalidData as any).dueDate;

      const response = await request(app)
        .post('/api/tasks')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return 400 when status is missing', async () => {
      const invalidData = { ...validTaskData };
      delete (invalidData as any).status;

      const response = await request(app)
        .post('/api/tasks')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return 400 when category is missing', async () => {
      const invalidData = { ...validTaskData };
      delete (invalidData as any).category;

      const response = await request(app)
        .post('/api/tasks')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return 400 when displayOrder is missing', async () => {
      const invalidData = { ...validTaskData };
      delete (invalidData as any).displayOrder;

      const response = await request(app)
        .post('/api/tasks')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should handle Prisma validation errors', async () => {
      const prismaError = new PrismaClientKnownRequestError('Validation failed', {
        code: 'P2002',
        clientVersion: '4.0.0'
      });
      mockTaskService.createTask.mockRejectedValue(prismaError);

      const response = await request(app)
        .post('/api/tasks')
        .send(validTaskData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid task data');
    });

    it('should handle general errors', async () => {
      mockTaskService.createTask.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/tasks')
        .send(validTaskData);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to create task');
    });
  });

  describe('GET /', () => {
    it('should get user tasks with default parameters', async () => {
      const mockTasks = [{ id: 'task-1', title: 'Task 1' }];
      mockTaskService.getTasksByUserId.mockResolvedValue(mockTasks as any);

      const response = await request(app).get('/api/tasks');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTasks);
      expect(mockTaskService.getTasksByUserId).toHaveBeenCalledWith(
        mockUser.id,
        {
          skip: 0,
          take: 100,
          status: undefined,
          startDate: undefined,
          endDate: undefined
        }
      );
    });

    it('should get user tasks with query parameters', async () => {
      const mockTasks = [{ id: 'task-1', title: 'Task 1' }];
      mockTaskService.getTasksByUserId.mockResolvedValue(mockTasks as any);

      const response = await request(app)
        .get('/api/tasks')
        .query({
          skip: '10',
          take: '20',
          status: 'incomplete',
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTasks);
      expect(mockTaskService.getTasksByUserId).toHaveBeenCalledWith(
        mockUser.id,
        {
          skip: 10,
          take: 20,
          status: 'incomplete',
          startDate: expect.any(Date),
          endDate: expect.any(Date)
        }
      );
    });

    it('should handle service errors', async () => {
      mockTaskService.getTasksByUserId.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/tasks');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch tasks');
    });
  });

  describe('GET /count', () => {
    it('should get task count with default parameters', async () => {
      mockTaskService.getTaskCount.mockResolvedValue(5);

      const response = await request(app).get('/api/tasks/count');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ count: 5 });
      expect(mockTaskService.getTaskCount).toHaveBeenCalledWith(
        mockUser.id,
        {
          status: undefined,
          startDate: undefined,
          endDate: undefined
        }
      );
    });

    it('should get task count with query parameters', async () => {
      mockTaskService.getTaskCount.mockResolvedValue(3);

      const response = await request(app)
        .get('/api/tasks/count')
        .query({
          status: 'complete',
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ count: 3 });
      expect(mockTaskService.getTaskCount).toHaveBeenCalledWith(
        mockUser.id,
        {
          status: 'complete',
          startDate: expect.any(Date),
          endDate: expect.any(Date)
        }
      );
    });

    it('should handle service errors', async () => {
      mockTaskService.getTaskCount.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/tasks/count');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch task count');
    });
  });

  describe('GET /:date', () => {
    it('should get tasks by date', async () => {
      const mockTasks = [{ id: 'task-1', title: 'Task 1' }];
      mockTaskService.getTasksByUserIdAndDate.mockResolvedValue(mockTasks as any);

      const response = await request(app).get('/api/tasks/2024-01-01');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTasks);
      expect(mockTaskService.getTasksByUserIdAndDate).toHaveBeenCalledWith(
        mockUser.id,
        expect.any(Date)
      );
    });

    it('should return 500 when date parameter is missing', async () => {
      const response = await request(app).get('/api/tasks/');

      expect(response.status).toBe(500); // Express returns 500 for this route structure
    });

    it('should return 400 for invalid date format', async () => {
      // Mock createPTDate to return invalid date
      const { createPTDate } = require('../utils/timezoneUtils');
      createPTDate.mockReturnValue(new Date('invalid'));

      const response = await request(app).get('/api/tasks/invalid-date');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid date format');
    });

    it('should handle service errors', async () => {
      // Reset the mock to return a valid date first
      const { createPTDate } = require('../utils/timezoneUtils');
      createPTDate.mockReturnValue(new Date('2024-01-01T08:00:00.000Z'));
      
      mockTaskService.getTasksByUserIdAndDate.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/tasks/2024-01-01');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch tasks for the specified date');
    });
  });

  describe('PUT /:id', () => {
    const updateData = {
      title: 'Updated Task',
      status: 'complete'
    };

    it('should update a task successfully', async () => {
      const mockTask = { id: 'task-123', ...updateData };
      mockTaskService.updateTask.mockResolvedValue(mockTask as any);

      const response = await request(app)
        .put('/api/tasks/task-123')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTask);
      expect(mockTaskService.updateTask).toHaveBeenCalledWith(
        'task-123',
        mockUser.id,
        updateData
      );
    });

    it('should update task with dueDate', async () => {
      const updateWithDate = { ...updateData, dueDate: '2024-01-01' };
      const mockTask = { id: 'task-123', ...updateWithDate };
      mockTaskService.updateTask.mockResolvedValue(mockTask as any);

      const response = await request(app)
        .put('/api/tasks/task-123')
        .send(updateWithDate);

      expect(response.status).toBe(200);
      expect(mockTaskService.updateTask).toHaveBeenCalledWith(
        'task-123',
        mockUser.id,
        expect.objectContaining({
          ...updateData,
          dueDate: expect.any(Date)
        })
      );
    });

    it('should return 404 for unauthorized task', async () => {
      mockTaskService.updateTask.mockRejectedValue(new Error('Task not found or unauthorized'));

      const response = await request(app)
        .put('/api/tasks/task-123')
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found or unauthorized');
    });

    it('should handle Prisma validation errors', async () => {
      const prismaError = new PrismaClientKnownRequestError('Validation failed', {
        code: 'P2002',
        clientVersion: '4.0.0'
      });
      mockTaskService.updateTask.mockRejectedValue(prismaError);

      const response = await request(app)
        .put('/api/tasks/task-123')
        .send(updateData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid task data');
    });

    it('should handle general errors', async () => {
      mockTaskService.updateTask.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put('/api/tasks/task-123')
        .send(updateData);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to update task');
    });
  });

  describe('DELETE /:id', () => {
    it('should delete a task successfully', async () => {
      mockTaskService.deleteTask.mockResolvedValue({} as any);

      const response = await request(app).delete('/api/tasks/task-123');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Task deleted successfully');
      expect(mockTaskService.deleteTask).toHaveBeenCalledWith('task-123', mockUser.id);
    });

    it('should return 404 for unauthorized task', async () => {
      mockTaskService.deleteTask.mockRejectedValue(new Error('Task not found or unauthorized'));

      const response = await request(app).delete('/api/tasks/task-123');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found or unauthorized');
    });

    it('should handle general errors', async () => {
      mockTaskService.deleteTask.mockRejectedValue(new Error('Database error'));

      const response = await request(app).delete('/api/tasks/task-123');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to delete task');
    });
  });

  describe('PUT /:id/move', () => {
    const moveData = {
      dueDate: '2024-01-01',
      isRolledOver: true
    };

    it('should move a task successfully', async () => {
      const mockTask = { id: 'task-123', ...moveData };
      mockTaskService.moveTask.mockResolvedValue(mockTask as any);

      const response = await request(app)
        .put('/api/tasks/task-123/move')
        .send(moveData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTask);
      expect(mockTaskService.moveTask).toHaveBeenCalledWith(
        'task-123',
        mockUser.id,
        expect.objectContaining({
          dueDate: expect.any(Date),
          isRolledOver: true
        })
      );
    });

    it('should return 400 when dueDate is missing', async () => {
      const invalidData = { isRolledOver: true };

      const response = await request(app)
        .put('/api/tasks/task-123/move')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('dueDate is required');
    });

    it('should return 404 for unauthorized task', async () => {
      mockTaskService.moveTask.mockRejectedValue(new Error('Task not found or unauthorized'));

      const response = await request(app)
        .put('/api/tasks/task-123/move')
        .send(moveData);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found or unauthorized');
    });

    it('should handle general errors', async () => {
      mockTaskService.moveTask.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put('/api/tasks/task-123/move')
        .send(moveData);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to move task');
    });
  });

  describe('PUT /:id/reorder', () => {
    const reorderData = {
      displayOrder: 5
    };

    it('should reorder a task successfully', async () => {
      const mockTask = { id: 'task-123', displayOrder: 5 };
      mockTaskService.reorderTask.mockResolvedValue(mockTask as any);

      const response = await request(app)
        .put('/api/tasks/task-123/reorder')
        .send(reorderData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTask);
      expect(mockTaskService.reorderTask).toHaveBeenCalledWith(
        'task-123',
        mockUser.id,
        { displayOrder: 5 }
      );
    });

    it('should handle string displayOrder', async () => {
      const mockTask = { id: 'task-123', displayOrder: 5 };
      mockTaskService.reorderTask.mockResolvedValue(mockTask as any);

      const response = await request(app)
        .put('/api/tasks/task-123/reorder')
        .send({ displayOrder: '5' });

      expect(response.status).toBe(200);
      expect(mockTaskService.reorderTask).toHaveBeenCalledWith(
        'task-123',
        mockUser.id,
        { displayOrder: 5 }
      );
    });

    it('should return 400 when displayOrder is missing', async () => {
      const response = await request(app)
        .put('/api/tasks/task-123/reorder')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('displayOrder is required');
    });

    it('should return 404 for unauthorized task', async () => {
      mockTaskService.reorderTask.mockRejectedValue(new Error('Task not found or unauthorized'));

      const response = await request(app)
        .put('/api/tasks/task-123/reorder')
        .send(reorderData);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found or unauthorized');
    });

    it('should handle general errors', async () => {
      mockTaskService.reorderTask.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put('/api/tasks/task-123/reorder')
        .send(reorderData);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to reorder task');
    });
  });
});