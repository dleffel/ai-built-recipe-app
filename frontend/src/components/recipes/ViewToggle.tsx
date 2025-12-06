import React from 'react';
import styles from './ViewToggle.module.css';

export type ViewMode = 'list' | 'grid';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewChange: (mode: ViewMode) => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ viewMode, onViewChange }) => {
  return (
    <div className={styles.container} role="group" aria-label="View mode toggle">
      <button
        className={`${styles.button} ${viewMode === 'list' ? styles.active : ''}`}
        onClick={() => onViewChange('list')}
        aria-pressed={viewMode === 'list'}
        aria-label="List view"
        title="List view"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      </button>
      <button
        className={`${styles.button} ${viewMode === 'grid' ? styles.active : ''}`}
        onClick={() => onViewChange('grid')}
        aria-pressed={viewMode === 'grid'}
        aria-label="Grid view"
        title="Grid view"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      </button>
    </div>
  );
};