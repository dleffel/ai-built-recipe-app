/**
 * Centralized task type definitions for the backend
 * These types are used across the backend application for type safety
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
 * Array of all valid task categories for validation
 */
export const TASK_CATEGORIES: readonly TaskCategory[] = ['Roo Vet', 'Roo Code', 'Personal'] as const;

/**
 * Array of all valid task statuses for validation
 */
export const TASK_STATUSES: readonly TaskStatus[] = ['complete', 'incomplete'] as const;

/**
 * Type guard to check if a string is a valid TaskCategory
 */
export function isValidTaskCategory(value: string): value is TaskCategory {
  return TASK_CATEGORIES.includes(value as TaskCategory);
}

/**
 * Type guard to check if a string is a valid TaskStatus
 */
export function isValidTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus);
}