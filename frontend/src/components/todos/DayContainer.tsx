import React, { forwardRef } from 'react';
import { Task } from '../../services/todoApi';
import { TaskCategory } from '../../types/task';
import { TaskItem } from './TaskItem';
import { TaskEdit } from './TaskEdit';
import { TaskCreation } from './TaskCreation';
import styles from './TaskListContainer.module.css';
import './TodoVariables.css';
import { formatInTimeZone } from 'date-fns-tz';

interface DayContainerProps {
  dayKey: string;
  date: Date;
  isToday: boolean;
  tasks: Task[];
  editingTaskId: string | null;
  creatingTaskForDay: string | null;
  onToggleComplete: (task: Task) => void;
  onEdit: (taskId: string) => void;
  onUpdate: (taskData: any) => void;
  onDelete: (taskId: string) => void;
  onAddTaskClick: (day: string) => void;
  onCreateTask: (day: string, taskData: any) => void;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onDragOver: (e: React.DragEvent, dayKey: string) => void;
  onDrop: (e: React.DragEvent, dayKey: string) => void;
  className?: string; // Optional class name for animation
  movingTaskId?: string | null; // ID of task being moved for animation
  // Bulk selection props
  isSelectMode?: boolean;
  selectedTaskIds?: Set<string>;
  onTaskSelectionToggle?: (taskId: string) => void;
}

export const DayContainer = forwardRef<HTMLDivElement, DayContainerProps>(({
  dayKey,
  date,
  isToday,
  tasks,
  editingTaskId,
  creatingTaskForDay,
  onToggleComplete,
  onEdit,
  onUpdate,
  onDelete,
  onAddTaskClick,
  onCreateTask,
  onDragStart,
  onDragOver,
  onDrop,
  className = '',
  movingTaskId = null,
  isSelectMode = false,
  selectedTaskIds = new Set(),
  onTaskSelectionToggle
}, ref) => {
  // Format date for display using date-fns-tz for consistent timezone handling
  const formatDate = (date: Date): string => {
    return formatInTimeZone(date, 'America/Los_Angeles', 'EEEE, MMMM d');
  };
  
  return (
    <div
      ref={ref}
      className={`${styles.dayContainer} ${className}`}
      data-day={dayKey}
      onDragOver={(e) => onDragOver(e, dayKey)}
      onDrop={(e) => onDrop(e, dayKey)}
    >
      <div className={styles.dayHeader}>
        <h2 className={`${styles.dayTitle} ${isToday ? styles.today : ''}`}>
          {isToday ? 'TODAY - ' : ''}{formatDate(date)}
        </h2>
        
        <button
          className={styles.headerAddButton}
          onClick={() => onAddTaskClick(dayKey)}
          aria-label="Add new task"
          title="Add task"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 3V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
      
      <div className={styles.taskList}>
        {tasks.map(task => (
          editingTaskId === task.id ? (
            <TaskEdit
              key={task.id}
              id={task.id}
              title={task.title}
              category={task.category}
              isPriority={task.isPriority}
              dueDate={task.dueDate}
              onCancel={() => onEdit('')}
              onSave={onUpdate}
              onDelete={() => onDelete(task.id)}
            />
          ) : (
            <TaskItem
              key={task.id}
              task={task}
              onToggleComplete={() => onToggleComplete(task)}
              onEdit={() => onEdit(task.id)}
              onDragStart={(e) => onDragStart(e, task)}
              onDragOver={(e) => onDragOver(e, dayKey)}
              onDrop={(e) => onDrop(e, dayKey)}
              isMoving={movingTaskId === task.id}
              isSelectMode={isSelectMode}
              isSelected={selectedTaskIds.has(task.id)}
              onSelectionToggle={() => onTaskSelectionToggle?.(task.id)}
            />
          )
        ))}
        
        {tasks.length === 0 && (
          <div className={styles.emptyState}>
            No tasks
          </div>
        )}
        
        {creatingTaskForDay === dayKey && (
          <TaskCreation
            dayKey={dayKey}
            onCancel={() => onAddTaskClick(dayKey)}
            onSave={(taskData) => onCreateTask(dayKey, taskData)}
          />
        )}
      </div>
    </div>
  );
});