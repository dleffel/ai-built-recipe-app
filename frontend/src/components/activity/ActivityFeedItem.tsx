import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ActivityFeedItem as ActivityFeedItemType } from '../../types/activity';
import { ContactChanges } from '../../types/contact';
import { formatRelativeTime } from '../../utils/dateUtils';
import { GroupedActivityFeedItem } from './GroupedActivityFeedItem';
import styles from './ActivityFeedItem.module.css';

interface ActivityFeedItemProps {
  activity: ActivityFeedItemType;
  /** When true, renders in a more compact style for nested display within groups */
  isNested?: boolean;
}

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

export const ActivityFeedItem: React.FC<ActivityFeedItemProps> = ({ activity, isNested = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Handle grouped contact edits
  if (activity.type === 'contact_edited_group' && activity.groupedContact) {
    return <GroupedActivityFeedItem groupedContact={activity.groupedContact} />;
  }

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

  const itemClassName = isNested
    ? `${styles.activityItem} ${styles.nestedItem}`
    : styles.activityItem;

  return (
    <div className={itemClassName}>
      {activity.contact && renderContactActivity()}
      {activity.task && renderTaskActivity()}
    </div>
  );
};

export default ActivityFeedItem;