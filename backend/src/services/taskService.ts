import type { Task, Prisma } from '@prisma/client';
import { getStartOfDayPT, getEndOfDayPT, createPTDate, toDateStringPT } from '../utils/timezoneUtils';
import { BaseService } from './BaseService';
import { TaskCategory, TaskStatus } from '../types/task';

export interface CreateTaskDTO {
  title: string;
  status: TaskStatus;
  dueDate: Date;
  category: TaskCategory;
  isPriority?: boolean;
  displayOrder: number;
  isRolledOver?: boolean;
  completedAt?: Date | null;
}

export interface UpdateTaskDTO extends Partial<CreateTaskDTO> {}

export interface MoveTaskDTO {
  dueDate: Date;
  isRolledOver?: boolean;
}

export interface ReorderTaskDTO {
  displayOrder: number;
}

export interface BulkMoveTasksDTO {
  taskIds: string[];
  targetDate: Date;
}

export interface BulkMoveResult {
  tasks: Task[];
  errors: Array<{ taskId: string; error: string }>;
}

export class TaskService extends BaseService {
  /**
   * Create a new task
   */
  static async createTask(userId: string, data: CreateTaskDTO): Promise<Task> {
    return this.prisma.task.create({
      data: {
        ...data,
        userId
      }
    });
  }

  /**
   * Find a task by ID
   */
  static async findById(id: string): Promise<Task | null> {
    return this.prisma.task.findUnique({
      where: { id }
    });
  }

