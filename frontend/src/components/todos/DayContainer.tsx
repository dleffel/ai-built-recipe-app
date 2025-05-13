import React, { forwardRef } from 'react';
import { Task } from '../../services/todoApi';
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
  movingTaskId = null
}, ref) => {
  // Format date for display using date-fns-tz for consistent timezone handling
  const formatDate = (date: Date): string => {
    return formatInTimeZone(date, 'America/Los_Angeles', 'EEEE, MMMM d');
  };
  
  // Count completed and total tasks
  const completedTasks = tasks.filter(task => task.status === 'complete').length;
  const totalTasks = tasks.length;
  const hasCompletedTasks = completedTasks > 0;
  
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
        
        {totalTasks > 0 && (
          <div className={styles.taskCounter} title={`${completedTasks} of ${totalTasks} tasks completed`}>
            <span className={styles.completedCount}>{completedTasks}</span>
            <span className={styles.countDivider}>/</span>
            <span className={styles.totalCount}>{totalTasks}</span>
          </div>
        )}
      </div>
      
      <div className={styles.taskList}>
        {tasks.map(task => (
          editingTaskId === task.id ? (
            <TaskEdit
              key={task.id}
              id={task.id}
              title={task.title}
              category={task.category as 'Roo Vet' | 'Roo Code' | 'Personal'}
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
            />
          )
        ))}
        
        {tasks.length === 0 && (
          <div className={styles.emptyState}>
            {isToday ? 'No tasks for today. Add a task to get started.' : 'No tasks scheduled.'}
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
      
      <button
        className={styles.addTaskButton}
        onClick={() => onAddTaskClick(dayKey)}
        aria-label="Add new task"
      >
        <svg className={styles.addTaskIcon} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 3V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        Add task
      </button>
    </div>
  );
});