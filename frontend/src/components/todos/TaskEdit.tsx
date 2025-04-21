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

  // Update state when props change
  useEffect(() => {
    setTitle(initialTitle);
    setCategory(initialCategory);
    setIsPriority(initialIsPriority);
  }, [initialTitle, initialCategory, initialIsPriority]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && onSave) {
      onSave({
        id,
        title: title.trim(),
        category,
        isPriority,
      });
    }
  };

  // Handle delete
  const handleDelete = () => {
    if (onDelete) {
      if (window.confirm('Are you sure you want to delete this task?')) {
        onDelete(id);
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
        
        <div className={styles.buttonRow}>
          <button
            type="button"
            className={`${styles.button} ${styles.deleteButton}`}
            onClick={handleDelete}
            aria-label="Delete task"
          >
            Delete
          </button>
          
          <div className={styles.actionButtons}>
            <button
              type="button"
              className={`${styles.button} ${styles.cancelButton}`}
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`${styles.button} ${styles.saveButton}`}
              disabled={!title.trim()}
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};