  /**
   * Get all tasks for a user
   */
  static async getTasksByUserId(userId: string, options?: {
    skip?: number;
    take?: number;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Task[]> {
    const whereClause: Prisma.TaskWhereInput = { userId };
    
    if (options?.status) {
      whereClause.status = options.status;
    }
    
    if (options?.startDate || options?.endDate) {
      whereClause.dueDate = {};
      
      if (options?.startDate) {
        whereClause.dueDate.gte = options.startDate;
      }
      
      if (options?.endDate) {
        whereClause.dueDate.lte = options.endDate;
      }
    }
    
    return this.prisma.task.findMany({
      where: whereClause,
      skip: options?.skip,
      take: options?.take,
      orderBy: [
        { dueDate: 'asc' },
        { displayOrder: 'asc' }
      ]
    });
  }

  /**
   * Get task count for a user with optional filters
   */
  static async getTaskCount(userId: string, options?: {
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<number> {
    const whereClause: Prisma.TaskWhereInput = { userId };
    
    if (options?.status) {
      whereClause.status = options.status;
    }
    
    if (options?.startDate || options?.endDate) {
      whereClause.dueDate = {};
      
      if (options?.startDate) {
        whereClause.dueDate.gte = options.startDate;
      }
      
      if (options?.endDate) {
        whereClause.dueDate.lte = options.endDate;
      }
    }
    
    return this.prisma.task.count({ where: whereClause });
  }

  /**
   * Get tasks for a user on a specific date
   */
  static async getTasksByUserIdAndDate(userId: string, date: Date): Promise<Task[]> {
    // Use timezone utility to get start and end of day in PT timezone
    const startOfDay = getStartOfDayPT(date);
    const endOfDay = getEndOfDayPT(date);

    return this.prisma.task.findMany({
      where: {
        userId,
        dueDate: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      orderBy: {
        displayOrder: 'asc'
      }
    });
  }

  /**
   * Update a task (verifying ownership)
   */
  static async updateTask(id: string, userId: string, data: UpdateTaskDTO): Promise<Task> {
    // First verify ownership
    const task = await TaskService.findById(id);
    if (!task || task.userId !== userId) {
      throw new Error('Task not found or unauthorized');
    }

    // If status is being updated to "complete", set completedAt
    const updateData: any = { ...data };
    if (data.status === 'complete' && !data.completedAt) {
      updateData.completedAt = new Date();
      console.log('Task completed:', {
        taskId: id,
        originalDueDate: task.dueDate.toISOString(),
        completedAt: updateData.completedAt.toISOString(),
        serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        serverTime: new Date().toISOString()
      });
    } else if (data.status === 'incomplete') {
      updateData.completedAt = null;
    }

    return this.prisma.task.update({
      where: { id },
      data: updateData
    });
  }

  /**
   * Delete a task (verifying ownership)
   */
  static async deleteTask(id: string, userId: string): Promise<Task> {
    // First verify ownership
    const task = await TaskService.findById(id);
    if (!task || task.userId !== userId) {
      throw new Error('Task not found or unauthorized');
    }

    return this.prisma.task.delete({
      where: { id }
    });
  }

  /**
   * Move a task to a different date (verifying ownership)
   */
  static async moveTask(id: string, userId: string, data: MoveTaskDTO): Promise<Task> {
    // First verify ownership
    const task = await TaskService.findById(id);
    if (!task || task.userId !== userId) {
      throw new Error('Task not found or unauthorized');
    }

    // When manually moving a task, clear the rolled over flag unless explicitly set
    const isRolledOver = data.isRolledOver !== undefined ? data.isRolledOver : false;

    // Use timezone utility to create a date in PT timezone
    const ptDate = createPTDate(data.dueDate);
    
    console.log('Task move timezone conversion:', {
      incomingDate: data.dueDate,
      ptDateISO: ptDate.toISOString()
    });

    return this.prisma.task.update({
      where: { id },
      data: {
        dueDate: ptDate,
        isRolledOver
      }
    });
  }

  /**
   * Reorder a task within a day (verifying ownership)
   */
  static async reorderTask(id: string, userId: string, data: ReorderTaskDTO): Promise<Task> {
    // First verify ownership
    const task = await TaskService.findById(id);
    if (!task || task.userId !== userId) {
      throw new Error('Task not found or unauthorized');
    }

    return this.prisma.task.update({
      where: { id },
      data: {
        displayOrder: data.displayOrder
      }
    });
  }

  /**
   * Roll over incomplete tasks from one day to the next
   * Updates incomplete tasks to move them to the next day instead of creating copies
   */
  static async rollOverTasks(fromDate: Date, toDate: Date): Promise<number> {
    // Use timezone utility to get start and end of day in PT timezone
    const startOfDay = getStartOfDayPT(fromDate);
    const endOfDay = getEndOfDayPT(fromDate);

    // Find all incomplete tasks for the fromDate
    const incompleteTasks = await this.prisma.task.findMany({
      where: {
        status: 'incomplete',
        dueDate: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });
    
    if (incompleteTasks.length === 0) {
      return 0;
    }

    // Get the highest display order for the target date to ensure new tasks are added at the end
    // Use timezone utility for target date as well
    const targetStartOfDay = getStartOfDayPT(toDate);
    const targetEndOfDay = getEndOfDayPT(toDate);
    
    const tasksForTargetDate = await this.prisma.task.findMany({
      where: {
        dueDate: {
          gte: targetStartOfDay,
          lte: targetEndOfDay
        }
      },
      orderBy: {
        displayOrder: 'desc'
      },
      take: 1
    });

    let baseDisplayOrder = tasksForTargetDate.length > 0
      ? tasksForTargetDate[0].displayOrder + 10
      : 0;

    // Update incomplete tasks to move them to the next day instead of creating copies
    const updatePromises = incompleteTasks.map((task, index) => {
      const displayOrder = baseDisplayOrder + (index * 10);
      return this.prisma.task.update({
        where: { id: task.id },
        data: {
          dueDate: toDate,
          isRolledOver: true,
          displayOrder
        }
      });
    });

    const updatedTasks = await Promise.all(updatePromises);
    return updatedTasks.length;
  }

  /**
   * Get tasks that need to be rolled over (incomplete tasks from yesterday)
   */
  static async getTasksToRollOver(): Promise<Task[]> {
    // Get today's date in PT timezone using our utility
    const today = createPTDate(new Date());
    
    // Get yesterday by subtracting 1 day
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Get start and end of yesterday in PT timezone
    const startOfYesterday = getStartOfDayPT(yesterday);
    const endOfYesterday = getEndOfDayPT(yesterday);
    
    // Find all incomplete tasks for yesterday
    return this.prisma.task.findMany({
      where: {
        status: 'incomplete',
        dueDate: {
          gte: startOfYesterday,
          lte: endOfYesterday
        }
      }
    });
  }

  /**
   * Bulk move multiple tasks to a target date (verifying ownership for each)
   */
  static async bulkMoveTasks(userId: string, data: BulkMoveTasksDTO): Promise<BulkMoveResult> {
    const { taskIds, targetDate } = data;
    const tasks: Task[] = [];
    const errors: Array<{ taskId: string; error: string }> = [];

    // Use timezone utility to create a date in PT timezone
    const ptDate = createPTDate(targetDate);

    // Get the highest display order for the target date
    const targetStartOfDay = getStartOfDayPT(ptDate);
    const targetEndOfDay = getEndOfDayPT(ptDate);
    
    const tasksForTargetDate = await this.prisma.task.findMany({
      where: {
        userId,
        dueDate: {
          gte: targetStartOfDay,
          lte: targetEndOfDay
        }
      },
      orderBy: {
        displayOrder: 'desc'
      },
      take: 1
    });

    let baseDisplayOrder = tasksForTargetDate.length > 0
      ? tasksForTargetDate[0].displayOrder + 1000
      : 1000;

    // Process each task
    for (let i = 0; i < taskIds.length; i++) {
      const taskId = taskIds[i];
      try {
        // Verify ownership
        const task = await this.findById(taskId);
        if (!task) {
          errors.push({ taskId, error: 'Task not found' });
          continue;
        }
        if (task.userId !== userId) {
          errors.push({ taskId, error: 'Unauthorized' });
          continue;
        }

        // Update the task
        const updatedTask = await this.prisma.task.update({
          where: { id: taskId },
          data: {
            dueDate: ptDate,
            isRolledOver: false,
            displayOrder: baseDisplayOrder + (i * 1000)
          }
        });

        tasks.push(updatedTask);
      } catch (error) {
        errors.push({
          taskId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { tasks, errors };
  }
}