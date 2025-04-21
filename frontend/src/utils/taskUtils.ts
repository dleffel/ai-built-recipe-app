import { Task } from '../services/todoApi';

// Simple display order calculation for tasks
export const calculateDisplayOrder = (
  prevTask: number | null,
  nextTask: number | null,
  increment: number = 1000
): number => {
  // If no tasks on either side, start with base value
  if (prevTask === null && nextTask === null) return increment;
  
  // If at the beginning
  if (prevTask === null) return Math.floor(nextTask! / 2);
  
  // If at the end
  if (nextTask === null) return prevTask + increment;
  
  // If in the middle, use the average
  return Math.floor((prevTask + nextTask) / 2);
};

// Group tasks by day - optimized version
export const groupTasksByDay = (tasks: Task[]): Record<string, Task[]> => {
  return tasks.reduce((groups: Record<string, Task[]>, task) => {
    const dateKey = new Date(task.dueDate).toISOString().split('T')[0];
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(task);
    return groups;
  }, {});
};

// Sort tasks by display order within their groups
export const sortTaskGroups = (groups: Record<string, Task[]>): Record<string, Task[]> => {
  const sorted: Record<string, Task[]> = {};
  
  Object.keys(groups).forEach(key => {
    sorted[key] = [...groups[key]].sort((a, b) => a.displayOrder - b.displayOrder);
  });
  
  return sorted;
};