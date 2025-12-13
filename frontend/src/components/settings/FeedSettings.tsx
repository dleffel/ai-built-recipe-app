import React, { useState, useEffect, useCallback } from 'react';
import { Tag } from '../../types/contact';
import { tagApi } from '../../services/tagApi';
import { settingsApi, UserSettings } from '../../services/settingsApi';
import { Button } from '../ui/Button';
import styles from './FeedSettings.module.css';

/**
 * Feed Settings Component
 * Allows users to configure which contact tags to hide from the activity feed
 */
export const FeedSettings: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch tags and settings in parallel
      const [tagsResponse, settingsResponse] = await Promise.all([
        tagApi.getUserTags(),
        settingsApi.getUserSettings(),
      ]);

      setTags(tagsResponse.tags);
      setSettings(settingsResponse);
      setSelectedTagIds(new Set(settingsResponse.hiddenFeedTags));
    } catch (err) {
      console.error('Error fetching feed settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Check if there are unsaved changes
  useEffect(() => {
    if (!settings) {
      setHasChanges(false);
      return;
    }

    const originalSet = new Set(settings.hiddenFeedTags);
    const hasChanged =
      selectedTagIds.size !== originalSet.size ||
      [...selectedTagIds].some((id) => !originalSet.has(id));

    setHasChanges(hasChanged);
  }, [selectedTagIds, settings]);

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tagId)) {
        newSet.delete(tagId);
      } else {
        newSet.add(tagId);
      }
      return newSet;
    });
    // Clear success message when user makes changes
    setSuccess(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const updatedSettings = await settingsApi.updateUserSettings({
        hiddenFeedTags: [...selectedTagIds],
      });

      setSettings(updatedSettings);
      setSelectedTagIds(new Set(updatedSettings.hiddenFeedTags));
      setSuccess('Settings saved successfully');
    } catch (err) {
      console.error('Error saving feed settings:', err);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (settings) {
      setSelectedTagIds(new Set(settings.hiddenFeedTags));
      setSuccess(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>Feed Settings</h2>
        <div className={styles.loading}>Loading settings...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Feed Settings</h2>
        <p className={styles.description}>
          Configure which contacts appear in your activity feed on the home page.
        </p>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
          <button
            className={styles.dismissError}
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            x
          </button>
        </div>
      )}

      {success && (
        <div className={styles.success}>
          {success}
          <button
            className={styles.dismissSuccess}
            onClick={() => setSuccess(null)}
            aria-label="Dismiss success message"
          >
            x
          </button>
        </div>
      )}

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Hidden Tags</h3>
        <p className={styles.sectionDescription}>
          Select tags to hide from the activity feed. Contacts with any of these tags
          will not appear in your home page feed.
        </p>

        {tags.length === 0 ? (
          <div className={styles.emptyTags}>
            <p>No tags found.</p>
            <p>Create tags on your contacts to use this feature.</p>
          </div>
        ) : (
          <>
            <div className={styles.tagList}>
              {tags.map((tag) => (
                <label key={tag.id} className={styles.tagItem}>
                  <input
                    type="checkbox"
                    className={styles.tagCheckbox}
                    checked={selectedTagIds.has(tag.id)}
                    onChange={() => handleTagToggle(tag.id)}
                  />
                  <span className={styles.tagLabel}>{tag.name}</span>
                </label>
              ))}
            </div>

            <div className={styles.actions}>
              <Button
                variant="secondary"
                size="md"
                onClick={handleReset}
                disabled={!hasChanges || saving}
              >
                Reset
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSave}
                loading={saving}
                disabled={!hasChanges}
              >
                Save Changes
              </Button>
            </div>
          </>
        )}
      </div>

      <div className={styles.info}>
        <h3>How it works</h3>
        <ul>
          <li>Select tags above to hide contacts with those tags from your feed</li>
          <li>Contacts with any of the selected tags will be hidden</li>
          <li>This only affects the activity feed on the home page</li>
          <li>Hidden contacts are still accessible from the Contacts section</li>
          <li>Changes take effect immediately after saving</li>
        </ul>
      </div>
    </div>
  );
};

export default FeedSettings;
