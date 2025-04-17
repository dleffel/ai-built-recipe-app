import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Task, CreateTaskDTO, UpdateTaskDTO, MoveTaskDTO, ReorderTaskDTO, todoApi } from '../services/todoApi';
import { useAuth } from './AuthContext';

// Maximum number of retry attempts for API calls
const MAX_RETRY_ATTEMPTS = 3;
// Delay between retry attempts (in milliseconds)
const RETRY_DELAY = 1000;

/**
 * Utility function to retry a failed API call
 * @param apiCall The API function to call
 * @param args Arguments to pass to the API function
 * @param maxRetries Maximum number of retry attempts
 * @param delay Delay between retry attempts in milliseconds
 * @returns The result of the API call
 */
async function retryApiCall<T>(
  apiCall: (...args: any[]) => Promise<T>,
  args: any[] = [],
  maxRetries: number = MAX_RETRY_ATTEMPTS,
  delay: number = RETRY_DELAY
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await apiCall(...args);
    } catch (error) {
      lastError = error;
      console.warn(`API call failed (attempt ${attempt + 1}/${maxRetries}):`, error);
      
      // If this is not the last attempt, wait before retrying
      if (attempt < maxRetries - 1) {
        // Exponential backoff: increase delay with each retry
        const backoffDelay = delay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }
  
  // If we've exhausted all retries, throw the last error
  throw lastError;
}

// Local storage keys
const TASKS_STORAGE_KEY = 'todo_tasks';
const PENDING_ACTIONS_KEY = 'todo_pending_actions';

// Action types for offline queue
type ActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE' | 'REORDER';

interface PendingAction {
  id: string;
  type: ActionType;
  data: any;
  timestamp: number;
}

interface TodoContextType {
  tasks: Task[];
  tasksByDay: Record<string, Task[]>;
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  pendingActions: PendingAction[];
  fetchTasks: () => Promise<void>;
  fetchTasksByDate: (date: Date) => Promise<Task[]>;
  createTask: (task: CreateTaskDTO) => Promise<Task>;
  updateTask: (id: string, task: UpdateTaskDTO) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (id: string, moveData: MoveTaskDTO) => Promise<Task>;
  reorderTask: (id: string, reorderData: ReorderTaskDTO) => Promise<Task>;
  checkForRolloverTasks: () => Promise<void>;
  syncPendingActions: () => Promise<void>;
}

const TodoContext = createContext<TodoContextType | undefined>(undefined);

export const useTodo = (): TodoContextType => {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error('useTodo must be used within a TodoProvider');
  }
  return context;
};

interface TodoProviderProps {
  children: React.ReactNode;
}

