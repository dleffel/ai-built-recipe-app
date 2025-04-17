import api from './api';

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

export const todoApi = {
  /**
   * Fetch all tasks for the current user
   */
  async fetchTasks(options?: { status?: string }): Promise<Task[]> {
    const queryParams = options ? new URLSearchParams(options as Record<string, string>).toString() : '';
    const url = `/api/tasks${queryParams ? `?${queryParams}` : ''}`;
    const response = await api.get<Task[]>(url);
    return response.data;
  },

  /**
   * Fetch tasks for a specific date
   */
  async fetchTasksByDate(date: Date): Promise<Task[]> {
    const formattedDate = date.toISOString().split('T')[0];
    const response = await api.get<Task[]>(`/api/tasks/${formattedDate}`);
    return response.data;
  },

  /**
   * Create a new task
   */
  async createTask(task: CreateTaskDTO): Promise<Task> {
    const response = await api.post<Task>('/api/tasks', task);
    return response.data;
  },

  /**
   * Update an existing task
   */
  async updateTask(id: string, task: UpdateTaskDTO): Promise<Task> {
    const response = await api.put<Task>(`/api/tasks/${id}`, task);
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
    const response = await api.put<Task>(`/api/tasks/${id}/move`, moveData);
    return response.data;
  },

  /**
   * Reorder a task within a day
   */
  async reorderTask(id: string, reorderData: ReorderTaskDTO): Promise<Task> {
    const response = await api.put<Task>(`/api/tasks/${id}/reorder`, reorderData);
    return response.data;
  }
};