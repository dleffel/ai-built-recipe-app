import React from 'react';
import { useTaskDragDrop } from './DragDropContext';
import styles from './DragDropFeedback.module.css';

export const DragDropFeedback: React.FC = () => {
  const { isDragging, draggedTask } = useTaskDragDrop();

  if (!isDragging || !draggedTask) {
    return null;
  }

  // Get the category class
  const getCategoryClass = (category: string): string => {
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

  return (
    <div className={styles.dragFeedback}>
      <div className={`${styles.categoryIndicator} ${getCategoryClass(draggedTask.category)}`}>
        {draggedTask.category === 'Roo Vet' ? 'RV' : 
         draggedTask.category === 'Roo Code' ? 'RC' : 'P'}
      </div>
      <span className={styles.taskTitle}>
        {draggedTask.title}
      </span>
      {draggedTask.isPriority && (
        <span className={styles.priorityIndicator}>★</span>
      )}
    </div>
  );
};