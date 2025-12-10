import React, { useState, useEffect } from 'react';
import { ActivityFeedItem as ActivityFeedItemType } from '../../types/activity';
import { activityApi } from '../../services/activityApi';
import { ActivityFeedItem } from './ActivityFeedItem';
import styles from './ActivityFeed.module.css';

interface ActivityFeedProps {
  limit?: number;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ limit = 20 }) => {
  const [activities, setActivities] = useState<ActivityFeedItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActivities();
  }, [limit]);

  const fetchActivities = async () => {
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
          <ActivityFeedItem key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed;