import { todoApi, Task, CreateTaskDTO, UpdateTaskDTO, MoveTaskDTO, ReorderTaskDTO } from '../services/todoApi';
import api from '../services/api';
import { createPTDate } from '../utils/timezoneUtils';

// Mock the api module
jest.mock('../services/api');
const mockApi = api as jest.Mocked<typeof api>;

// Mock timezone utils
jest.mock('../utils/timezoneUtils');
const mockCreatePTDate = createPTDate as jest.MockedFunction<typeof createPTDate>;

describe('todoApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for createPTDate
    mockCreatePTDate.mockImplementation((date) => new Date(date));
  });

  describe('fetchTasks', () => {
    const mockTasks: Task[] = [
      {
        id: 'task-1',
        title: 'Test Task 1',
        status: 'incomplete',
        dueDate: '2024-01-01T00:00:00.000Z',
        category: 'Personal',
        isPriority: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        completedAt: null,
        isRolledOver: false,
        displayOrder: 1,
        userId: 'user-1'
      },
      {
        id: 'task-2',
        title: 'Test Task 2',
        status: 'complete',
        dueDate: '2024-01-02T00:00:00.000Z',
        category: 'Roo Code',
        isPriority: true,
        createdAt: '2024-01-02T00:00:00.000Z',
        completedAt: '2024-01-02T12:00:00.000Z',
        isRolledOver: false,
        displayOrder: 2,
        userId: 'user-1'
      }
    ];

    it('should fetch tasks without options', async () => {
      mockApi.get.mockResolvedValue({ data: mockTasks });

      const result = await todoApi.fetchTasks();

      expect(mockApi.get).toHaveBeenCalledWith('/api/tasks');
      expect(result).toEqual(mockTasks);
    });

    it('should fetch tasks with all options', async () => {
      mockApi.get.mockResolvedValue({ data: mockTasks });

      const options = {
        status: 'incomplete',
        skip: 10,
        take: 20,
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };

      const result = await todoApi.fetchTasks(options);

      expect(mockApi.get).toHaveBeenCalledWith('/api/tasks?status=incomplete&skip=10&take=20&startDate=2024-01-01&endDate=2024-01-31');
      expect(result).toEqual(mockTasks);
    });

    it('should fetch tasks with partial options', async () => {
      mockApi.get.mockResolvedValue({ data: mockTasks });

      const options = {
        status: 'complete',
        take: 50
      };

      const result = await todoApi.fetchTasks(options);

      expect(mockApi.get).toHaveBeenCalledWith('/api/tasks?status=complete&take=50');
      expect(result).toEqual(mockTasks);
    });

    it('should filter out undefined options', async () => {
      mockApi.get.mockResolvedValue({ data: mockTasks });

      const options = {
        status: 'incomplete',
        skip: undefined,
        take: 20,
        startDate: undefined,
        endDate: '2024-01-31'
      };

      const result = await todoApi.fetchTasks(options);

      expect(mockApi.get).toHaveBeenCalledWith('/api/tasks?status=incomplete&take=20&endDate=2024-01-31');
      expect(result).toEqual(mockTasks);
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      mockApi.get.mockRejectedValue(error);

      await expect(todoApi.fetchTasks()).rejects.toThrow('API Error');
    });
  });

  describe('fetchTasksByDate', () => {
    const mockTasks: Task[] = [
      {
        id: 'task-1',
        title: 'Daily Task',
        status: 'incomplete',
        dueDate: '2024-01-01T00:00:00.000Z',
        category: 'Personal',
        isPriority: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        completedAt: null,
        isRolledOver: false,
        displayOrder: 1,
        userId: 'user-1'
      }
    ];

    it('should fetch tasks by date', async () => {
      const testDate = new Date('2024-01-01');
      const ptDate = new Date('2024-01-01T08:00:00.000Z'); // PT timezone
      mockCreatePTDate.mockReturnValue(ptDate);
      mockApi.get.mockResolvedValue({ data: mockTasks });

      const result = await todoApi.fetchTasksByDate(testDate);

      expect(mockCreatePTDate).toHaveBeenCalledWith(testDate);
      expect(mockApi.get).toHaveBeenCalledWith('/api/tasks/2024-01-01');
      expect(result).toEqual(mockTasks);
    });

    it('should handle timezone conversion correctly', async () => {
      const testDate = new Date('2024-12-25T15:30:00.000Z');
      const ptDate = new Date('2024-12-25T07:30:00.000Z'); // PT timezone
      mockCreatePTDate.mockReturnValue(ptDate);
      mockApi.get.mockResolvedValue({ data: mockTasks });

      const result = await todoApi.fetchTasksByDate(testDate);

      expect(mockCreatePTDate).toHaveBeenCalledWith(testDate);
      expect(mockApi.get).toHaveBeenCalledWith('/api/tasks/2024-12-25');
      expect(result).toEqual(mockTasks);
    });

    it('should handle API errors', async () => {
      const testDate = new Date('2024-01-01');
      const ptDate = new Date('2024-01-01T08:00:00.000Z');
      mockCreatePTDate.mockReturnValue(ptDate);
      const error = new Error('API Error');
      mockApi.get.mockRejectedValue(error);

      await expect(todoApi.fetchTasksByDate(testDate)).rejects.toThrow('API Error');
    });
  });

  describe('createTask', () => {
    const mockTask: Task = {
      id: 'task-1',
      title: 'New Task',
      status: 'incomplete',
      dueDate: '2024-01-01T08:00:00.000Z',
      category: 'Personal',
      isPriority: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      completedAt: null,
      isRolledOver: false,
      displayOrder: 1,
      userId: 'user-1'
    };

    it('should create a task successfully', async () => {
      const createTaskDTO: CreateTaskDTO = {
        title: 'New Task',
        status: 'incomplete',
        dueDate: '2024-01-01',
        category: 'Personal',
        isPriority: false,
        displayOrder: 1,
        isRolledOver: false
      };

      const ptDate = new Date('2024-01-01T08:00:00.000Z');
      mockCreatePTDate.mockReturnValue(ptDate);
      mockApi.post.mockResolvedValue({ data: mockTask });

      const result = await todoApi.createTask(createTaskDTO);

      expect(mockCreatePTDate).toHaveBeenCalledWith('2024-01-01');
      expect(mockApi.post).toHaveBeenCalledWith('/api/tasks', {
        ...createTaskDTO,
        dueDate: ptDate.toISOString()
      });
      expect(result).toEqual(mockTask);
    });

    it('should create a task with minimal data', async () => {
      const createTaskDTO: CreateTaskDTO = {
        title: 'Minimal Task',
        status: 'incomplete',
        dueDate: '2024-01-01',
        category: 'Roo Code',
        displayOrder: 1
      };

      const ptDate = new Date('2024-01-01T08:00:00.000Z');
      mockCreatePTDate.mockReturnValue(ptDate);
      mockApi.post.mockResolvedValue({ data: mockTask });

      const result = await todoApi.createTask(createTaskDTO);

      expect(mockCreatePTDate).toHaveBeenCalledWith('2024-01-01');
      expect(mockApi.post).toHaveBeenCalledWith('/api/tasks', {
        ...createTaskDTO,
        dueDate: ptDate.toISOString()
      });
      expect(result).toEqual(mockTask);
    });

    it('should handle API errors', async () => {
      const createTaskDTO: CreateTaskDTO = {
        title: 'New Task',
        status: 'incomplete',
        dueDate: '2024-01-01',
        category: 'Personal',
        displayOrder: 1
      };

      const ptDate = new Date('2024-01-01T08:00:00.000Z');
      mockCreatePTDate.mockReturnValue(ptDate);
      const error = new Error('API Error');
      mockApi.post.mockRejectedValue(error);

      await expect(todoApi.createTask(createTaskDTO)).rejects.toThrow('API Error');
    });
  });

  describe('updateTask', () => {
    const mockTask: Task = {
      id: 'task-1',
      title: 'Updated Task',
      status: 'complete',
      dueDate: '2024-01-02T08:00:00.000Z',
      category: 'Roo Vet',
      isPriority: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      completedAt: '2024-01-02T12:00:00.000Z',
      isRolledOver: false,
      displayOrder: 1,
      userId: 'user-1'
    };

    it('should update a task without dueDate', async () => {
      const updateTaskDTO: UpdateTaskDTO = {
        title: 'Updated Task',
        status: 'complete',
        isPriority: true
      };

      mockApi.put.mockResolvedValue({ data: mockTask });

      const result = await todoApi.updateTask('task-1', updateTaskDTO);

      expect(mockApi.put).toHaveBeenCalledWith('/api/tasks/task-1', updateTaskDTO);
      expect(result).toEqual(mockTask);
      expect(mockCreatePTDate).not.toHaveBeenCalled();
    });

    it('should update a task with dueDate', async () => {
      const updateTaskDTO: UpdateTaskDTO = {
        title: 'Updated Task',
        status: 'complete',
        dueDate: '2024-01-02',
        isPriority: true
      };

      const ptDate = new Date('2024-01-02T08:00:00.000Z');
      mockCreatePTDate.mockReturnValue(ptDate);
      mockApi.put.mockResolvedValue({ data: mockTask });

      const result = await todoApi.updateTask('task-1', updateTaskDTO);

      expect(mockCreatePTDate).toHaveBeenCalledWith('2024-01-02');
      expect(mockApi.put).toHaveBeenCalledWith('/api/tasks/task-1', {
        ...updateTaskDTO,
        dueDate: ptDate.toISOString()
      });
      expect(result).toEqual(mockTask);
    });

    it('should handle partial updates', async () => {
      const updateTaskDTO: UpdateTaskDTO = {
        status: 'complete'
      };

      mockApi.put.mockResolvedValue({ data: mockTask });

      const result = await todoApi.updateTask('task-1', updateTaskDTO);

      expect(mockApi.put).toHaveBeenCalledWith('/api/tasks/task-1', updateTaskDTO);
      expect(result).toEqual(mockTask);
    });

    it('should handle API errors', async () => {
      const updateTaskDTO: UpdateTaskDTO = {
        title: 'Updated Task'
      };

      const error = new Error('API Error');
      mockApi.put.mockRejectedValue(error);

      await expect(todoApi.updateTask('task-1', updateTaskDTO)).rejects.toThrow('API Error');
    });
  });

  describe('deleteTask', () => {
    it('should delete a task successfully', async () => {
      mockApi.delete.mockResolvedValue({});

      await todoApi.deleteTask('task-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/api/tasks/task-1');
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      mockApi.delete.mockRejectedValue(error);

      await expect(todoApi.deleteTask('task-1')).rejects.toThrow('API Error');
    });
  });

  describe('moveTask', () => {
    const mockTask: Task = {
      id: 'task-1',
      title: 'Moved Task',
      status: 'incomplete',
      dueDate: '2024-01-02T08:00:00.000Z',
      category: 'Personal',
      isPriority: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      completedAt: null,
      isRolledOver: true,
      displayOrder: 1,
      userId: 'user-1'
    };

    it('should move a task successfully', async () => {
      const moveTaskDTO: MoveTaskDTO = {
        dueDate: '2024-01-02',
        isRolledOver: true
      };

      const ptDate = new Date('2024-01-02T08:00:00.000Z');
      mockCreatePTDate.mockReturnValue(ptDate);
      mockApi.put.mockResolvedValue({ data: mockTask });

      const result = await todoApi.moveTask('task-1', moveTaskDTO);

      expect(mockCreatePTDate).toHaveBeenCalledWith('2024-01-02');
      expect(mockApi.put).toHaveBeenCalledWith('/api/tasks/task-1/move', {
        ...moveTaskDTO,
        dueDate: ptDate.toISOString()
      });
      expect(result).toEqual(mockTask);
    });

    it('should move a task without isRolledOver flag', async () => {
      const moveTaskDTO: MoveTaskDTO = {
        dueDate: '2024-01-02'
      };

      const ptDate = new Date('2024-01-02T08:00:00.000Z');
      mockCreatePTDate.mockReturnValue(ptDate);
      mockApi.put.mockResolvedValue({ data: mockTask });

      const result = await todoApi.moveTask('task-1', moveTaskDTO);

      expect(mockCreatePTDate).toHaveBeenCalledWith('2024-01-02');
      expect(mockApi.put).toHaveBeenCalledWith('/api/tasks/task-1/move', {
        ...moveTaskDTO,
        dueDate: ptDate.toISOString()
      });
      expect(result).toEqual(mockTask);
    });

    it('should handle API errors and log them', async () => {
      const moveTaskDTO: MoveTaskDTO = {
        dueDate: '2024-01-02',
        isRolledOver: true
      };

      const ptDate = new Date('2024-01-02T08:00:00.000Z');
      mockCreatePTDate.mockReturnValue(ptDate);
      const error = new Error('API Error');
      mockApi.put.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(todoApi.moveTask('task-1', moveTaskDTO)).rejects.toThrow('API Error');

      expect(consoleSpy).toHaveBeenCalledWith('todoApi.moveTask error:', error);
      consoleSpy.mockRestore();
    });
  });

  describe('reorderTask', () => {
    const mockTask: Task = {
      id: 'task-1',
      title: 'Reordered Task',
      status: 'incomplete',
      dueDate: '2024-01-01T08:00:00.000Z',
      category: 'Personal',
      isPriority: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      completedAt: null,
      isRolledOver: false,
      displayOrder: 5,
      userId: 'user-1'
    };

    it('should reorder a task successfully', async () => {
      const reorderTaskDTO: ReorderTaskDTO = {
        displayOrder: 5
      };

      mockApi.put.mockResolvedValue({ data: mockTask });

      const result = await todoApi.reorderTask('task-1', reorderTaskDTO);

      expect(mockApi.put).toHaveBeenCalledWith('/api/tasks/task-1/reorder', reorderTaskDTO);
      expect(result).toEqual(mockTask);
    });

    it('should handle API errors', async () => {
      const reorderTaskDTO: ReorderTaskDTO = {
        displayOrder: 5
      };

      const error = new Error('API Error');
      mockApi.put.mockRejectedValue(error);

      await expect(todoApi.reorderTask('task-1', reorderTaskDTO)).rejects.toThrow('API Error');
    });
  });

  describe('getTaskCount', () => {
    it('should get task count without options', async () => {
      mockApi.get.mockResolvedValue({ data: { count: 10 } });

      const result = await todoApi.getTaskCount();

      expect(mockApi.get).toHaveBeenCalledWith('/api/tasks/count');
      expect(result).toBe(10);
    });

    it('should get task count with all options', async () => {
      mockApi.get.mockResolvedValue({ data: { count: 5 } });

      const options = {
        status: 'incomplete',
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };

      const result = await todoApi.getTaskCount(options);

      expect(mockApi.get).toHaveBeenCalledWith('/api/tasks/count?status=incomplete&startDate=2024-01-01&endDate=2024-01-31');
      expect(result).toBe(5);
    });

    it('should get task count with partial options', async () => {
      mockApi.get.mockResolvedValue({ data: { count: 3 } });

      const options = {
        status: 'complete'
      };

      const result = await todoApi.getTaskCount(options);

      expect(mockApi.get).toHaveBeenCalledWith('/api/tasks/count?status=complete');
      expect(result).toBe(3);
    });

    it('should filter out undefined options', async () => {
      mockApi.get.mockResolvedValue({ data: { count: 7 } });

      const options = {
        status: undefined,
        startDate: '2024-01-01',
        endDate: undefined
      };

      const result = await todoApi.getTaskCount(options);

      expect(mockApi.get).toHaveBeenCalledWith('/api/tasks/count?startDate=2024-01-01');
      expect(result).toBe(7);
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      mockApi.get.mockRejectedValue(error);

      await expect(todoApi.getTaskCount()).rejects.toThrow('API Error');
    });
  });
});