export const TodoProvider: React.FC<TodoProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksByDay, setTasksByDay] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  
  // Ref to track if we've loaded from local storage
  const hasLoadedFromStorage = useRef<boolean>(false);

  // Group tasks by day
  const groupTasksByDay = useCallback((taskList: Task[]) => {
    const grouped: Record<string, Task[]> = {};
    
    taskList.forEach(task => {
      const dateKey = new Date(task.dueDate).toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(task);
    });
    
    // Sort tasks by displayOrder within each day
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => a.displayOrder - b.displayOrder);
    });
    
    return grouped;
  }, []);

  // Save tasks to local storage
  const saveTasksToLocalStorage = useCallback((taskList: Task[]) => {
    if (user) {
      localStorage.setItem(`${TASKS_STORAGE_KEY}_${user.id}`, JSON.stringify(taskList));
    }
  }, [user]);

  // Load tasks from local storage
  const loadTasksFromLocalStorage = useCallback((): Task[] => {
    if (!user) return [];
    
    try {
      const storedTasks = localStorage.getItem(`${TASKS_STORAGE_KEY}_${user.id}`);
      if (storedTasks) {
        return JSON.parse(storedTasks);
      }
    } catch (error) {
      console.error('Error loading tasks from local storage:', error);
    }
    return [];
  }, [user]);

  // Save pending actions to local storage
  const savePendingActionsToLocalStorage = useCallback((actions: PendingAction[]) => {
    if (user) {
      localStorage.setItem(`${PENDING_ACTIONS_KEY}_${user.id}`, JSON.stringify(actions));
    }
  }, [user]);

  // Load pending actions from local storage
  const loadPendingActionsFromLocalStorage = useCallback((): PendingAction[] => {
    if (!user) return [];
    
    try {
      const storedActions = localStorage.getItem(`${PENDING_ACTIONS_KEY}_${user.id}`);
      if (storedActions) {
        return JSON.parse(storedActions);
      }
    } catch (error) {
      console.error('Error loading pending actions from local storage:', error);
    }
    return [];
  }, [user]);

  // Add a pending action to the queue
  const addPendingAction = useCallback((type: ActionType, id: string, data: any) => {
    const newAction: PendingAction = {
      id,
      type,
      data,
      timestamp: Date.now()
    };
    
    setPendingActions(prev => {
      const updated = [...prev, newAction];
      savePendingActionsToLocalStorage(updated);
      return updated;
    });
  }, [savePendingActionsToLocalStorage]);

  // Handle online/offline status changes
  // This useEffect will be moved after syncPendingActions is defined

  // Load initial data from local storage
  useEffect(() => {
    if (user && !hasLoadedFromStorage.current) {
      const storedTasks = loadTasksFromLocalStorage();
      if (storedTasks.length > 0) {
        setTasks(storedTasks);
        setTasksByDay(groupTasksByDay(storedTasks));
      }
      
      const storedActions = loadPendingActionsFromLocalStorage();
      if (storedActions.length > 0) {
        setPendingActions(storedActions);
      }
      
      hasLoadedFromStorage.current = true;
    }
  }, [user, loadTasksFromLocalStorage, loadPendingActionsFromLocalStorage, groupTasksByDay]);

  // Fetch all tasks
  const fetchTasks = useCallback(async () => {
    console.log('fetchTasks called', new Date().toISOString());
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      if (isOnline) {
        try {
          // Use retry mechanism for fetching tasks
          const data = await retryApiCall(todoApi.fetchTasks);
          setTasks(data);
          setTasksByDay(groupTasksByDay(data));
          saveTasksToLocalStorage(data);
          
          // Clear any previous error messages
          if (error) setError(null);
        } catch (fetchError) {
          console.error('Error fetching tasks after retries:', fetchError);
          
          // If all retries fail, try to load from cache
          const cachedTasks = loadTasksFromLocalStorage();
          if (cachedTasks.length > 0) {
            setTasks(cachedTasks);
            setTasksByDay(groupTasksByDay(cachedTasks));
            setError('Unable to fetch latest tasks after multiple attempts. Using cached data.');
          } else {
            setError('Failed to fetch tasks after multiple attempts and no cached data available.');
          }
        }
      } else {
        // If offline, use cached data
        const cachedTasks = loadTasksFromLocalStorage();
        if (cachedTasks.length > 0) {
          setTasks(cachedTasks);
          setTasksByDay(groupTasksByDay(cachedTasks));
        }
        setError('You are currently offline. Using cached data.');
      }
    } catch (err) {
      console.error('Unexpected error in fetchTasks:', err);
      
      // If there's an unexpected error, try to load from cache
      const cachedTasks = loadTasksFromLocalStorage();
      if (cachedTasks.length > 0) {
        setTasks(cachedTasks);
        setTasksByDay(groupTasksByDay(cachedTasks));
        setError('An unexpected error occurred. Using cached data.');
      } else {
        setError('An unexpected error occurred and no cached data available.');
      }
    } finally {
      setLoading(false);
    }
  }, [user, isOnline, error, groupTasksByDay, saveTasksToLocalStorage, loadTasksFromLocalStorage]);

  // Fetch tasks for a specific date
  const fetchTasksByDate = useCallback(async (date: Date): Promise<Task[]> => {
    if (!user) return [];
    
    setLoading(true);
    try {
      if (isOnline) {
        const data = await todoApi.fetchTasksByDate(date);
        setLoading(false);
        return data;
      } else {
        // If offline, filter tasks from local cache
        const cachedTasks = loadTasksFromLocalStorage();
        const dateKey = date.toISOString().split('T')[0];
        const tasksForDate = cachedTasks.filter(task => {
          const taskDate = new Date(task.dueDate).toISOString().split('T')[0];
          return taskDate === dateKey;
        });
        setLoading(false);
        return tasksForDate;
      }
    } catch (err) {
      console.error('Error fetching tasks by date:', err);
      setError('Failed to fetch tasks for the specified date');
      
      // Try to get tasks from cache if API call fails
      const cachedTasks = loadTasksFromLocalStorage();
      const dateKey = date.toISOString().split('T')[0];
      const tasksForDate = cachedTasks.filter(task => {
        const taskDate = new Date(task.dueDate).toISOString().split('T')[0];
        return taskDate === dateKey;
      });
      
      setLoading(false);
      return tasksForDate;
    }
  }, [user, isOnline, loadTasksFromLocalStorage]);

  // Create a new task
  const createTask = useCallback(async (task: CreateTaskDTO): Promise<Task> => {
    setLoading(true);
    
    // Generate a temporary ID for offline mode
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Create a temporary task object
    const tempTask: Task = {
      id: tempId,
      title: task.title,
      status: task.status,
      dueDate: task.dueDate,
      category: task.category,
      isPriority: task.isPriority || false,
      createdAt: new Date().toISOString(),
      completedAt: null,
      isRolledOver: task.isRolledOver || false,
      displayOrder: task.displayOrder,
      userId: user?.id || 'unknown'
    };
    
    try {
      let newTask: Task;
      
      if (isOnline) {
        try {
          // If online, create the task on the server with retry
          newTask = await retryApiCall(todoApi.createTask, [task]);
          
          // Clear any previous error messages
          if (error) setError(null);
        } catch (createError) {
          console.error('Error creating task after retries:', createError);
          
          // If all retries fail, use the temporary task and queue for later sync
          addPendingAction('CREATE', tempId, task);
          newTask = tempTask;
          setError('Failed to create task after multiple attempts. Task will be synced when connection is restored.');
        }
      } else {
        // If offline, queue the action for later sync
        addPendingAction('CREATE', tempId, task);
        newTask = tempTask;
      }
      
      // Update local state
      setTasks(prev => {
        const updated = [...prev, newTask];
        saveTasksToLocalStorage(updated);
        return updated;
      });
      
      setTasksByDay(prev => {
        const dateKey = new Date(newTask.dueDate).toISOString().split('T')[0];
        const dayTasks = [...(prev[dateKey] || []), newTask];
        dayTasks.sort((a, b) => a.displayOrder - b.displayOrder);
        return { ...prev, [dateKey]: dayTasks };
      });
      
      setLoading(false);
      return newTask;
    } catch (err) {
      console.error('Error creating task:', err);
      
      if (!isOnline) {
        // If offline and the API call failed, still update local state
        setTasks(prev => {
          const updated = [...prev, tempTask];
          saveTasksToLocalStorage(updated);
          return updated;
        });
        
        setTasksByDay(prev => {
          const dateKey = new Date(tempTask.dueDate).toISOString().split('T')[0];
          const dayTasks = [...(prev[dateKey] || []), tempTask];
          dayTasks.sort((a, b) => a.displayOrder - b.displayOrder);
          return { ...prev, [dateKey]: dayTasks };
        });
        
        // Queue the action for later sync
        addPendingAction('CREATE', tempId, task);
        
        setLoading(false);
        return tempTask;
      }
      
      setError('Failed to create task');
      setLoading(false);
      throw err;
    }
  }, [user, isOnline, addPendingAction, saveTasksToLocalStorage]);

  // Update an existing task
  const updateTask = useCallback(async (id: string, task: UpdateTaskDTO): Promise<Task> => {
    setLoading(true);
    
    // Find the existing task
    const existingTask = tasks.find(t => t.id === id);
    if (!existingTask) {
      setError('Task not found');
      setLoading(false);
      throw new Error('Task not found');
    }
    
    // Create a temporary updated task
    const tempUpdatedTask: Task = {
      ...existingTask,
      ...task,
      // If status is being updated to "complete", set completedAt
      completedAt: task.status === 'complete' ? new Date().toISOString() :
                  task.status === 'incomplete' ? null : existingTask.completedAt
    };
    
    try {
      let updatedTask: Task;
      
      if (isOnline) {
        // If online, update the task on the server
        updatedTask = await todoApi.updateTask(id, task);
      } else {
        // If offline, queue the action for later sync
        addPendingAction('UPDATE', id, task);
        updatedTask = tempUpdatedTask;
      }
      
      // Update local state
      setTasks(prev => {
        const updated = prev.map(t => t.id === id ? updatedTask : t);
        saveTasksToLocalStorage(updated);
        return updated;
      });
      
      // Update tasksByDay
      setTasksByDay(prev => {
        const newTasksByDay = { ...prev };
        
        // Remove the task from its old day if it exists
        Object.keys(newTasksByDay).forEach(date => {
          newTasksByDay[date] = newTasksByDay[date].filter(t => t.id !== id);
        });
        
        // Add the task to its new day
        const dateKey = new Date(updatedTask.dueDate).toISOString().split('T')[0];
        if (!newTasksByDay[dateKey]) {
          newTasksByDay[dateKey] = [];
        }
        newTasksByDay[dateKey].push(updatedTask);
        newTasksByDay[dateKey].sort((a, b) => a.displayOrder - b.displayOrder);
        
        return newTasksByDay;
      });
      
      setLoading(false);
      return updatedTask;
    } catch (err) {
      console.error('Error updating task:', err);
      
      if (!isOnline) {
        // If offline and the API call failed, still update local state
        setTasks(prev => {
          const updated = prev.map(t => t.id === id ? tempUpdatedTask : t);
          saveTasksToLocalStorage(updated);
          return updated;
        });
        
        // Update tasksByDay
        setTasksByDay(prev => {
          const newTasksByDay = { ...prev };
          
          // Remove the task from its old day if it exists
          Object.keys(newTasksByDay).forEach(date => {
            newTasksByDay[date] = newTasksByDay[date].filter(t => t.id !== id);
          });
          
          // Add the task to its new day
          const dateKey = new Date(tempUpdatedTask.dueDate).toISOString().split('T')[0];
          if (!newTasksByDay[dateKey]) {
            newTasksByDay[dateKey] = [];
          }
          newTasksByDay[dateKey].push(tempUpdatedTask);
          newTasksByDay[dateKey].sort((a, b) => a.displayOrder - b.displayOrder);
          
          return newTasksByDay;
        });
        
        // Queue the action for later sync
        addPendingAction('UPDATE', id, task);
        
        setLoading(false);
        return tempUpdatedTask;
      }
      
      setError('Failed to update task');
      setLoading(false);
      throw err;
    }
  }, [tasks, isOnline, addPendingAction, saveTasksToLocalStorage]);

  // Delete a task
  const deleteTask = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    
    try {
      if (isOnline) {
        // If online, delete the task on the server
        await todoApi.deleteTask(id);
      } else {
        // If offline, queue the action for later sync
        addPendingAction('DELETE', id, {});
      }
      
      // Remove the task from the tasks array
      setTasks(prev => {
        const updated = prev.filter(t => t.id !== id);
        saveTasksToLocalStorage(updated);
        return updated;
      });
      
      // Remove the task from tasksByDay
      setTasksByDay(prev => {
        const newTasksByDay = { ...prev };
        Object.keys(newTasksByDay).forEach(date => {
          newTasksByDay[date] = newTasksByDay[date].filter(t => t.id !== id);
        });
        return newTasksByDay;
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Error deleting task:', err);
      
      if (!isOnline) {
        // If offline and the API call failed, still update local state
        setTasks(prev => {
          const updated = prev.filter(t => t.id !== id);
          saveTasksToLocalStorage(updated);
          return updated;
        });
        
        // Remove the task from tasksByDay
        setTasksByDay(prev => {
          const newTasksByDay = { ...prev };
          Object.keys(newTasksByDay).forEach(date => {
            newTasksByDay[date] = newTasksByDay[date].filter(t => t.id !== id);
          });
          return newTasksByDay;
        });
        
        // Queue the action for later sync
        addPendingAction('DELETE', id, {});
        
        setLoading(false);
        return;
      }
      
      setError('Failed to delete task');
      setLoading(false);
      throw err;
    }
  }, [isOnline, addPendingAction, saveTasksToLocalStorage]);

  // Move a task to a different date
  const moveTask = useCallback(async (id: string, moveData: MoveTaskDTO): Promise<Task> => {
    setLoading(true);
    
    // Find the existing task
    const existingTask = tasks.find(t => t.id === id);
    if (!existingTask) {
      setError('Task not found');
      setLoading(false);
      throw new Error('Task not found');
    }
    
    // Create a temporary moved task
    const tempMovedTask: Task = {
      ...existingTask,
      dueDate: moveData.dueDate,
      isRolledOver: moveData.isRolledOver !== undefined ? moveData.isRolledOver : existingTask.isRolledOver
    };
    
    try {
      let movedTask: Task;
      
      if (isOnline) {
        // If online, move the task on the server
        movedTask = await todoApi.moveTask(id, moveData);
      } else {
        // If offline, queue the action for later sync
        addPendingAction('MOVE', id, moveData);
        movedTask = tempMovedTask;
      }
      
      // Update the task in the tasks array
      setTasks(prev => {
        const updated = prev.map(t => t.id === id ? movedTask : t);
        saveTasksToLocalStorage(updated);
        return updated;
      });
      
      // Update tasksByDay
      setTasksByDay(prev => {
        const newTasksByDay = { ...prev };
        
        // Remove the task from its old day
        Object.keys(newTasksByDay).forEach(date => {
          newTasksByDay[date] = newTasksByDay[date].filter(t => t.id !== id);
        });
        
        // Add the task to its new day
        const dateKey = new Date(movedTask.dueDate).toISOString().split('T')[0];
        if (!newTasksByDay[dateKey]) {
          newTasksByDay[dateKey] = [];
        }
        newTasksByDay[dateKey].push(movedTask);
        newTasksByDay[dateKey].sort((a, b) => a.displayOrder - b.displayOrder);
        
        return newTasksByDay;
      });
      
      setLoading(false);
      return movedTask;
    } catch (err) {
      console.error('Error moving task:', err);
      
      if (!isOnline) {
        // If offline and the API call failed, still update local state
        setTasks(prev => {
          const updated = prev.map(t => t.id === id ? tempMovedTask : t);
          saveTasksToLocalStorage(updated);
          return updated;
        });
        
        // Update tasksByDay
        setTasksByDay(prev => {
          const newTasksByDay = { ...prev };
          
          // Remove the task from its old day
          Object.keys(newTasksByDay).forEach(date => {
            newTasksByDay[date] = newTasksByDay[date].filter(t => t.id !== id);
          });
          
          // Add the task to its new day
          const dateKey = new Date(tempMovedTask.dueDate).toISOString().split('T')[0];
          if (!newTasksByDay[dateKey]) {
            newTasksByDay[dateKey] = [];
          }
          newTasksByDay[dateKey].push(tempMovedTask);
          newTasksByDay[dateKey].sort((a, b) => a.displayOrder - b.displayOrder);
          
          return newTasksByDay;
        });
        
        // Queue the action for later sync
        addPendingAction('MOVE', id, moveData);
        
        setLoading(false);
        return tempMovedTask;
      }
      
      setError('Failed to move task');
      setLoading(false);
      throw err;
    }
  }, [tasks, isOnline, addPendingAction, saveTasksToLocalStorage]);

  // Reorder a task within a day
  const reorderTask = useCallback(async (id: string, reorderData: ReorderTaskDTO): Promise<Task> => {
    setLoading(true);
    
    // Find the existing task
    const existingTask = tasks.find(t => t.id === id);
    if (!existingTask) {
      setError('Task not found');
      setLoading(false);
      throw new Error('Task not found');
    }
    
    // Create a temporary reordered task
    const tempReorderedTask: Task = {
      ...existingTask,
      displayOrder: reorderData.displayOrder
    };
    
    try {
      let reorderedTask: Task;
      
      if (isOnline) {
        // If online, reorder the task on the server
        reorderedTask = await todoApi.reorderTask(id, reorderData);
      } else {
        // If offline, queue the action for later sync
        addPendingAction('REORDER', id, reorderData);
        reorderedTask = tempReorderedTask;
      }
      
      // Update the task in the tasks array
      setTasks(prev => {
        const updated = prev.map(t => t.id === id ? reorderedTask : t);
        saveTasksToLocalStorage(updated);
        return updated;
      });
      
      // Update tasksByDay
      setTasksByDay(prev => {
        const newTasksByDay = { ...prev };
        
        // Find the day that contains this task
        Object.keys(newTasksByDay).forEach(date => {
          const taskIndex = newTasksByDay[date].findIndex(t => t.id === id);
          if (taskIndex >= 0) {
            // Replace the task with the updated one
            newTasksByDay[date][taskIndex] = reorderedTask;
            // Sort the tasks by displayOrder
            newTasksByDay[date].sort((a, b) => a.displayOrder - b.displayOrder);
          }
        });
        
        return newTasksByDay;
      });
      
      setLoading(false);
      return reorderedTask;
    } catch (err) {
      console.error('Error reordering task:', err);
      
      if (!isOnline) {
        // If offline and the API call failed, still update local state
        setTasks(prev => {
          const updated = prev.map(t => t.id === id ? tempReorderedTask : t);
          saveTasksToLocalStorage(updated);
          return updated;
        });
        
        // Update tasksByDay
        setTasksByDay(prev => {
          const newTasksByDay = { ...prev };
          
          // Find the day that contains this task
          Object.keys(newTasksByDay).forEach(date => {
            const taskIndex = newTasksByDay[date].findIndex(t => t.id === id);
            if (taskIndex >= 0) {
              // Replace the task with the updated one
              newTasksByDay[date][taskIndex] = tempReorderedTask;
              // Sort the tasks by displayOrder
              newTasksByDay[date].sort((a, b) => a.displayOrder - b.displayOrder);
            }
          });
          
          return newTasksByDay;
        });
        
        // Queue the action for later sync
        addPendingAction('REORDER', id, reorderData);
        
        setLoading(false);
        return tempReorderedTask;
      }
      
      setError('Failed to reorder task');
      setLoading(false);
      throw err;
    }
  }, [tasks, isOnline, addPendingAction, saveTasksToLocalStorage]);

  // Sync pending actions with the server
  const syncPendingActions = useCallback(async (): Promise<void> => {
    console.log('syncPendingActions called', new Date().toISOString());
    if (!isOnline || pendingActions.length === 0 || !user) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Sort actions by timestamp to process them in order
      const sortedActions = [...pendingActions].sort((a, b) => a.timestamp - b.timestamp);
      
      // Process each action
      for (const action of sortedActions) {
        try {
          switch (action.type) {
            case 'CREATE':
              await todoApi.createTask(action.data);
              break;
            case 'UPDATE':
              await todoApi.updateTask(action.id, action.data);
              break;
            case 'DELETE':
              await todoApi.deleteTask(action.id);
              break;
            case 'MOVE':
              await todoApi.moveTask(action.id, action.data);
              break;
            case 'REORDER':
              await todoApi.reorderTask(action.id, action.data);
              break;
          }
          
          // Remove the action from the pending list
          setPendingActions(prev => {
            const updated = prev.filter(a => !(a.id === action.id && a.type === action.type && a.timestamp === action.timestamp));
            savePendingActionsToLocalStorage(updated);
            return updated;
          });
        } catch (error) {
          console.error(`Error processing ${action.type} action for task ${action.id}:`, error);
          // Continue with other actions even if one fails
        }
      }
      
      // Instead of calling fetchTasks directly, which creates a circular dependency,
      // manually fetch the tasks and update state
      console.log('Manually fetching tasks after sync instead of calling fetchTasks');
      if (isOnline) {
        try {
          const data = await todoApi.fetchTasks();
          setTasks(data);
          setTasksByDay(groupTasksByDay(data));
          saveTasksToLocalStorage(data);
        } catch (error) {
          console.error('Error fetching tasks after sync:', error);
        }
      }
    } catch (error) {
      console.error('Error syncing pending actions:', error);
      setError('Failed to sync some changes with the server');
    } finally {
      setLoading(false);
    }
  }, [isOnline, pendingActions, user, savePendingActionsToLocalStorage, groupTasksByDay, saveTasksToLocalStorage]);
  
  // Online/offline event handlers (moved after syncPendingActions is defined)
  useEffect(() => {
    const handleOnline = () => {
      console.log('App is online');
      setIsOnline(true);
      // Now we can sync pending actions
      syncPendingActions();
    };
    
    const handleOffline = () => {
      console.log('App is offline');
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingActions]); // Add syncPendingActions to the dependency array

  // Check for tasks that need to be rolled over
  const checkForRolloverTasks = useCallback(async (): Promise<void> => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get yesterday's date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      // Get today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Fetch yesterday's tasks (this will use cached data if offline)
      const yesterdayTasks = await fetchTasksByDate(yesterday);
      
      // Find incomplete tasks from yesterday
      const incompleteTasks = yesterdayTasks.filter(task => task.status === 'incomplete');
      
      if (incompleteTasks.length === 0) {
        setLoading(false);
        return;
      }
      
      // If online, we can use the server's rollover service
      if (isOnline) {
        // Roll over each incomplete task to today
        for (const task of incompleteTasks) {
          await moveTask(task.id, {
            dueDate: today.toISOString(),
            isRolledOver: true
          });
        }
      } else {
        // If offline, we'll handle the rollover locally
        // and queue the actions for later sync
        for (const task of incompleteTasks) {
          // Create a local copy of the task for today
          const rolledOverTask: CreateTaskDTO = {
            title: task.title,
            status: 'incomplete',
            dueDate: today.toISOString(),
            category: task.category as 'Roo Vet' | 'Roo Code' | 'Personal',
            isPriority: task.isPriority,
            displayOrder: task.displayOrder,
            isRolledOver: true
          };
          
          // Add the task to today
          await createTask(rolledOverTask);
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error checking for rollover tasks:', err);
      setError('Failed to check for rollover tasks');
      setLoading(false);
    }
  }, [user, isOnline, fetchTasksByDate, moveTask, createTask]);

  // Fetch tasks when the user changes
  // This effect runs when the user changes
  useEffect(() => {
    console.log('TodoContext user effect triggered', new Date().toISOString());
    if (user) {
      // Only fetch tasks if we haven't loaded from storage yet
      // This prevents duplicate fetching with the TaskListContainer
      if (!hasLoadedFromStorage.current) {
        console.log('About to call fetchTasks from user effect');
        fetchTasks();
      }
      checkForRolloverTasks();
    } else {
      setTasks([]);
      setTasksByDay({});
      setLoading(false);
    }
  }, [user, fetchTasks, checkForRolloverTasks, hasLoadedFromStorage]);

  const value: TodoContextType = {
    tasks,
    tasksByDay,
    loading,
    error,
    isOnline,
    pendingActions,
    fetchTasks,
    fetchTasksByDate,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    reorderTask,
    checkForRolloverTasks,
    syncPendingActions
  };

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
};