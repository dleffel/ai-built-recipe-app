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
 * A single activity feed item
 */
export interface ActivityFeedItem {
  id: string;
  type: ActivityType;
  timestamp: string;
  contact?: ActivityContactInfo;
  task?: ActivityTaskInfo;
}

/**
 * Response from the activity feed endpoint
 */
export interface ActivityFeedResponse {
  activities: ActivityFeedItem[];
  hasMore: boolean;
}