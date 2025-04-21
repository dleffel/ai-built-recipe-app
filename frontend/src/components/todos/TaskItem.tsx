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
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleComplete,
  onEdit,
  onDragStart,
  onDragOver,
  onDrop
}) => {
  return (
    <div
      className={`${styles.taskItem} ${task.status === 'complete' ? styles.completed : ''}`}
      data-id={task.id}
      draggable={true}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className={styles.dragHandle} title="Drag to reorder">
        ⋮⋮
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
          {task.category.substring(0, 2)}
        </span>
        
        {/* Task title */}
        <span className={`${styles.taskTitle} ${task.isRolledOver ? styles.rolledOver : ''}`}>
          {task.title}
          {task.isRolledOver && (
            <span className={styles.rolledOverIndicator} title="Rolled over from previous day">
              *
            </span>
          )}
        </span>
      </div>
      
      {/* Priority indicator */}
      {task.isPriority && (
        <div className={styles.priorityIndicator} title="High priority">
          ★
        </div>
      )}
      
      {/* Edit button */}
      <button 
        className={styles.actionButton} 
        onClick={onEdit}
        aria-label="Edit task"
      >
        ✎
      </button>
    </div>
  );
};