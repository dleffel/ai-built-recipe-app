import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { GroupedContactActivityInfo, ActivityFeedItem as ActivityFeedItemType } from '../../types/activity';
import { formatRelativeTime } from '../../utils/dateUtils';
import { IconButton } from '../ui/Button';
import { EyeOffIcon } from '../ui/icons';
import { ActivityFeedItem } from './ActivityFeedItem';
import styles from './GroupedActivityFeedItem.module.css';

interface GroupedActivityFeedItemProps {
  groupedContact: GroupedContactActivityInfo;
  /** Callback when user wants to hide a contact from the feed */
  onHideContact?: (contactId: string, contactName: string) => void;
}

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
  onHideContact,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const { id, name, editCount, activities, latestTimestamp, earliestTimestamp } = groupedContact;

  const handleHideContact = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onHideContact) {
      onHideContact(id, name);
    }
  };

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
        {onHideContact && (
          <IconButton
            icon={<EyeOffIcon size={14} />}
            aria-label={`Hide ${name} from feed`}
            variant="ghost"
            size="sm"
            className={styles.hideButton}
            onClick={handleHideContact}
            title={`Hide ${name} from feed`}
          />
        )}
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
