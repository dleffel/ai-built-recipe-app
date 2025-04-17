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

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && onSave) {
      onSave({
        title: title.trim(),
        category,
        isPriority,
      });
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
        
        <div className={styles.buttonRow}>
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
            Add Task
          </button>
        </div>
      </form>
    </div>
  );
};