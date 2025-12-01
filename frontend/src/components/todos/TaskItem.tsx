import React from 'react';
import { Task } from '../../services/todoApi';
import styles from './TaskItem.module.css';

interface TaskItemProps {
  task: Task;
  onToggleComplete: () => void;
  onEdit: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isMoving?: boolean; // Flag to indicate if this task is being moved
  isSelectMode?: boolean; // Flag to indicate if bulk select mode is active
  isSelected?: boolean; // Flag to indicate if this task is selected
  onSelectionToggle?: () => void; // Callback to toggle selection
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleComplete,
  onEdit,
  onDragStart,
  onDragOver,
  onDrop,
  isMoving = false,
  isSelectMode = false,
  isSelected = false,
  onSelectionToggle
}) => {
  // Handle click on selection checkbox
  const handleSelectionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionToggle?.();
  };

  return (
    <div
      className={`${styles.taskItem} ${task.status === 'complete' ? styles.completed : ''} ${isMoving ? styles.moving : ''} ${isSelectMode ? styles.selectMode : ''} ${isSelected ? styles.selected : ''}`}
      data-id={task.id}
      draggable={!isSelectMode}
      onDragStart={isSelectMode ? undefined : onDragStart}
      onDragOver={isSelectMode ? undefined : onDragOver}
      onDrop={isSelectMode ? undefined : onDrop}
    >
      {/* Selection checkbox - only visible in select mode */}
      {isSelectMode && (
        <input
          type="checkbox"
          className={styles.selectionCheckbox}
          checked={isSelected}
          onChange={() => onSelectionToggle?.()}
          onClick={handleSelectionClick}
          aria-label={`Select "${task.title}" for bulk action`}
        />
      )}
      
      <div className={`${styles.dragHandle} ${isSelectMode ? styles.hidden : ''}`} title="Drag to reorder">
        <div className={styles.dragHandleIcon}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="4" cy="4" r="1.5" fill="currentColor" />
            <circle cx="4" cy="8" r="1.5" fill="currentColor" />
            <circle cx="4" cy="12" r="1.5" fill="currentColor" />
            <circle cx="12" cy="4" r="1.5" fill="currentColor" />
            <circle cx="12" cy="8" r="1.5" fill="currentColor" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          </svg>
        </div>
      </div>
      
      <input
        type="checkbox"
        className={styles.checkbox}
        checked={task.status === 'complete'}
        onChange={onToggleComplete}
        aria-label={`Mark "${task.title}" as ${task.status === 'complete' ? 'incomplete' : 'complete'}`}
      />
      
      {/* Task content */}
      <div className={styles.taskContent}>
        {/* Category indicator */}
        <span
          className={`${styles.categoryIndicator} ${styles[task.category.toLowerCase().replace(' ', '')]}`}
          title={task.category}
        >
          <span className={styles.categoryFullName}>{task.category}</span>
          <span className={styles.categoryAbbr}>
            {task.category === 'Roo Vet' && 'VET'}
            {task.category === 'Roo Code' && 'CODE'}
            {task.category === 'Personal' && 'PERS'}
          </span>
        </span>
        
        {/* Task title */}
        <span
          className={`${styles.taskTitle} ${task.isRolledOver ? styles.rolledOver : ''}`}
          onClick={onToggleComplete}
          role="button"
          aria-label={`Toggle completion of task: ${task.title}`}
        >
          {task.title}
          {task.isRolledOver && (
            <span className={styles.rolledOverIndicator} title="Rolled over from previous day">
              rolled over
            </span>
          )}
        </span>
      </div>
      
      {/* Priority indicator */}
      {task.isPriority && (
        <div className={styles.priorityIndicator} title="High priority">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 1L10.163 5.279L15 6.0907L11.5 9.4201L12.326 14L8 11.8656L3.674 14L4.5 9.4201L1 6.0907L5.837 5.279L8 1Z" fill="currentColor" />
          </svg>
        </div>
      )}
      
      {/* Edit button */}
      <button
        className={styles.actionButton}
        onClick={onEdit}
        aria-label="Edit task"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11.7071 2.29289C12.0976 2.68342 12.0976 3.31658 11.7071 3.70711L4.70711 10.7071C4.51957 10.8946 4.26522 11 4 11H3C2.44772 11 2 10.5523 2 10V9C2 8.73478 2.10536 8.48043 2.29289 8.29289L9.29289 1.29289C9.68342 0.902369 10.3166 0.902369 10.7071 1.29289L11.7071 2.29289Z" fill="currentColor" />
          <path d="M2 13C2 12.4477 2.44772 12 3 12H13C13.5523 12 14 12.4477 14 13C14 13.5523 13.5523 14 13 14H3C2.44772 14 2 13.5523 2 13Z" fill="currentColor" />
        </svg>
        <span className={styles.actionButtonLabel}>Edit</span>
      </button>
    </div>
  );
};