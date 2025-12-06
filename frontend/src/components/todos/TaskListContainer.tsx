import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
} from '@dnd-kit/core';
import { useTodo } from '../../context/TodoContext';
import { Task } from '../../services/todoApi';
import { TaskCategory } from '../../types/task';
import { DayContainer } from './DayContainer';
import { BulkActionBar } from './BulkActionBar';
import { BulkMoveDatePicker } from './BulkMoveDatePicker';
import { Button } from '../ui/Button';
import { calculateDisplayOrder, sortTaskGroups } from '../../utils/taskUtils';
import { createPTDate, toDateStringPT } from '../../utils/timezoneUtils';
import styles from './TaskListContainer.module.css';

// Simple date range for most users (no infinite scrolling needed)
const DAYS_BEFORE = 3;
const DAYS_AFTER = 14; // Show 2 weeks ahead

export const TaskListContainer: React.FC = () => {
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
    reorderTask,
    loadMorePastTasks,
    loadMoreFutureTasks,
    hasMorePastTasks,
    hasMoreFutureTasks,
    isLoadingMore,
    // Bulk selection
    isSelectMode,
    selectedTaskIds,
    isBulkMoving,
    enterSelectMode,
    exitSelectMode,
    toggleTaskSelection,
    bulkMoveTasks
  } = useTodo();

  // State for task creation and editing
  const [creatingTaskForDay, setCreatingTaskForDay] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  
  // Animation states for smooth transitions
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const [receivingDayKey, setReceivingDayKey] = useState<string | null>(null);
  
  // State for @dnd-kit drag and drop
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  
  // State to track if today's tasks are visible
  const [isTodayVisible, setIsTodayVisible] = useState(true);
  
  // State for bulk move date picker modal
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  // Reference to the "today" day container for auto-scrolling
  const todayRef = useRef<HTMLDivElement>(null);
  
  // Ref to track if component has mounted
  const hasMountedRef = useRef<boolean>(false);
  

  // Generate date array for the fixed range
  const dateArray = React.useMemo(() => {
    // Get today's date in PT timezone using our utility
    const today = createPTDate(new Date());
    
    const dates = [];
    
    // Add days before today
    for (let i = DAYS_BEFORE; i > 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date);
    }
    
    // Add today
    dates.push(new Date(today));
    
    // Add days after today
    for (let i = 1; i <= DAYS_AFTER; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  }, []);

  // Format dates as ISO strings for use as keys
  const dateKeys = React.useMemo(() =>
    dateArray.map(date => toDateStringPT(date)),
  [dateArray]);

  // Get today's key for highlighting - fixed for PT timezone
  const todayKey = toDateStringPT(new Date());
  
  
  // Auto-scroll to today's tasks ONLY when component initially mounts and tasks are loaded
  useEffect(() => {
    // Only scroll if:
    // 1. Component hasn't mounted yet
    // 2. Not loading
    // 3. No errors
    // 4. We have tasks
    // 5. Today's element exists
    if (!hasMountedRef.current && !loading && !error && tasks.length > 0 && todayRef.current) {
      // Scroll to the today element with a small offset to position it at the top
      todayRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      
      // Mark as mounted so we don't auto-scroll again
      hasMountedRef.current = true;
    }
  }, [loading, error]); // Removed tasks.length dependency
  
  // Use Intersection Observer to detect when today's tasks are visible
  useEffect(() => {
    if (!todayRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsTodayVisible(entry.isIntersecting);
      },
      { threshold: 0.1 } // Consider visible when at least 10% is in view
    );
    
    observer.observe(todayRef.current);
    
    return () => {
      if (todayRef.current) {
        observer.unobserve(todayRef.current);
      }
    };
  }, [todayRef.current]);

  // Configure sensors for both mouse/pointer and touch
  // TouchSensor is specifically optimized for mobile touch devices
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      // Require a small movement before starting drag to allow clicks
      distance: 8,
    },
  });
  
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      // Delay before drag starts on touch to distinguish from scroll
      delay: 200,
      // Allow some movement tolerance during the delay
      tolerance: 8,
    },
  });
  
  const sensors = useSensors(pointerSensor, touchSensor);

  // Task action handlers
  const handleAddTaskClick = (day: string) => {
    setCreatingTaskForDay(creatingTaskForDay === day ? null : day);
    setEditingTaskId(null);
  };

  const handleEditTask = (taskId: string) => {
    setEditingTaskId(taskId);
    setCreatingTaskForDay(null);
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      const newStatus = task.status === 'complete' ? 'incomplete' : 'complete';
      await updateTask(task.id, { status: newStatus });
    } catch (error) {
      console.error('Error toggling task completion:', error);
    }
  };

  const handleCreateTask = async (day: string, taskData: any) => {
    try {
      const dayDate = new Date(day);
      const tasksForDay = tasksByDay[day] || [];
      
      // Simple display order calculation - just put at the end
      const lastTask = tasksForDay.length > 0
        ? tasksForDay.reduce((max: number, task: Task) => Math.max(max, task.displayOrder), 0)
        : 0;
      const displayOrder = lastTask + 1000;
      
      await createTask({
        title: taskData.title,
        category: taskData.category as TaskCategory,
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

  const handleUpdateTask = async (taskData: any) => {
    try {
      const updates: any = {
        title: taskData.title,
        category: taskData.category as TaskCategory,
        isPriority: taskData.isPriority
      };
      
      // If dueDate is provided, include it in the update
      if (taskData.dueDate) {
        updates.dueDate = taskData.dueDate;
      }
      
      await updateTask(taskData.id, updates);
      
      setEditingTaskId(null);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask(id);
      setEditingTaskId(null);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // @dnd-kit drag and drop handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const taskId = active.id as string;
    
    // Find the task being dragged
    let foundTask: Task | null = null;
    let foundDayKey: string | null = null;
    
    for (const [dayKey, dayTasks] of Object.entries(tasksByDay) as [string, Task[]][]) {
      const task = dayTasks.find((t: Task) => t.id === taskId);
      if (task) {
        foundTask = task;
        foundDayKey = dayKey;
        break;
      }
    }
    
    if (foundTask) {
      setActiveTask(foundTask);
      setMovingTaskId(taskId);
    }
  }, [tasksByDay]);
  
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    
    if (over) {
      // Check if we're over a day container
      const overId = over.id as string;
      if (overId.startsWith('day-')) {
        const dayKey = overId.replace('day-', '');
        setReceivingDayKey(dayKey);
      } else {
        // We're over a task, find its day
        for (const [dayKey, dayTasks] of Object.entries(tasksByDay) as [string, Task[]][]) {
          if (dayTasks.some((t: Task) => t.id === overId)) {
            setReceivingDayKey(dayKey);
            break;
          }
        }
      }
    }
  }, [tasksByDay]);
  
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Reset visual states
    setActiveTask(null);
    setReceivingDayKey(null);
    
    if (!over || !activeTask) {
      setMovingTaskId(null);
      return;
    }
    
    const taskId = active.id as string;
    const overId = over.id as string;
    
    // Get the current day key for the dragged task
    const currentDayKey = toDateStringPT(activeTask.dueDate);
    
    // Determine target day key
    let targetDayKey: string;
    let targetTaskId: string | null = null;
    
    if (overId.startsWith('day-')) {
      // Dropped on a day container
      targetDayKey = overId.replace('day-', '');
    } else {
      // Dropped on a task - find its day
      targetTaskId = overId;
      let foundDayKey: string | null = null;
      for (const [dayKey, dayTasks] of Object.entries(tasksByDay) as [string, Task[]][]) {
        if (dayTasks.some((t: Task) => t.id === overId)) {
          foundDayKey = dayKey;
          break;
        }
      }
      if (!foundDayKey) {
        setMovingTaskId(null);
        return;
      }
      targetDayKey = foundDayKey;
    }
    
    console.log('Drag end event:', {
      taskId,
      taskTitle: activeTask.title,
      fromDayKey: currentDayKey,
      toDayKey: targetDayKey,
      targetTaskId,
    });
    
    try {
      // Get the tasks for the target day
      const targetDayTasks = tasksByDay[targetDayKey] || [];
      const sortedTasks = [...targetDayTasks].sort((a, b) => a.displayOrder - b.displayOrder);
      
      // Calculate new display order based on drop position
      let prevTask: Task | null = null;
      let nextTask: Task | null = null;
      
      if (targetTaskId) {
        // Dropped on a specific task - insert before or after it
        const targetIndex = sortedTasks.findIndex(t => t.id === targetTaskId);
        if (targetIndex !== -1) {
          // Insert before the target task
          nextTask = sortedTasks[targetIndex];
          prevTask = targetIndex > 0 ? sortedTasks[targetIndex - 1] : null;
          
          // If the previous task is the dragged task, adjust
          if (prevTask?.id === taskId) {
            prevTask = targetIndex > 1 ? sortedTasks[targetIndex - 2] : null;
          }
          // If the next task is the dragged task, adjust
          if (nextTask?.id === taskId) {
            nextTask = targetIndex < sortedTasks.length - 1 ? sortedTasks[targetIndex + 1] : null;
          }
        }
      } else {
        // Dropped on day container - add to end
        const tasksWithoutDragged = sortedTasks.filter(t => t.id !== taskId);
        if (tasksWithoutDragged.length > 0) {
          prevTask = tasksWithoutDragged[tasksWithoutDragged.length - 1];
        }
      }
      
      // Calculate the new display order
      const prevDisplayOrder = prevTask ? prevTask.displayOrder : null;
      const nextDisplayOrder = nextTask ? nextTask.displayOrder : null;
      const newDisplayOrder = calculateDisplayOrder(prevDisplayOrder, nextDisplayOrder);
      
      // Handle same-day vs different-day drop
      if (currentDayKey === targetDayKey) {
        // Same-day reorder
        await reorderTask(taskId, {
          displayOrder: newDisplayOrder
        });
      } else {
        // Different-day move
        const ptDate = createPTDate(targetDayKey);
        
        console.log('Task move timezone debug:', {
          taskId,
          originalDueDate: activeTask.dueDate,
          targetDayKey,
          ptDateISO: ptDate.toISOString(),
        });
        
        // Move the task to the new day
        await moveTask(taskId, {
          dueDate: ptDate.toISOString(),
          isRolledOver: false
        });
        
        // Update its display order
        await reorderTask(taskId, {
          displayOrder: newDisplayOrder
        });
      }
      
      // Reset animation states after a short delay
      setTimeout(() => {
        setMovingTaskId(null);
      }, 300);
    } catch (error) {
      console.error('Error moving task:', error);
      setMovingTaskId(null);
    }
  }, [activeTask, tasksByDay, moveTask, reorderTask]);
  
  const handleDragCancel = useCallback(() => {
    setActiveTask(null);
    setMovingTaskId(null);
    setReceivingDayKey(null);
  }, []);
  
  // Handle bulk move
  const handleBulkMoveClick = () => {
    setIsDatePickerOpen(true);
  };
  
  const handleBulkMoveConfirm = async (targetDate: string) => {
    try {
      await bulkMoveTasks(targetDate);
      setIsDatePickerOpen(false);
    } catch (error) {
      console.error('Error bulk moving tasks:', error);
    }
  };
  
  // If loading or error, show appropriate UI
  if (loading) return <div className={styles.loading}>Loading tasks...</div>;
  if (error) return <div className={styles.error}>Error loading tasks: {error}</div>;
  
  // Get sorted task groups for rendering
  const sortedTasksByDay = sortTaskGroups(tasksByDay);
  
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className={styles.taskListContainer}>
        {/* Header with Select Mode Toggle */}
        <div className={styles.taskListHeader}>
          <Button
            variant={isSelectMode ? 'secondary' : 'ghost'}
            size="sm"
            onClick={isSelectMode ? exitSelectMode : enterSelectMode}
            leftIcon={
              isSelectMode ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <path d="M5 8L7 10L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )
            }
            aria-label={isSelectMode ? 'Exit select mode' : 'Enter select mode'}
          >
            {isSelectMode ? 'Cancel' : 'Select'}
          </Button>
        </div>
        
        {hasMorePastTasks && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadMorePastTasks()}
            disabled={isLoadingMore}
            loading={isLoadingMore}
            fullWidth
          >
            {isLoadingMore ? 'Loading...' : 'Load earlier tasks'}
          </Button>
        )}
        
        {dateArray.map((date, index) => {
          const key = dateKeys[index];
          const tasksForDay = sortedTasksByDay[key] || [];
          const isToday = key === todayKey;
          
          return (
            <div
              key={key}
              className={key === receivingDayKey ? styles.dayReceiving : ''}
            >
              <DayContainer
                dayKey={key}
                date={date}
                isToday={isToday}
                ref={isToday ? todayRef : undefined}
                tasks={tasksForDay}
                editingTaskId={editingTaskId}
                creatingTaskForDay={creatingTaskForDay}
                onToggleComplete={handleToggleComplete}
                onEdit={handleEditTask}
                onUpdate={handleUpdateTask}
                onDelete={handleDeleteTask}
                onAddTaskClick={handleAddTaskClick}
                onCreateTask={handleCreateTask}
                movingTaskId={movingTaskId}
                isSelectMode={isSelectMode}
                selectedTaskIds={selectedTaskIds}
                onTaskSelectionToggle={toggleTaskSelection}
              />
            </div>
          );
        })}
        
        {hasMoreFutureTasks && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadMoreFutureTasks()}
            disabled={isLoadingMore}
            loading={isLoadingMore}
            fullWidth
          >
            {isLoadingMore ? 'Loading...' : 'Load more future tasks'}
          </Button>
        )}
        
        {/* Floating "Jump to Today" button */}
        {!isTodayVisible && !isSelectMode && (
          <Button
            variant="primary"
            size="sm"
            pill
            onClick={() => {
              todayRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
              });
            }}
            leftIcon={<span>↑</span>}
            className={styles.jumpToTodayButton}
            aria-label="Jump to today's tasks"
          >
            Today
          </Button>
        )}
        
        {/* Bulk Action Bar - shown when in select mode */}
        {isSelectMode && (
          <BulkActionBar
            selectedCount={selectedTaskIds.size}
            onMoveClick={handleBulkMoveClick}
            onCancel={exitSelectMode}
            isMoving={isBulkMoving}
          />
        )}
        
        {/* Bulk Move Date Picker Modal */}
        <BulkMoveDatePicker
          isOpen={isDatePickerOpen}
          onClose={() => setIsDatePickerOpen(false)}
          onSelectDate={handleBulkMoveConfirm}
          selectedCount={selectedTaskIds.size}
          isMoving={isBulkMoving}
        />
      </div>
      
      {/* Drag Overlay - shows the dragged item */}
      <DragOverlay>
        {activeTask ? (
          <div className={styles.dragOverlay}>
            <div className={styles.dragOverlayContent}>
              {activeTask.title}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};