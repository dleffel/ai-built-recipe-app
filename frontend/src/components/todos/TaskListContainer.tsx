import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import styles from './TaskListContainer.module.css';
import dragStyles from './DragDropFeedback.module.css';
import { TaskItem } from './TaskItem';
import { TaskCreation } from './TaskCreation';
import { TaskEdit } from './TaskEdit';
import { useTodo } from '../../context/TodoContext';
import { Task } from '../../services/todoApi';
import { FixedSizeList as List } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';

interface TaskListContainerProps {
  // This will be populated with actual props when functionality is implemented
  // For now, we're just creating a placeholder UI
}

// Number of days to render before and after the current date
const DAYS_BEFORE = 7; // Show 1 week before
const DAYS_AFTER = 30; // Show 1 month ahead
const DAY_HEIGHT = 300; // Height of each day container in pixels
const ITEM_HEIGHT = 60; // Height of each task item in pixels

// Interface for the virtualized row renderer
interface RowProps {
  index: number;
  style: React.CSSProperties;
}

export const TaskListContainer: React.FC<TaskListContainerProps> = () => {
  const {
    tasks,
    tasksByDay,
    loading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    reorderTask
  } = useTodo();

  // State to track which day has the task creation form open
  const [creatingTaskForDay, setCreatingTaskForDay] = useState<string | null>(null);
  // State to track which task is being edited
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  // State for drag and drop
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [draggedTaskElement, setDraggedTaskElement] = useState<HTMLElement | null>(null);
  // State for virtualization
  const [visibleDaysRange, setVisibleDaysRange] = useState({ startIndex: 0, endIndex: 10 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate an array of dates for the virtualized list
  const dateArray = useMemo(() => {
    const dates: Date[] = [];
    const today = new Date();
    
    // Add days before today
    for (let i = DAYS_BEFORE; i > 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      dates.push(date);
    }
    
    // Add today
    const todayDate = new Date(today);
    todayDate.setHours(0, 0, 0, 0);
    dates.push(todayDate);
    
    // Add days after today
    for (let i = 1; i <= DAYS_AFTER; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      date.setHours(0, 0, 0, 0);
      dates.push(date);
    }
    
    return dates;
  }, []);

  // Format dates as ISO strings for use as keys
  const dateKeys = useMemo(() =>
    dateArray.map(date => date.toISOString().split('T')[0]),
  [dateArray]);

  // Get today's key for highlighting
  const today = new Date();
  const todayKey = today.toISOString().split('T')[0];

  // Fetch tasks on component mount
  useEffect(() => {
    console.log('TaskListContainer mount effect triggered', new Date().toISOString());
    console.log('About to call fetchTasks from TaskListContainer');
    fetchTasks();
  }, [fetchTasks]);

  // Format date for display
  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
  };

  const formatMobileDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
  };

  // Toggle task creation form
  const handleAddTaskClick = (day: string) => {
    setCreatingTaskForDay(creatingTaskForDay === day ? null : day);
    setEditingTaskId(null); // Close any open edit forms
  };

  // Handle task edit
  const handleEditTask = (taskId: string) => {
    setEditingTaskId(taskId);
    setCreatingTaskForDay(null); // Close any open creation forms
  };

  // Handle task toggle completion
  const handleToggleComplete = async (task: Task) => {
    try {
      const newStatus = task.status === 'complete' ? 'incomplete' : 'complete';
      
      await updateTask(task.id, {
        status: newStatus
      });
    } catch (error) {
      console.error('Error toggling task completion:', error);
    }
  };

  // Handle task creation
  const handleCreateTask = async (day: string, taskData: { title: string; category: string; isPriority: boolean }) => {
    try {
      const dayDate = new Date(day);
      const tasksForDay = tasksByDay[day] || [];
      
      // Calculate display order (add to end of list)
      const displayOrder = tasksForDay.length > 0
        ? Math.max(...tasksForDay.map(t => t.displayOrder)) + 10
        : 0;
      
      await createTask({
        title: taskData.title,
        category: taskData.category as 'Roo Vet' | 'Roo Code' | 'Personal',
        isPriority: taskData.isPriority,
        status: 'incomplete',
        dueDate: dayDate.toISOString(),
        displayOrder
      });
      
      setCreatingTaskForDay(null);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  // Handle task update
  const handleUpdateTask = async (taskData: { id: string; title: string; category: string; isPriority: boolean }) => {
    try {
      await updateTask(taskData.id, {
        title: taskData.title,
        category: taskData.category as 'Roo Vet' | 'Roo Code' | 'Personal',
        isPriority: taskData.isPriority
      });
      
      setEditingTaskId(null);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  // Handle task deletion
  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask(id);
      setEditingTaskId(null);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => {
    setDraggedTask(task);
    setDraggedTaskElement(e.currentTarget);
    
    // Add a class to the dragged element
    e.currentTarget.classList.add(dragStyles.dragging);
    
    // Set the drag image
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', task.id);
    }
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    setDraggedTask(null);
    setDragOverDay(null);
    
    // Remove the class from the dragged element
    if (draggedTaskElement) {
      draggedTaskElement.classList.remove(dragStyles.dragging);
    }
    setDraggedTaskElement(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, day: string) => {
    e.preventDefault();
    if (draggedTask && day !== dragOverDay) {
      setDragOverDay(day);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, day: string) => {
    e.preventDefault();
    
    if (!draggedTask) return;
    
    try {
      // Get the task ID from the data transfer
      const taskId = e.dataTransfer.getData('text/plain');
      
      // If the task is already in this day, do nothing
      const taskDate = new Date(draggedTask.dueDate).toISOString().split('T')[0];
      if (taskDate === day) return;
      
      // Move the task to the new day
      const dayDate = new Date(day);
      
      // Calculate the display order (add to end of list)
      const tasksForDay = tasksByDay[day] || [];
      const displayOrder = tasksForDay.length > 0
        ? Math.max(...tasksForDay.map(t => t.displayOrder)) + 10
        : 0;
      
      // Move the task
      await moveTask(taskId, {
        dueDate: dayDate.toISOString(),
        isRolledOver: false // Clear the rolled over flag when manually moved
      });
      
      // Update the display order
      await reorderTask(taskId, { displayOrder });
    } catch (error) {
      console.error('Error moving task:', error);
    }
    
    setDraggedTask(null);
    setDragOverDay(null);
  };

  // Get tasks for a specific day
  const getTasksForDay = (day: string) => {
    return tasksByDay[day] || [];
  };

  // Render a single day container
  const renderDay = useCallback((dateKey: string, date: Date, isToday: boolean = false) => {
    return (
      <div
        className={`${styles.dayContainer} ${dragOverDay === dateKey ? dragStyles.dayDropTarget : ''}`}
        onDragOver={(e) => handleDragOver(e, dateKey)}
        onDrop={(e) => handleDrop(e, dateKey)}
      >
        <div className={styles.dayHeader}>
          <h2 className={`${styles.dayTitle} ${isToday ? styles.today : ''}`}>
            {isToday ? 'TODAY - ' : ''}{formatDate(date)}
          </h2>
        </div>
        <div className={styles.taskList}>
          {getTasksForDay(dateKey).map(task => (
            editingTaskId === task.id ? (
              <TaskEdit
                key={task.id}
                id={task.id}
                title={task.title}
                category={task.category as 'Roo Vet' | 'Roo Code' | 'Personal'}
                isPriority={task.isPriority}
                onCancel={() => setEditingTaskId(null)}
                onSave={handleUpdateTask}
                onDelete={() => handleDeleteTask(task.id)}
              />
            ) : (
              <TaskItem
                key={task.id}
                id={task.id}
                title={task.title}
                completed={task.status === 'complete'}
                category={task.category as 'Roo Vet' | 'Roo Code' | 'Personal'}
                isPriority={task.isPriority}
                isRolledOver={task.isRolledOver}
                onToggleComplete={() => handleToggleComplete(task)}
                onEdit={() => handleEditTask(task.id)}
                onDragStart={(e) => handleDragStart(e, task)}
                onDragEnd={handleDragEnd}
              />
            )
          ))}
          {getTasksForDay(dateKey).length === 0 && (
            <div className={styles.emptyState}>
              {isToday ? 'No tasks for today. Add a task to get started.' : 'No tasks scheduled.'}
            </div>
          )}
          {creatingTaskForDay === dateKey && (
            <TaskCreation
              onCancel={() => setCreatingTaskForDay(null)}
              onSave={(taskData) => handleCreateTask(dateKey, taskData)}
            />
          )}
        </div>
        <button
          className={styles.addTaskButton}
          onClick={() => handleAddTaskClick(dateKey)}
        >
          <span className={styles.addTaskIcon}>+</span> Add task
        </button>
      </div>
    );
  }, [
    dragOverDay,
    editingTaskId,
    creatingTaskForDay,
    getTasksForDay,
    handleDragOver,
    handleDrop,
    handleUpdateTask,
    handleDeleteTask,
    handleToggleComplete,
    handleEditTask,
    handleDragStart,
    handleDragEnd,
    handleAddTaskClick,
    handleCreateTask
  ]);

  // Row renderer for virtualized list
  const rowRenderer = useCallback(({ index, style }: RowProps) => {
    const dateKey = dateKeys[index];
    const date = dateArray[index];
    const isToday = dateKey === todayKey;
    
    return (
      <div style={style} className={styles.virtualizedRow} key={dateKey}>
        {renderDay(dateKey, date, isToday)}
      </div>
    );
  }, [dateKeys, dateArray, todayKey, renderDay]);

  // If loading, show a loading indicator
  if (loading) {
    return <div className={styles.loading}>Loading tasks...</div>;
  }

  // If there's an error, show an error message
  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  // Calculate the total height of the list
  const listHeight = Math.min(window.innerHeight - 100, dateArray.length * DAY_HEIGHT);

  return (
    <div className={styles.container} ref={containerRef}>
      <InfiniteLoader
        isItemLoaded={index => index < dateKeys.length}
        itemCount={dateArray.length}
        loadMoreItems={(startIndex, stopIndex) => {
          setVisibleDaysRange({ startIndex, endIndex: stopIndex });
          return Promise.resolve();
        }}
      >
        {({ onItemsRendered, ref }) => (
          <List
            className={styles.virtualizedList}
            height={listHeight}
            width="100%"
            itemCount={dateArray.length}
            itemSize={DAY_HEIGHT}
            onItemsRendered={onItemsRendered}
            ref={ref}
          >
            {rowRenderer}
          </List>
        )}
      </InfiniteLoader>
    </div>
  );
};