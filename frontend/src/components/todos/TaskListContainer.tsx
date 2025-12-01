import React, { useState, useEffect, useRef } from 'react';
import { useTodo } from '../../context/TodoContext';
import { Task } from '../../services/todoApi';
import { DayContainer } from './DayContainer';
import { BulkActionBar } from './BulkActionBar';
import { BulkMoveDatePicker } from './BulkMoveDatePicker';
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
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  
  // Animation states for smooth transitions
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const [receivingDayKey, setReceivingDayKey] = useState<string | null>(null);
  
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

  const handleUpdateTask = async (taskData: any) => {
    try {
      const updates: any = {
        title: taskData.title,
        category: taskData.category as 'Roo Vet' | 'Roo Code' | 'Personal',
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

  // Drag and drop handlers - simplified HTML5 Drag and Drop API
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
    
    // Add a custom drag ghost if needed
    const dragGhost = document.createElement('div');
    dragGhost.classList.add(styles.dragGhost);
    dragGhost.textContent = task.title;
    document.body.appendChild(dragGhost);
    e.dataTransfer.setDragImage(dragGhost, 20, 20);
    
    // Clean up the ghost element after drag starts
    setTimeout(() => {
      document.body.removeChild(dragGhost);
    }, 0);
    
    setDraggedTask(task);
    setMovingTaskId(task.id);
  };
  
  const handleDragOver = (e: React.DragEvent, dayKey: string) => {
    e.preventDefault(); // Allow drop
    e.dataTransfer.dropEffect = 'move';
    
    // Visual feedback for the current drop target
    setDropTarget(dayKey);
    setReceivingDayKey(dayKey);
  };
  
  const handleDrop = async (e: React.DragEvent, dayKey: string) => {
    e.preventDefault();
    
    // Reset visual state
    setDropTarget(null);
    
    if (!draggedTask) {
      console.error('Drop event occurred but draggedTask is null');
      return;
    }
    
    const taskId = e.dataTransfer.getData('taskId');
    
    // Get the current day key for the dragged task using our timezone utility
    const currentDayKey = toDateStringPT(draggedTask.dueDate);
    
    console.log('Drop event:', {
      taskId,
      taskTitle: draggedTask.title,
      fromDayKey: currentDayKey,
      toDayKey: dayKey,
      draggedTaskDueDate: draggedTask.dueDate,
      userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    
    try {
      // Get the tasks for the target day
      const targetDayTasks = tasksByDay[dayKey] || [];
      
      // Handle different scenarios based on whether it's same-day or different-day drop
      if (currentDayKey === dayKey) {
        // Same-day drop - handle reordering within the day
        
        // Find the drop position within the day's task list
        // Get the Y position of the drop
        const dropY = e.clientY;
        
        // Sort the tasks by their display order
        const sortedTasks = [...targetDayTasks].sort((a, b) => a.displayOrder - b.displayOrder);
        
        // Find the tasks before and after the drop position
        let prevTask: Task | null = null;
        let nextTask: Task | null = null;
        
        // Get all task elements in the current day container
        const dayContainer = (e.currentTarget as HTMLElement);
        const taskElements = Array.from(dayContainer.querySelectorAll('[data-id]'));
        
        // Find the task elements before and after the drop position
        for (let i = 0; i < taskElements.length; i++) {
          const rect = taskElements[i].getBoundingClientRect();
          const taskMiddle = rect.top + rect.height / 2;
          
          // Skip the dragged task itself
          if (taskElements[i].getAttribute('data-id') === taskId) continue;
          
          if (dropY < taskMiddle) {
            // Found the next task
            const nextTaskId = taskElements[i].getAttribute('data-id');
            nextTask = sortedTasks.find(t => t.id === nextTaskId) || null;
            
            // The previous task is the one before this in the sorted array
            if (i > 0) {
              const prevTaskId = taskElements[i-1].getAttribute('data-id');
              prevTask = sortedTasks.find(t => t.id === prevTaskId) || null;
            }
            break;
          }
          
          // If we're at the last element and haven't found a next task,
          // this task becomes the previous task
          if (i === taskElements.length - 1) {
            const prevTaskId = taskElements[i].getAttribute('data-id');
            prevTask = sortedTasks.find(t => t.id === prevTaskId) || null;
          }
        }
        
        // Calculate the new display order
        const prevDisplayOrder = prevTask ? prevTask.displayOrder : null;
        const nextDisplayOrder = nextTask ? nextTask.displayOrder : null;
        
        // Use the utility function to calculate the new display order
        const newDisplayOrder = calculateDisplayOrder(prevDisplayOrder, nextDisplayOrder);
        
        // Update the task's display order
        await reorderTask(taskId, {
          displayOrder: newDisplayOrder
        });
      } else {
        // Different-day drop - move the task to the new day with position awareness
        
        // Find the drop position within the target day's task list
        const dropY = e.clientY;
        
        // Sort the tasks by their display order
        const sortedTasks = [...targetDayTasks].sort((a, b) => a.displayOrder - b.displayOrder);
        
        // Find the tasks before and after the drop position
        let prevTask: Task | null = null;
        let nextTask: Task | null = null;
        
        // Get all task elements in the target day container
        const dayContainer = (e.currentTarget as HTMLElement);
        const taskElements = Array.from(dayContainer.querySelectorAll('[data-id]'));
        
        // Find the task elements before and after the drop position
        for (let i = 0; i < taskElements.length; i++) {
          const rect = taskElements[i].getBoundingClientRect();
          const taskMiddle = rect.top + rect.height / 2;
          
          if (dropY < taskMiddle) {
            // Found the next task
            const nextTaskId = taskElements[i].getAttribute('data-id');
            nextTask = sortedTasks.find(t => t.id === nextTaskId) || null;
            
            // The previous task is the one before this in the sorted array
            if (i > 0) {
              const prevTaskId = taskElements[i-1].getAttribute('data-id');
              prevTask = sortedTasks.find(t => t.id === prevTaskId) || null;
            }
            break;
          }
          
          // If we're at the last element and haven't found a next task,
          // this task becomes the previous task
          if (i === taskElements.length - 1) {
            const prevTaskId = taskElements[i].getAttribute('data-id');
            prevTask = sortedTasks.find(t => t.id === prevTaskId) || null;
          }
        }
        
        // Calculate the new display order
        const prevDisplayOrder = prevTask ? prevTask.displayOrder : null;
        const nextDisplayOrder = nextTask ? nextTask.displayOrder : null;
        
        // Use the utility function to calculate the new display order
        const newDisplayOrder = calculateDisplayOrder(prevDisplayOrder, nextDisplayOrder);
        
        // Parse the dayKey (YYYY-MM-DD) into a proper PT date using our utility
        const ptDate = createPTDate(dayKey);
        
        console.log('Task move timezone debug:', {
          taskId,
          originalDueDate: draggedTask.dueDate,
          dayKey,
          ptDateISO: ptDate.toISOString(),
          userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
        
        try {
          // First move the task to the new day with explicit PT timezone
          const updatedTask = await moveTask(taskId, {
            dueDate: ptDate.toISOString(),
            isRolledOver: false
          });
          
          console.log('Task moved successfully:', {
            taskId,
            newDueDate: updatedTask.dueDate,
            originalDay: currentDayKey,
            targetDay: dayKey
          });
          
          // Removed redundant fetchTasks() call that was causing jarring refresh
        } catch (error) {
          console.error('Error in task movement:', error);
        }
        
        // Then update its display order
        await reorderTask(taskId, {
          displayOrder: newDisplayOrder
        });
      }
      
      // Reset animation states after a short delay to allow animations to complete
      setTimeout(() => {
        setMovingTaskId(null);
        setReceivingDayKey(null);
        setDraggedTask(null);
      }, 300); // Slightly longer than the transition duration
    } catch (error) {
      console.error('Error moving task:', error);
    }
  };
  
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
    <div className={styles.taskListContainer}>
      {/* Header with Select Mode Toggle */}
      <div className={styles.taskListHeader}>
        <button
          className={`${styles.selectModeButton} ${isSelectMode ? styles.active : ''}`}
          onClick={isSelectMode ? exitSelectMode : enterSelectMode}
          aria-label={isSelectMode ? 'Exit select mode' : 'Enter select mode'}
        >
          {isSelectMode ? (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Cancel
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <path d="M5 8L7 10L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Select
            </>
          )}
        </button>
      </div>
      
      {hasMorePastTasks && (
        <div
          className={styles.loadMoreButton}
          onClick={() => loadMorePastTasks()}
          aria-disabled={isLoadingMore}
        >
          {isLoadingMore ? (
            <>
              <span className={styles.loadingIndicator}></span>
              Loading...
            </>
          ) : 'Load earlier tasks'}
        </div>
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
              key={key}
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
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              movingTaskId={movingTaskId}
              isSelectMode={isSelectMode}
              selectedTaskIds={selectedTaskIds}
              onTaskSelectionToggle={toggleTaskSelection}
            />
          </div>
        );
      })}
      
      {hasMoreFutureTasks && (
        <div
          className={styles.loadMoreButton}
          onClick={() => loadMoreFutureTasks()}
          aria-disabled={isLoadingMore}
        >
          {isLoadingMore ? (
            <>
              <span className={styles.loadingIndicator}></span>
              Loading...
            </>
          ) : 'Load more future tasks'}
        </div>
      )}
      
      {/* Floating "Jump to Today" button */}
      {!isTodayVisible && !isSelectMode && (
        <button
          className={styles.jumpToTodayButton}
          onClick={() => {
            todayRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }}
          aria-label="Jump to today's tasks"
        >
          <span className={styles.jumpToTodayIcon}>↑</span>
          Today
        </button>
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
  );
};