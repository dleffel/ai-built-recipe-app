import api from './api';
import { createPTDate } from '../utils/timezoneUtils';

export interface Task {
  id: string;
  title: string;
  status: 'complete' | 'incomplete';
  dueDate: string;
  category: 'Roo Vet' | 'Roo Code' | 'Personal';
  isPriority: boolean;
  createdAt: string;
  completedAt: string | null;
  isRolledOver: boolean;
  displayOrder: number;
  userId: string;
}

export interface CreateTaskDTO {
  title: string;
  status: 'complete' | 'incomplete';
  dueDate: string;
  category: 'Roo Vet' | 'Roo Code' | 'Personal';
  isPriority?: boolean;
  displayOrder: number;
  isRolledOver?: boolean;
}

export interface UpdateTaskDTO extends Partial<CreateTaskDTO> {}

export interface MoveTaskDTO {
  dueDate: string;
  isRolledOver?: boolean;
}

export interface ReorderTaskDTO {
  displayOrder: number;
}

export interface BulkMoveDTO {
  taskIds: string[];
  targetDate: string;
}

export interface BulkMoveResponse {
  success: boolean;
  movedCount: number;
  tasks: Task[];
  errors?: Array<{ taskId: string; error: string }>;
}

export const todoApi = {
  /**
   * Fetch all tasks for the current user
   */
  async fetchTasks(options?: {
    status?: string,
    skip?: number,
    take?: number,
    startDate?: string,
    endDate?: string
  }): Promise<Task[]> {
    const queryParams = options ? new URLSearchParams(
      Object.entries(options)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)])
    ).toString() : '';
    
    const url = `/api/tasks${queryParams ? `?${queryParams}` : ''}`;
    const response = await api.get<Task[]>(url);
    return response.data;
  },

  /**
   * Fetch tasks for a specific date
   */
  async fetchTasksByDate(date: Date): Promise<Task[]> {
    // Use our timezone utility to ensure the date is in PT timezone
    const ptDate = createPTDate(date);
    const formattedDate = ptDate.toISOString().split('T')[0];
    
    const response = await api.get<Task[]>(`/api/tasks/${formattedDate}`);
    return response.data;
  },

  /**
   * Create a new task
   */
  async createTask(task: CreateTaskDTO): Promise<Task> {
    // Use our timezone utility to ensure the date is in PT timezone
    const ptDate = createPTDate(task.dueDate);
    
    const ptTask = {
      ...task,
      dueDate: ptDate.toISOString()
    };
    
    const response = await api.post<Task>('/api/tasks', ptTask);
    return response.data;
  },

  /**
   * Update an existing task
   */
  async updateTask(id: string, task: UpdateTaskDTO): Promise<Task> {
    // If the task update includes a due date, ensure it's in PT timezone
    const updatedTask = { ...task };
    if (updatedTask.dueDate) {
      const ptDate = createPTDate(updatedTask.dueDate);
      updatedTask.dueDate = ptDate.toISOString();
    }
    
    const response = await api.put<Task>(`/api/tasks/${id}`, updatedTask);
    return response.data;
  },

  /**
   * Delete a task
   */
  async deleteTask(id: string): Promise<void> {
    await api.delete(`/api/tasks/${id}`);
  },

  /**
   * Move a task to a different date
   */
  async moveTask(id: string, moveData: MoveTaskDTO): Promise<Task> {
    // Use our timezone utility to ensure the date is in PT timezone
    const ptDate = createPTDate(moveData.dueDate);
    
    const ptMoveData = {
      ...moveData,
      dueDate: ptDate.toISOString()
    };
    
    try {
      const response = await api.put<Task>(`/api/tasks/${id}/move`, ptMoveData);
      return response.data;
    } catch (error) {
      console.error('todoApi.moveTask error:', error);
      throw error;
    }
  },

  /**
   * Reorder a task within a day
   */
  async reorderTask(id: string, reorderData: ReorderTaskDTO): Promise<Task> {
    const response = await api.put<Task>(`/api/tasks/${id}/reorder`, reorderData);
    return response.data;
  },

  /**
   * Get the total count of tasks with optional filtering
   */
  async getTaskCount(options?: {
    status?: string,
    startDate?: string,
    endDate?: string
  }): Promise<number> {
    const queryParams = options ? new URLSearchParams(
      Object.entries(options)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)])
    ).toString() : '';
    
    const url = `/api/tasks/count${queryParams ? `?${queryParams}` : ''}`;
    const response = await api.get<{ count: number }>(url);
    return response.data.count;
  },

  /**
   * Bulk move multiple tasks to a target date
   */
  async bulkMoveTasks(data: BulkMoveDTO): Promise<BulkMoveResponse> {
    // Use our timezone utility to ensure the date is in PT timezone
    const ptDate = createPTDate(data.targetDate);
    
    const ptData = {
      taskIds: data.taskIds,
      targetDate: ptDate.toISOString()
    };
    
    try {
      const response = await api.post<BulkMoveResponse>('/api/tasks/bulk-move', ptData);
      return response.data;
    } catch (error) {
      console.error('todoApi.bulkMoveTasks error:', error);
      throw error;
    }
  }
};