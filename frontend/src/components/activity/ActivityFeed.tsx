import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ActivityFeedItem as ActivityFeedItemType } from '../../types/activity';
import { activityApi } from '../../services/activityApi';
import { ActivityFeedItem } from './ActivityFeedItem';
import { Button } from '../ui/Button';
import styles from './ActivityFeed.module.css';

interface ActivityFeedProps {
  limit?: number;
}

interface ToastState {
  contactId: string;
  contactName: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ limit = 20 }) => {
  const [activities, setActivities] = useState<ActivityFeedItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await activityApi.getRecentActivity(limit);
      setActivities(response.activities);
    } catch (err) {
      console.error('Error fetching activity feed:', err);
      setError('Failed to load recent activity');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Cleanup toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const handleHideContact = async (contactId: string, contactName: string) => {
    try {
      await activityApi.hideContact(contactId);
      
      // Remove activities for this contact from the list
      setActivities(prev => prev.filter(a => a.contact?.id !== contactId));
      
      // Clear any existing toast timeout
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      
      // Show undo toast
      setToast({ contactId, contactName });
      
      // Auto-dismiss after 5 seconds
      toastTimeoutRef.current = setTimeout(() => {
        setToast(null);
      }, 5000);
    } catch (err) {
      console.error('Error hiding contact:', err);
    }
  };

  const handleUndo = async () => {
    if (!toast) return;
    
    try {
      await activityApi.unhideContact(toast.contactId);
      
      // Clear the toast
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      setToast(null);
      
      // Refresh the feed to show the contact again
      fetchActivities();
    } catch (err) {
      console.error('Error unhiding contact:', err);
    }
  };

  const dismissToast = () => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast(null);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>Recent Activity</h2>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <span>Loading activity...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>Recent Activity</h2>
        <div className={styles.error}>
          <span>{error}</span>
          <button onClick={fetchActivities} className={styles.retryButton}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>Recent Activity</h2>
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📋</span>
          <p className={styles.emptyText}>No recent activity</p>
          <p className={styles.emptySubtext}>
            Your recent contact edits and task updates will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Recent Activity</h2>
      <div className={styles.feedList}>
        {activities.map((activity) => (
          <ActivityFeedItem
            key={activity.id}
            activity={activity}
            onHideContact={activity.contact ? handleHideContact : undefined}
          />
        ))}
      </div>
      
      {toast && (
        <div className={styles.toast} role="alert">
          <span className={styles.toastMessage}>
            {toast.contactName} hidden from feed
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            className={styles.undoButton}
          >
            Undo
          </Button>
          <button
            className={styles.toastDismiss}
            onClick={dismissToast}
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;