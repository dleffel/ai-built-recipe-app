import React from 'react';
import styles from './TagPill.module.css';

interface TagPillProps {
  name: string;
  size?: 'sm' | 'md';
  onRemove?: () => void;
  className?: string;
}

export const TagPill: React.FC<TagPillProps> = ({
  name,
  size = 'sm',
  onRemove,
  className = '',
}) => {
  return (
    <span className={`${styles.pill} ${styles[size]} ${className}`}>
      <span className={styles.name}>{name}</span>
      {onRemove && (
        <button
          type="button"
          className={styles.removeButton}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove tag ${name}`}
        >
          &times;
        </button>
      )}
    </span>
  );
};

export default TagPill;
