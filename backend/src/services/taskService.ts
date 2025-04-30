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
    // Fix timezone handling by creating date boundaries in PT timezone
    // Extract the date part in YYYY-MM-DD format
    const dateStr = date.toISOString().split('T')[0];
    
    // Create start and end of day with explicit PT timezone (-07:00)
    // This ensures consistent date boundaries regardless of server timezone
    const startOfDay = new Date(`${dateStr}T00:00:00-07:00`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999-07:00`);

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

    // Fix timezone handling by creating date boundaries in PT timezone
    // Extract the date part in YYYY-MM-DD format from the incoming date
    const dateStr = new Date(data.dueDate).toISOString().split('T')[0];
    
    // Create a date with explicit PT timezone (-07:00)
    const ptDate = new Date(`${dateStr}T00:00:00-07:00`);
    
    console.log('Task move timezone conversion:', {
      incomingDate: data.dueDate,
      extractedDateStr: dateStr,
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
    // Fix timezone handling by creating date boundaries in PT timezone
    // Extract the date part in YYYY-MM-DD format
    const fromDateStr = fromDate.toISOString().split('T')[0];
    
    // Create start and end of day with explicit PT timezone (-07:00)
    const startOfDay = new Date(`${fromDateStr}T00:00:00-07:00`);
    const endOfDay = new Date(`${fromDateStr}T23:59:59.999-07:00`);

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
    // Fix timezone handling for target date as well
    const toDateStr = toDate.toISOString().split('T')[0];
    const targetStartOfDay = new Date(`${toDateStr}T00:00:00-07:00`);
    const targetEndOfDay = new Date(`${toDateStr}T23:59:59.999-07:00`);
    
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
    // Get yesterday's date in PT timezone using DateTimeFormat
    const now = new Date();
    
    // Format the date in PT timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    // Get date parts in PT timezone
    const parts = formatter.formatToParts(now);
    const ptYear = parts.find(part => part.type === 'year')?.value || '';
    const ptMonth = parts.find(part => part.type === 'month')?.value || '';
    const ptDay = parts.find(part => part.type === 'day')?.value || '';
    
    // Create today's date in PT timezone
    const today = new Date(`${ptYear}-${ptMonth}-${ptDay}T00:00:00-07:00`);
    
    // Get yesterday by subtracting 1 day
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Create yesterday's date string in YYYY-MM-DD format
    const yesterdayParts = formatter.formatToParts(yesterday);
    const yesterdayYear = yesterdayParts.find(part => part.type === 'year')?.value || '';
    const yesterdayMonth = yesterdayParts.find(part => part.type === 'month')?.value || '';
    const yesterdayDay = yesterdayParts.find(part => part.type === 'day')?.value || '';
    
    // Create start and end of yesterday in PT timezone
    const startOfYesterday = new Date(`${yesterdayYear}-${yesterdayMonth}-${yesterdayDay}T00:00:00-07:00`);
    const endOfYesterday = new Date(`${yesterdayYear}-${yesterdayMonth}-${yesterdayDay}T23:59:59.999-07:00`);
    
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
}