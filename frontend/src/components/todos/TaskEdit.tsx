import React, { useState, useEffect } from 'react';
import styles from './TaskEdit.module.css';

// Define the task category types
type TaskCategory = 'Roo Vet' | 'Roo Code' | 'Personal';

interface TaskEditProps {
  id: string;
  title: string;
  category: TaskCategory;
  isPriority: boolean;
  onCancel?: () => void;
  onSave?: (taskData: {
    id: string;
    title: string;
    category: string;
    isPriority: boolean;
  }) => void;
  onDelete?: (id: string) => void;
  // These props will be used when functionality is implemented
  // For now, they're just placeholders
}

export const TaskEdit: React.FC<TaskEditProps> = ({
  id,
  title: initialTitle,
  category: initialCategory,
  isPriority: initialIsPriority,
  onCancel,
  onSave,
  onDelete,
}) => {
  // State for form fields
  const [title, setTitle] = useState(initialTitle);
  const [category, setCategory] = useState(initialCategory);
  const [isPriority, setIsPriority] = useState(initialIsPriority);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Update state when props change
  useEffect(() => {
    setTitle(initialTitle);
    setCategory(initialCategory);
    setIsPriority(initialIsPriority);
  }, [initialTitle, initialCategory, initialIsPriority]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && onSave) {
      try {
        setIsSubmitting(true);
        setFeedback(null);
        
        await onSave({
          id,
          title: title.trim(),
          category,
          isPriority,
        });
        
        // Show success feedback briefly
        setFeedback({
          type: 'success',
          message: 'Task updated successfully'
        });
        
        // Clear feedback after a delay
        setTimeout(() => {
          setFeedback(null);
        }, 2000);
      } catch (error) {
        setFeedback({
          type: 'error',
          message: 'Failed to update task'
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (onDelete) {
      if (window.confirm('Are you sure you want to delete this task?')) {
        try {
          setIsDeleting(true);
          setFeedback(null);
          
          await onDelete(id);
          
          // Success feedback will be brief as the component will unmount
          setFeedback({
            type: 'success',
            message: 'Task deleted successfully'
          });
        } catch (error) {
          setFeedback({
            type: 'error',
            message: 'Failed to delete task'
          });
          setIsDeleting(false);
        }
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
            placeholder="Task title"
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
            onChange={(e) => setCategory(e.target.value as TaskCategory)}
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
            className={`${styles.button} ${styles.deleteButton} ${isDeleting ? styles.loadingButton : ''}`}
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label="Delete task"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.5 7V12H6.5V7H5.5ZM9.5 7V12H10.5V7H9.5Z" fill="currentColor"/>
              <path d="M2 3V4H3V14C3 14.2652 3.10536 14.5196 3.29289 14.7071C3.48043 14.8946 3.73478 15 4 15H12C12.2652 15 12.5196 14.8946 12.7071 14.7071C12.8946 14.5196 13 14.2652 13 14V4H14V3H2ZM4 14V4H12V14H4Z" fill="currentColor"/>
              <path d="M6 1H10V2H6V1Z" fill="currentColor"/>
            </svg>
            Delete
          </button>
          
          <div className={styles.actionButtons}>
            <button
              type="button"
              className={`${styles.button} ${styles.cancelButton}`}
              onClick={onCancel}
              disabled={isSubmitting || isDeleting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`${styles.button} ${styles.saveButton} ${isSubmitting ? styles.loadingButton : ''}`}
              disabled={!title.trim() || isSubmitting || isDeleting}
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};