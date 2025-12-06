import React, { useState, useRef, useEffect } from 'react';
import { IconButton } from '../ui/Button';
import styles from './TaskCreation.module.css';

interface TaskCreationProps {
  dayKey: string; // The day for which the task is being created
  onCancel?: () => void;
  onSave?: (taskData: {
    title: string;
    category: string;
    isPriority: boolean;
    dueDate?: string;
  }) => void;
}

export const TaskCreation: React.FC<TaskCreationProps> = ({
  dayKey,
  onCancel,
  onSave,
}) => {
  // State for form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Roo Code');
  const [isPriority, setIsPriority] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle Escape to cancel and click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel?.();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        // Only cancel if title is empty, otherwise preserve the form
        if (!title.trim()) {
          onCancel?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onCancel, title]);

  // Handle form submission
  const handleSubmit = async () => {
    if (!title.trim() || isSubmitting || !onSave) return;

    try {
      setIsSubmitting(true);
      
      await onSave({
        title: title.trim(),
        category,
        isPriority,
        // dueDate is inherited from dayKey context
      });
      
      // Clear form for next task
      setTitle('');
      setIsPriority(false);
      // Keep category for convenience when adding multiple tasks
      
      // Refocus input for adding another task
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Enter key to submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Get category class for styling
  const getCategoryClass = (cat: string): string => {
    return cat.toLowerCase().replace(' ', '');
  };

  return (
    <div ref={containerRef} className={styles.inlineContainer}>
      <div className={styles.inlineForm}>
        {/* Category dropdown styled like category indicator */}
        <select
          className={`${styles.inlineCategorySelect} ${styles[getCategoryClass(category)]}`}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Task category"
          disabled={isSubmitting}
        >
          <option value="Roo Vet">Roo Vet</option>
          <option value="Roo Code">Roo Code</option>
          <option value="Personal">Personal</option>
        </select>
        
        {/* Inline text input for task title */}
        <input
          ref={inputRef}
          type="text"
          className={styles.inlineTitleInput}
          placeholder="Add a task..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Task title"
          disabled={isSubmitting}
        />
        
        {/* Priority toggle - star icon */}
        <IconButton
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M8 1L10.163 5.279L15 6.0907L11.5 9.4201L12.326 14L8 11.8656L3.674 14L4.5 9.4201L1 6.0907L5.837 5.279L8 1Z"
                fill={isPriority ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          }
          variant={isPriority ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setIsPriority(!isPriority)}
          title={isPriority ? 'Remove priority' : 'Mark as priority'}
          aria-label={isPriority ? 'Remove priority' : 'Mark as priority'}
          disabled={isSubmitting}
          className={styles.inlinePriorityToggle}
        />
        
        {/* Submit hint */}
        <span className={styles.inlineSubmitHint}>
          {isSubmitting ? (
            <span className={styles.loadingSpinner} />
          ) : (
            '↵'
          )}
        </span>
      </div>
    </div>
  );
};