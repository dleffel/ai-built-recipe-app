import { prisma as defaultPrisma } from '../lib/prisma';
import type { Task, PrismaClient, Prisma } from '@prisma/client';

export interface CreateTaskDTO {
  title: string;
  status: string; // "complete" or "incomplete"
  dueDate: Date;
  category: string; // "Roo Vet", "Roo Code", "Personal"
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

export class TaskService {
  static prisma: PrismaClient = defaultPrisma;

  static resetPrisma() {
    this.prisma = defaultPrisma;
  }

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
  }): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: {
        userId,
        status: options?.status
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: [
        { dueDate: 'asc' },
        { displayOrder: 'asc' }
      ]
    });
  }

  /**
   * Get tasks for a user on a specific date
   */
  static async getTasksByUserIdAndDate(userId: string, date: Date): Promise<Task[]> {
    // Create start and end of the day for the given date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

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

    return this.prisma.task.update({
      where: { id },
      data: {
        dueDate: data.dueDate,
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
    // Create start and end of the day for the given date
    const startOfDay = new Date(fromDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(fromDate);
    endOfDay.setHours(23, 59, 59, 999);

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
    const targetStartOfDay = new Date(toDate);
    targetStartOfDay.setHours(0, 0, 0, 0);
    
    const targetEndOfDay = new Date(toDate);
    targetEndOfDay.setHours(23, 59, 59, 999);
    
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
    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    // Find all incomplete tasks for yesterday
    return this.prisma.task.findMany({
      where: {
        status: 'incomplete',
        dueDate: {
          gte: yesterday,
          lte: endOfYesterday
        }
      }
    });
  }
}