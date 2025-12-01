import React, { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react';
import { todoApi, Task, CreateTaskDTO, UpdateTaskDTO, MoveTaskDTO, ReorderTaskDTO, BulkMoveDTO } from '../services/todoApi';
import { groupTasksByDay } from '../utils/taskUtils';
import { createPTDate, toDateStringPT } from '../utils/timezoneUtils';

// Define action types
type TodoAction =
  | { type: 'LOADING' }
  | { type: 'FETCH_SUCCESS', tasks: Task[] }
  | { type: 'FETCH_ERROR', error: string }
  | { type: 'ADD_TASK', task: Task }
  | { type: 'UPDATE_TASK', taskId: string, updates: Partial<Task> }
  | { type: 'DELETE_TASK', taskId: string }
  | { type: 'MOVE_TASK', taskId: string, updates: Partial<Task> }
  | { type: 'APPEND_TASKS', tasks: Task[] }
  | { type: 'BULK_MOVE_TASKS', tasks: Task[] };

// Define state type
interface TodoState {
  tasks: Task[];
  tasksByDay: Record<string, Task[]>;
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: TodoState = {
  tasks: [],
  tasksByDay: {},
  loading: false,
  error: null,
};

// Create reducer function
const todoReducer = (state: TodoState, action: TodoAction): TodoState => {
  switch (action.type) {
    case 'LOADING':
      return { ...state, loading: true, error: null };
      
    case 'FETCH_SUCCESS':
      return {
        ...state,
        tasks: action.tasks,
        tasksByDay: groupTasksByDay(action.tasks),
        loading: false,
        error: null,
      };
      
    case 'FETCH_ERROR':
      return {
        ...state,
        loading: false,
        error: action.error,
      };
      
    case 'ADD_TASK':
      const tasksWithNewTask = [...state.tasks, action.task];
      return {
        ...state,
        tasks: tasksWithNewTask,
        tasksByDay: groupTasksByDay(tasksWithNewTask),
      };
      
    case 'UPDATE_TASK':
      const updatedTasks = state.tasks.map(task => 
        task.id === action.taskId ? { ...task, ...action.updates } : task
      );
      return {
        ...state,
        tasks: updatedTasks,
        tasksByDay: groupTasksByDay(updatedTasks),
      };
      
    case 'DELETE_TASK':
      const remainingTasks = state.tasks.filter(task => task.id !== action.taskId);
      return {
        ...state,
        tasks: remainingTasks,
        tasksByDay: groupTasksByDay(remainingTasks),
      };
      
    case 'MOVE_TASK':
      // Same logic as UPDATE_TASK since moving is just updating dueDate/displayOrder
      const tasksAfterMove = state.tasks.map(task => 
        task.id === action.taskId ? { ...task, ...action.updates } : task
      );
      return {
        ...state,
        tasks: tasksAfterMove,
        tasksByDay: groupTasksByDay(tasksAfterMove),
      };
      
    case 'APPEND_TASKS':
      // Combine existing tasks with new tasks, avoiding duplicates
      const combinedTasks = [...state.tasks];
      action.tasks.forEach(newTask => {
        // Only add if not already in the array
        if (!combinedTasks.some(task => task.id === newTask.id)) {
          combinedTasks.push(newTask);
        }
      });
      
      return {
        ...state,
        tasks: combinedTasks,
        tasksByDay: groupTasksByDay(combinedTasks),
        loading: false,
        error: null,
      };
      
    case 'BULK_MOVE_TASKS':
      // Update multiple tasks at once (for bulk move)
      const taskMap = new Map(action.tasks.map(t => [t.id, t]));
      const tasksAfterBulkMove = state.tasks.map(task =>
        taskMap.has(task.id) ? taskMap.get(task.id)! : task
      );
      return {
        ...state,
        tasks: tasksAfterBulkMove,
        tasksByDay: groupTasksByDay(tasksAfterBulkMove),
      };
      
    default:
      return state;
  }
};

// Create context
const TodoContext = createContext<any>(null);

// Create provider component
export const TodoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(todoReducer, initialState);
  const [loadedDateRanges, setLoadedDateRanges] = useState<Array<{start: string, end: string}>>([]);
  const [hasMorePastTasks, setHasMorePastTasks] = useState<boolean>(true);
  const [hasMoreFutureTasks, setHasMoreFutureTasks] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  
  // Bulk selection state
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isBulkMoving, setIsBulkMoving] = useState<boolean>(false);
  
  // Fetch tasks for a specific date range
  const fetchTasksForDateRange = useCallback(async (startDate: Date, endDate: Date, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      dispatch({ type: 'LOADING' });
    }
    
    try {
      const formattedStartDate = toDateStringPT(startDate);
      const formattedEndDate = toDateStringPT(endDate);
      
      const tasks = await todoApi.fetchTasks({
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        take: 500 // Increased limit for date range
      });
      
      if (append) {
        dispatch({ type: 'APPEND_TASKS', tasks });
      } else {
        dispatch({ type: 'FETCH_SUCCESS', tasks });
      }
      
      // Update loaded date ranges
      setLoadedDateRanges(prev => {
        const newRange = { start: formattedStartDate, end: formattedEndDate };
        return [...prev.filter(range =>
          !(range.start >= formattedStartDate && range.end <= formattedEndDate)
        ), newRange];
      });
      
      // Check if we have more tasks in either direction
      const pastCount = await todoApi.getTaskCount({
        endDate: new Date(startDate.getTime() - 86400000).toISOString().split('T')[0]
      });
      
      const futureCount = await todoApi.getTaskCount({
        startDate: new Date(endDate.getTime() + 86400000).toISOString().split('T')[0]
      });
      
      setHasMorePastTasks(pastCount > 0);
      setHasMoreFutureTasks(futureCount > 0);
    } catch (error: any) {
      dispatch({ type: 'FETCH_ERROR', error: error.message || 'Failed to fetch tasks' });
    } finally {
      setIsLoadingMore(false);
    }
  }, [dispatch]);
  
  // Load more tasks in the past direction
  const loadMorePastTasks = useCallback(async (days: number = 30) => {
    if (!hasMorePastTasks || isLoadingMore) return;
    
    // Find earliest loaded date
    const earliestRange = loadedDateRanges.reduce((earliest, range) =>
      range.start < earliest ? range.start : earliest,
      loadedDateRanges[0]?.start || toDateStringPT(new Date())
    );
    
    const earliestDate = new Date(earliestRange);
    const newStartDate = new Date(earliestDate);
    newStartDate.setDate(newStartDate.getDate() - days);
    
    await fetchTasksForDateRange(newStartDate, new Date(earliestDate.getTime() - 86400000), true);
  }, [hasMorePastTasks, isLoadingMore, loadedDateRanges, fetchTasksForDateRange]);
  
  // Load more tasks in the future direction
  const loadMoreFutureTasks = useCallback(async (days: number = 30) => {
    if (!hasMoreFutureTasks || isLoadingMore) return;
    
    // Find latest loaded date
    const latestRange = loadedDateRanges.reduce((latest, range) =>
      range.end > latest ? range.end : latest,
      loadedDateRanges[0]?.end || toDateStringPT(new Date())
    );
    
    const latestDate = new Date(latestRange);
    const newEndDate = new Date(latestDate);
    newEndDate.setDate(newEndDate.getDate() + days);
    
    await fetchTasksForDateRange(new Date(latestDate.getTime() + 86400000), newEndDate, true);
  }, [hasMoreFutureTasks, isLoadingMore, loadedDateRanges, fetchTasksForDateRange]);
  
  // Fetch tasks with initial date range
  const fetchTasks = useCallback(async () => {
    // Calculate initial date range (e.g., 3 months back, 3 months forward)
    const today = createPTDate(new Date());
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 90); // 3 months back
    
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 90); // 3 months forward
    
    await fetchTasksForDateRange(pastDate, futureDate);
  }, [fetchTasksForDateRange]);
  
  // Create task
  const createTask = useCallback(async (taskData: CreateTaskDTO) => {
    try {
      const newTask = await todoApi.createTask(taskData);
      dispatch({ type: 'ADD_TASK', task: newTask });
      return newTask;
    } catch (error: any) {
      console.error('Error creating task:', error);
      throw error;
    }
  }, []);
  
  // Update task
  const updateTask = useCallback(async (taskId: string, updates: UpdateTaskDTO) => {
    try {
      const updatedTask = await todoApi.updateTask(taskId, updates);
      dispatch({ type: 'UPDATE_TASK', taskId, updates: updatedTask });
      return updatedTask;
    } catch (error: any) {
      console.error('Error updating task:', error);
      throw error;
    }
  }, []);
  
  // Delete task
  const deleteTask = useCallback(async (taskId: string) => {
    try {
      await todoApi.deleteTask(taskId);
      dispatch({ type: 'DELETE_TASK', taskId });
    } catch (error: any) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }, []);
  
  // Move task (change day/position)
  const moveTask = useCallback(async (taskId: string, updates: MoveTaskDTO) => {
    try {
      const updatedTask = await todoApi.moveTask(taskId, updates);
      dispatch({ type: 'MOVE_TASK', taskId, updates: updatedTask });
      return updatedTask;
    } catch (error: any) {
      console.error('Error moving task:', error);
      throw error;
    }
  }, []);
  
  // Reorder task
  const reorderTask = useCallback(async (taskId: string, newDisplayOrder: ReorderTaskDTO) => {
    try {
      const updatedTask = await todoApi.reorderTask(taskId, newDisplayOrder);
      dispatch({ type: 'UPDATE_TASK', taskId, updates: updatedTask });
      return updatedTask;
    } catch (error: any) {
      console.error('Error reordering task:', error);
      throw error;
    }
  }, []);
  
  // Enter select mode
  const enterSelectMode = useCallback(() => {
    setIsSelectMode(true);
  }, []);
  
  // Exit select mode and clear selection
  const exitSelectMode = useCallback(() => {
    setIsSelectMode(false);
    setSelectedTaskIds(new Set());
  }, []);
  
  // Toggle task selection
  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);
  
  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedTaskIds(new Set());
  }, []);
  
  // Bulk move tasks
  const bulkMoveTasks = useCallback(async (targetDate: string) => {
    if (selectedTaskIds.size === 0) return;
    
    setIsBulkMoving(true);
    try {
      const taskIds = Array.from(selectedTaskIds);
      const result = await todoApi.bulkMoveTasks({ taskIds, targetDate });
      
      if (result.tasks.length > 0) {
        dispatch({ type: 'BULK_MOVE_TASKS', tasks: result.tasks });
      }
      
      // Exit select mode and clear selection on success
      exitSelectMode();
      
      return result;
    } catch (error: any) {
      console.error('Error bulk moving tasks:', error);
      throw error;
    } finally {
      setIsBulkMoving(false);
    }
  }, [selectedTaskIds, exitSelectMode]);
  
  // Load tasks on mount
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);
  
  const contextValue = {
    ...state,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    reorderTask,
    loadMorePastTasks,
    loadMoreFutureTasks,
    hasMorePastTasks,
    hasMoreFutureTasks,
    isLoadingMore,
    fetchTasksForDateRange,
    // Bulk selection
    isSelectMode,
    selectedTaskIds,
    isBulkMoving,
    enterSelectMode,
    exitSelectMode,
    toggleTaskSelection,
    clearSelection,
    bulkMoveTasks
  };
  
  return <TodoContext.Provider value={contextValue}>{children}</TodoContext.Provider>;
};

// Create custom hook
export const useTodo = () => {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error('useTodo must be used within a TodoProvider');
  }
  return context;
};