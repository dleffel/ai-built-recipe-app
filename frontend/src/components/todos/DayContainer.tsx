import React, { forwardRef } from 'react';
import { Task } from '../../services/todoApi';
import { TaskItem } from './TaskItem';
import { TaskEdit } from './TaskEdit';
import { TaskCreation } from './TaskCreation';
import styles from './TaskListContainer.module.css';

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
  onDrop
}, ref) => {
  // Format date for display
  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
  };
  
  return (
    <div
      ref={ref}
      className={`${styles.dayContainer}`}
      data-day={dayKey}
      onDragOver={(e) => onDragOver(e, dayKey)}
      onDrop={(e) => onDrop(e, dayKey)}
    >
      <div className={styles.dayHeader}>
        <h2 className={`${styles.dayTitle} ${isToday ? styles.today : ''}`}>
          {isToday ? 'TODAY - ' : ''}{formatDate(date)}
        </h2>
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
            onCancel={() => onAddTaskClick(dayKey)}
            onSave={(taskData) => onCreateTask(dayKey, taskData)}
          />
        )}
      </div>
      
      <button
        className={styles.addTaskButton}
        onClick={() => onAddTaskClick(dayKey)}
      >
        <span className={styles.addTaskIcon}>+</span> Add task
      </button>
    </div>
  );
});