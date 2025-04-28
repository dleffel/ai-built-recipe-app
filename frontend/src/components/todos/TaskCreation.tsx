import React, { useState } from 'react';
import styles from './TaskCreation.module.css';

interface TaskCreationProps {
  onCancel?: () => void;
  onSave?: (taskData: {
    title: string;
    category: string;
    isPriority: boolean;
  }) => void;
  // These props will be used when functionality is implemented
  // For now, they're just placeholders
}

export const TaskCreation: React.FC<TaskCreationProps> = ({
  onCancel,
  onSave,
}) => {
  // State for form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Roo Code');
  const [isPriority, setIsPriority] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && onSave) {
      try {
        setIsSubmitting(true);
        setFeedback(null);
        
        await onSave({
          title: title.trim(),
          category,
          isPriority,
        });
        
        // Show success feedback briefly
        setFeedback({
          type: 'success',
          message: 'Task created successfully'
        });
        
        // Clear feedback after a delay
        setTimeout(() => {
          setFeedback(null);
        }, 2000);
      } catch (error) {
        setFeedback({
          type: 'error',
          message: 'Failed to create task'
        });
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.inputRow}>
          <input
            type="text"
            className={styles.titleInput}
            placeholder="What needs to be done?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            aria-label="Task title"
          />
        </div>
        
        <div className={styles.optionsRow}>
          <select
            className={styles.categorySelect}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Task category"
          >
            <option value="Roo Vet">Roo Vet</option>
            <option value="Roo Code">Roo Code</option>
            <option value="Personal">Personal</option>
          </select>
          
          <label className={styles.priorityToggle}>
            <input
              type="checkbox"
              className={styles.priorityCheckbox}
              checked={isPriority}
              onChange={(e) => setIsPriority(e.target.checked)}
              aria-label="High priority"
            />
            High Priority
          </label>
        </div>
        
        {feedback && (
          <div className={feedback.type === 'success' ? styles.successFeedback : styles.errorFeedback}>
            {feedback.type === 'success' ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 0C3.6 0 0 3.6 0 8C0 12.4 3.6 16 8 16C12.4 16 16 12.4 16 8C16 3.6 12.4 0 8 0ZM7 11.4L3.6 8L5 6.6L7 8.6L11 4.6L12.4 6L7 11.4Z" fill="currentColor"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 0C3.6 0 0 3.6 0 8C0 12.4 3.6 16 8 16C12.4 16 16 12.4 16 8C16 3.6 12.4 0 8 0ZM12 10.9L10.9 12L8 9.1L5.1 12L4 10.9L6.9 8L4 5.1L5.1 4L8 6.9L10.9 4L12 5.1L9.1 8L12 10.9Z" fill="currentColor"/>
              </svg>
            )}
            {feedback.message}
          </div>
        )}
        
        <div className={styles.buttonRow}>
          <button
            type="button"
            className={`${styles.button} ${styles.cancelButton}`}
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`${styles.button} ${styles.saveButton} ${isSubmitting ? styles.loadingButton : ''}`}
            disabled={!title.trim() || isSubmitting}
          >
            Add Task
          </button>
        </div>
      </form>
    </div>
  );
};