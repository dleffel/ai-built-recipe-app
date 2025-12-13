/**
 * Activity feed type definitions for the frontend
 */

import { ContactChanges } from './contact';

/**
 * Types of activities that can appear in the feed
 */
export type ActivityType =
  | 'contact_created'
  | 'contact_edited'
  | 'contact_edited_group'  // Grouped contact edits
  | 'task_created'
  | 'task_completed'
  | 'task_updated';

/**
 * Contact information for activity feed items
 */
export interface ActivityContactInfo {
  id: string;
  name: string;
  changes?: ContactChanges;
  version?: number;
  // Context fields for richer display
  company?: string | null;
  title?: string | null;
  tags?: string[];
}

/**
 * Task information for activity feed items
 */
export interface ActivityTaskInfo {
  id: string;
  title: string;
  category: string;
  status: string;
  previousStatus?: string;
  dueDate?: string;
}

/**
 * Grouped contact activity info - contains multiple edits for the same contact
 */
export interface GroupedContactActivityInfo {
  id: string;
  name: string;
  editCount: number;
  activities: ActivityFeedItem[];
  latestTimestamp: string;
  earliestTimestamp: string;
}

/**
 * A single activity feed item
 */
export interface ActivityFeedItem {
  id: string;
  type: ActivityType;
  timestamp: string;
  contact?: ActivityContactInfo;
  task?: ActivityTaskInfo;
  groupedContact?: GroupedContactActivityInfo;
}

/**
 * Response from the activity feed endpoint
 */
export interface ActivityFeedResponse {
  activities: ActivityFeedItem[];
  hasMore: boolean;
}