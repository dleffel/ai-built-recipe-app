import React, { useState } from 'react';
import styles from './URLImportModal.module.css';
import { CreateRecipeDTO } from '../types/recipe';

interface URLImportModalProps {
  onImport: (url: string) => Promise<CreateRecipeDTO>;
  onClose: () => void;
  onSuccess: (recipe: CreateRecipeDTO) => void;
}

export const URLImportModal: React.FC<URLImportModalProps> = ({
  onImport,
  onClose,
  onSuccess
}) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const recipe = await onImport(url.trim());
      onSuccess(recipe);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import recipe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2>Import Recipe from URL</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="url">Recipe URL</label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/recipe"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <div className={styles.buttons}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.importButton}
              disabled={loading}
            >
              {loading ? 'Importing...' : 'Import Recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
