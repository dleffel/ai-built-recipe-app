import React, { createContext, useContext, useState } from 'react';
import { useTodo } from '../../context/TodoContext';
import { Task } from '../../services/todoApi';

// Define the context type
interface TaskDragDropContextType {
  isDragging: boolean;
  draggedTask: Task | null;
}

// Create the context with default values
const TaskDragDropContext = createContext<TaskDragDropContextType>({
  isDragging: false,
  draggedTask: null
});

// Custom hook to use the context
export const useTaskDragDrop = () => useContext(TaskDragDropContext);

// Props for the provider component
interface TaskDragDropProviderProps {
  children: React.ReactNode;
}

// Provider component
export const TaskDragDropProvider: React.FC<TaskDragDropProviderProps> = ({ children }) => {
  // Get necessary functions from TodoContext
  const { tasksByDay } = useTodo();
  
  // State for drag and drop
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  // Context value
  const contextValue = {
    isDragging,
    draggedTask
  };

  // Return the provider with the context value
  return (
    <TaskDragDropContext.Provider value={contextValue}>
      {children}
    </TaskDragDropContext.Provider>
  );
};