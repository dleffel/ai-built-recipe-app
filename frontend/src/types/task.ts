/**
 * Centralized task type definitions
 * These types are used across the frontend application for type safety
 */

/**
 * Task category options
 */
export type TaskCategory = 'Roo Vet' | 'Roo Code' | 'Personal';

/**
 * Task status options
 */
export type TaskStatus = 'complete' | 'incomplete';

/**
 * Array of all valid task categories for iteration/validation
 */
export const TASK_CATEGORIES: readonly TaskCategory[] = ['Roo Vet', 'Roo Code', 'Personal'] as const;

/**
 * Array of all valid task statuses for iteration/validation
 */
export const TASK_STATUSES: readonly TaskStatus[] = ['complete', 'incomplete'] as const;

export interface DragTask {
  id: string;
  dayKey: string;
  originalIndex: number;
}

export interface TaskMoveResult {
  taskId: string;
  newDayKey: string;
  newIndex: number;
}