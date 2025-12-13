/**
 * Activity feed type definitions for the backend
 * These types define the structure of activity feed items
 */

import { ContactChanges } from './contact';

/**
 * Types of activities that can appear in the feed
 */
export type ActivityType =
  | 'contact_created'
  | 'contact_edited'
  | 'contact_edited_group'  // Grouped contact edits
  | 'contact_merged'        // Contact merge event
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
  tags?: string[];  // Array of tag names
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
 * Contact merge activity info
 */
export interface ContactMergeInfo {
  id: string;
  primaryContactId: string;
  primaryContactName: string;
  secondaryContactName: string;
  emailsMerged: number;
  phonesMerged: number;
  tagsMerged: number;
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
  merge?: ContactMergeInfo;
}

/**
 * Parameters for fetching activity feed
 */
export interface ActivityFeedParams {
  limit?: number;
  offset?: number;
}

/**
 * Response from the activity feed endpoint
 */
export interface ActivityFeedResponse {
  activities: ActivityFeedItem[];
  hasMore: boolean;
}