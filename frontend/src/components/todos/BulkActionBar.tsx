import React from 'react';
import { Button } from '../ui/Button';
import styles from './BulkActionBar.module.css';

interface BulkActionBarProps {
  selectedCount: number;
  onMoveClick: () => void;
  onCancel: () => void;
  isMoving: boolean;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onMoveClick,
  onCancel,
  isMoving
}) => {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className={styles.bulkActionBar}>
      <div className={styles.selectionInfo}>
        <span className={styles.selectedCount}>
          {selectedCount} task{selectedCount !== 1 ? 's' : ''} selected
        </span>
      </div>
      
      <div className={styles.actions}>
        <Button
          variant="secondary"
          size="sm"
          onClick={onCancel}
          disabled={isMoving}
          aria-label="Cancel selection"
        >
          Cancel
        </Button>
        
        <Button
          variant="primary"
          size="sm"
          onClick={onMoveClick}
          disabled={isMoving || selectedCount === 0}
          loading={isMoving}
          leftIcon={
            !isMoving ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 3H14V5H2V3Z" fill="currentColor"/>
                <path d="M2 7H10V9H2V7Z" fill="currentColor"/>
                <path d="M2 11H8V13H2V11Z" fill="currentColor"/>
                <path d="M12 8L16 12L12 16V13H9V11H12V8Z" fill="currentColor"/>
              </svg>
            ) : undefined
          }
          aria-label="Move selected tasks to a different date"
        >
          {isMoving ? 'Moving...' : 'Move to Date'}
        </Button>
      </div>
    </div>
  );
};