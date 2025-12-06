import React, { useState } from 'react';
import { CreateRecipeDTO } from '../../types/recipe';
import { Button } from '../ui/Button';
import styles from './URLImportModal.module.css';

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
            <Button
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={loading}
              loading={loading}
            >
              {loading ? 'Importing...' : 'Import Recipe'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};