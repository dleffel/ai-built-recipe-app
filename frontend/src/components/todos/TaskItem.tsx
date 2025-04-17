import React from 'react';
import styles from './TaskItem.module.css';

// Define the task category types
type TaskCategory = 'Roo Vet' | 'Roo Code' | 'Personal';

// Interface for the TaskItem props
interface TaskItemProps {
  id?: string;
  title: string;
  completed?: boolean;
  category: TaskCategory;
  isPriority?: boolean;
  isRolledOver?: boolean;
  onToggleComplete?: () => void;
  onEdit?: () => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  draggable?: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  id,
  title,
  completed = false,
  category,
  isPriority = false,
  isRolledOver = false,
  onToggleComplete,
  onEdit,
  onDragStart,
  onDragEnd,
  draggable = true,
}) => {
  // Function to get the CSS class for the category
  const getCategoryClass = (category: TaskCategory): string => {
    switch (category) {
      case 'Roo Vet':
        return styles.rooVet;
      case 'Roo Code':
        return styles.rooCode;
      case 'Personal':
        return styles.personal;
      default:
        return '';
    }
  };

  // Function to get the abbreviated category name for mobile
  const getAbbreviatedCategory = (category: TaskCategory): string => {
    switch (category) {
      case 'Roo Vet':
        return 'RV';
      case 'Roo Code':
        return 'RC';
      case 'Personal':
        return 'P';
      default:
        return '';
    }
  };

  return (
    <div
      className={`${styles.taskItem} ${completed ? styles.completed : ''}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-id={id}
      data-category={category}
      data-priority={isPriority ? 'true' : 'false'}
      data-rolled-over={isRolledOver ? 'true' : 'false'}
    >
      <div className={styles.dragHandle}>
        ⋮⋮
      </div>
      
      <input
        type="checkbox"
        className={styles.checkbox}
        checked={completed}
        onChange={onToggleComplete}
        aria-label={`Mark "${title}" as ${completed ? 'incomplete' : 'complete'}`}
      />
      
      <div className={styles.taskContent}>
        <div>
          <span
            className={`${styles.categoryIndicator} ${getCategoryClass(category)}`}
            title={category}
          >
            {getAbbreviatedCategory(category)}
          </span>
          
          <span
            className={`${styles.taskTitle} ${isRolledOver ? styles.rolledOver : ''}`}
          >
            {title}
            {isRolledOver && (
              <span className={styles.rolledOverIndicator} title="Rolled over from previous day">
                *
              </span>
            )}
          </span>
        </div>
      </div>
      
      {isPriority && (
        <div className={styles.priorityIndicator} title="High priority">
          ★
        </div>
      )}
      
      <div className={styles.taskActions}>
        <button
          className={styles.actionButton}
          onClick={onEdit}
          aria-label="Edit task"
        >
          ✎
        </button>
      </div>
    </div>
  );
};