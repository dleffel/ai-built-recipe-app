import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { GroupedContactActivityInfo, ActivityFeedItem as ActivityFeedItemType } from '../../types/activity';
import { ActivityFeedItem } from './ActivityFeedItem';
import styles from './GroupedActivityFeedItem.module.css';

interface GroupedActivityFeedItemProps {
  groupedContact: GroupedContactActivityInfo;
}

/**
 * Format a timestamp to a relative time string (e.g., "2 hours ago")
 */
const formatRelativeTime = (timestamp: string): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
};

/**
 * Format a time range string for grouped activities
 */
const formatTimeRange = (earliest: string, latest: string): string => {
  const earliestDate = new Date(earliest);
  const latestDate = new Date(latest);
  
  // If same day, just show the date with time range
  if (earliestDate.toDateString() === latestDate.toDateString()) {
    return formatRelativeTime(latest);
  }
  
  // Different days - show range
  return `${formatRelativeTime(latest)} - ${formatRelativeTime(earliest)}`;
};

export const GroupedActivityFeedItem: React.FC<GroupedActivityFeedItemProps> = ({
  groupedContact,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const { id, name, editCount, activities, latestTimestamp, earliestTimestamp } = groupedContact;

  return (
    <div className={styles.groupedItem}>
      <div className={styles.groupHeader}>
        <span className={styles.groupIcon}>✏️</span>
        <div className={styles.groupText}>
          <span className={styles.groupDescription}>
            <Link to={`/contacts/${id}`} className={styles.entityLink}>
              {name}
            </Link>
            {' '}
            <span className={styles.updateCount}>{editCount} updates</span>
          </span>
          <span className={styles.groupTime}>
            {formatTimeRange(earliestTimestamp, latestTimestamp)}
          </span>
        </div>
      </div>

      <button
        className={styles.expandButton}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        {isExpanded ? 'Hide details' : 'Show details'}
        <span className={`${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}>
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      {isExpanded && (
        <div className={styles.expandedContent}>
          {activities.map((activity: ActivityFeedItemType) => (
            <div key={activity.id} className={styles.nestedItem}>
              <ActivityFeedItem activity={activity} isNested />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupedActivityFeedItem;
