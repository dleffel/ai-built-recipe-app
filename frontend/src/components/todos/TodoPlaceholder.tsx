import React from 'react';
import styles from './TodoPlaceholder.module.css';

export const TodoPlaceholder: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h2 className={styles.title}>Todo Module</h2>
        <p className={styles.message}>
          The Todo module is coming soon! Stay tuned for updates.
        </p>
        <div className={styles.icon}>📝</div>
      </div>
    </div>
  );
};