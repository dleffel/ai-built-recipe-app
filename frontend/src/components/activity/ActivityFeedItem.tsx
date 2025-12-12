import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ActivityFeedItem as ActivityFeedItemType } from '../../types/activity';
import { ContactChanges } from '../../types/contact';
import styles from './ActivityFeedItem.module.css';

interface ActivityFeedItemProps {
  activity: ActivityFeedItemType;
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
 * Get the icon for an activity type
 */
const getActivityIcon = (type: ActivityFeedItemType['type']): string => {
  switch (type) {
    case 'contact_created':
      return '👤';
    case 'contact_edited':
      return '✏️';
    case 'task_created':
      return '📝';
    case 'task_completed':
      return '✅';
    case 'task_updated':
      return '🔄';
    default:
      return '📌';
  }
};

/**
 * Get a human-readable label for a field name
 */
const getFieldLabel = (field: string): string => {
  const labels: Record<string, string> = {
    firstName: 'first name',
    lastName: 'last name',
    company: 'company',
    title: 'title',
    linkedInUrl: 'LinkedIn URL',
    notes: 'notes',
    emails: 'emails',
    phones: 'phones',
    tags: 'tags',
  };
  return labels[field] || field;
};

/**
 * Format a value for display
 */
const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') {
    return '(empty)';
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '(none)';
    }
    // Handle email/phone arrays
    if (value[0] && typeof value[0] === 'object') {
      if ('email' in value[0]) {
        return value.map((e: any) => e.email).join(', ');
      }
      if ('phone' in value[0]) {
        return value.map((p: any) => p.phone).join(', ');
      }
    }
    return value.join(', ');
  }
  if (typeof value === 'string') {
    return value;
  }
  return String(value);
};

/**
 * Get a summary of changes for display
 */
const getChangeSummary = (changes: ContactChanges): string => {
  const changedFields = Object.keys(changes);
  if (changedFields.length === 0) {
    return 'made changes';
  }
  if (changedFields.length === 1) {
    return `updated ${getFieldLabel(changedFields[0])}`;
  }
  if (changedFields.length === 2) {
    return `updated ${getFieldLabel(changedFields[0])} and ${getFieldLabel(changedFields[1])}`;
  }
  return `updated ${getFieldLabel(changedFields[0])} and ${changedFields.length - 1} other fields`;
};

export const ActivityFeedItem: React.FC<ActivityFeedItemProps> = ({ activity }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderContactActivity = () => {
    if (!activity.contact) return null;

    const { contact } = activity;
    const hasChanges = contact.changes && Object.keys(contact.changes).length > 0;

    return (
      <div className={styles.activityContent}>
        <div className={styles.activityHeader}>
          <span className={styles.activityIcon}>{getActivityIcon(activity.type)}</span>
          <div className={styles.activityText}>
            <span className={styles.activityDescription}>
              {activity.type === 'contact_edited' ? (
                <>
                  <Link to={`/contacts/${contact.id}`} className={styles.entityLink}>
                    {contact.name}
                  </Link>
                  {' '}
                  {hasChanges ? getChangeSummary(contact.changes!) : 'was updated'}
                </>
              ) : (
                <>
                  <Link to={`/contacts/${contact.id}`} className={styles.entityLink}>
                    {contact.name}
                  </Link>
                  {' '}was created
                </>
              )}
            </span>
            <span className={styles.activityTime}>{formatRelativeTime(activity.timestamp)}</span>
          </div>
        </div>

        {hasChanges && (
          <>
            <button
              className={styles.expandButton}
              onClick={() => setIsExpanded(!isExpanded)}
              aria-expanded={isExpanded}
            >
              {isExpanded ? 'Hide details' : 'Show details'}
              <span className={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
            </button>

            {isExpanded && (
              <div className={styles.changeDetails}>
                {Object.entries(contact.changes!).map(([field, change]) => (
                  <div key={field} className={styles.changeItem}>
                    <span className={styles.changeField}>{getFieldLabel(field)}:</span>
                    <div className={styles.changeValues}>
                      <span className={styles.oldValue}>{formatValue(change.from)}</span>
                      <span className={styles.changeArrow}>→</span>
                      <span className={styles.newValue}>{formatValue(change.to)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderTaskActivity = () => {
    if (!activity.task) return null;

    const { task } = activity;

    return (
      <div className={styles.activityContent}>
        <div className={styles.activityHeader}>
          <span className={styles.activityIcon}>{getActivityIcon(activity.type)}</span>
          <div className={styles.activityText}>
            <span className={styles.activityDescription}>
              {activity.type === 'task_created' && (
                <>
                  Created task:{' '}
                  <span className={styles.taskTitle}>{task.title}</span>
                </>
              )}
              {activity.type === 'task_completed' && (
                <>
                  Completed:{' '}
                  <span className={styles.taskTitle}>{task.title}</span>
                </>
              )}
              {activity.type === 'task_updated' && (
                <>
                  Updated task:{' '}
                  <span className={styles.taskTitle}>{task.title}</span>
                </>
              )}
            </span>
            <span className={styles.activityTime}>{formatRelativeTime(activity.timestamp)}</span>
          </div>
        </div>
        <div className={styles.taskMeta}>
          <span className={`${styles.categoryBadge} ${styles[`category${task.category.replace(/\s+/g, '')}`]}`}>
            {task.category}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.activityItem}>
      {activity.contact && renderContactActivity()}
      {activity.task && renderTaskActivity()}
    </div>
  );
};

export default ActivityFeedItem;