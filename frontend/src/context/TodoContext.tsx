import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { todoApi, Task, CreateTaskDTO, UpdateTaskDTO, MoveTaskDTO, ReorderTaskDTO } from '../services/todoApi';
import { groupTasksByDay } from '../utils/taskUtils';

// Define action types
type TodoAction =
  | { type: 'LOADING' }
  | { type: 'FETCH_SUCCESS', tasks: Task[] }
  | { type: 'FETCH_ERROR', error: string }
  | { type: 'ADD_TASK', task: Task }
  | { type: 'UPDATE_TASK', taskId: string, updates: Partial<Task> }
  | { type: 'DELETE_TASK', taskId: string }
  | { type: 'MOVE_TASK', taskId: string, updates: Partial<Task> };

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
      
    default:
      return state;
  }
};

// Create context
const TodoContext = createContext<any>(null);

// Create provider component
export const TodoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(todoReducer, initialState);
  
  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    dispatch({ type: 'LOADING' });
    try {
      const tasks = await todoApi.fetchTasks();
      dispatch({ type: 'FETCH_SUCCESS', tasks });
    } catch (error: any) {
      dispatch({ type: 'FETCH_ERROR', error: error.message || 'Failed to fetch tasks' });
    }
  }, []);
  
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