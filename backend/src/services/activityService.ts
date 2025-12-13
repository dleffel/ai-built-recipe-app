import { BaseService } from './BaseService';
import {
  ActivityFeedItem,
  ActivityFeedParams,
  ActivityFeedResponse,
  ActivityType,
  GroupedContactActivityInfo,
  ContactMergeInfo,
} from '../types/activity';
import { ContactChanges } from '../types/contact';

// 24 hours in milliseconds - the window for grouping contact edits
const GROUPING_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Service for aggregating activity feed data from various sources
 */
export class ActivityService extends BaseService {
  /**
   * Get the list of contact IDs that a user has hidden from their feed
   */
  private static async getHiddenContactIds(userId: string): Promise<string[]> {
    const hiddenContacts = await this.prisma.hiddenFeedContact.findMany({
      where: { userId },
      select: { contactId: true },
    });
    return hiddenContacts.map(hc => hc.contactId);
  }

  /**
   * Check if a specific contact is hidden from the user's activity feed
   */
  static async isContactHiddenFromFeed(
    userId: string,
    contactId: string
  ): Promise<boolean> {
    const hiddenContact = await this.prisma.hiddenFeedContact.findUnique({
      where: { userId_contactId: { userId, contactId } },
    });
    return hiddenContact !== null;
  }

  /**
   * Hide a contact from the user's activity feed
   */
  static async hideContactFromFeed(
    userId: string,
    contactId: string
  ): Promise<{ contactName: string }> {
    // Verify contact belongs to user
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, userId, isDeleted: false },
      select: { firstName: true, lastName: true },
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    await this.prisma.hiddenFeedContact.upsert({
      where: { userId_contactId: { userId, contactId } },
      create: { userId, contactId },
      update: {},
    });

    return { contactName: `${contact.firstName} ${contact.lastName}` };
  }

  /**
   * Unhide a contact from the user's activity feed
   */
  static async unhideContactFromFeed(
    userId: string,
    contactId: string
  ): Promise<void> {
    await this.prisma.hiddenFeedContact.deleteMany({
      where: { userId, contactId },
    });
  }

  /**
   * Get recent activity for a user
   * Aggregates contact edits and task activities into a unified feed
   */
  static async getRecentActivity(
    userId: string,
    params: ActivityFeedParams = {}
  ): Promise<ActivityFeedResponse> {
    const { limit = 20, offset = 0 } = params;
    
    // Get hidden contact IDs to filter them out
    const hiddenContactIds = await this.getHiddenContactIds(userId);
    
    // Fetch more than needed to account for merging, grouping, and sorting
    const fetchLimit = (limit + 10) * 2;
    
    // Fetch contact versions (edits only - version > 1), excluding hidden contacts
    const contactVersions = await this.getContactVersionActivities(userId, fetchLimit, hiddenContactIds);
    
    // Fetch task activities
    const taskActivities = await this.getTaskActivities(userId, fetchLimit);
    
    // Fetch contact merge activities
    const mergeActivities = await this.getContactMergeActivities(userId, fetchLimit, hiddenContactIds);
    
    // Merge and sort by timestamp (most recent first)
    const allActivities = [...contactVersions, ...taskActivities, ...mergeActivities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Group adjacent contact edits for the same contact within 24h window
    const groupedActivities = this.groupAdjacentContactEdits(allActivities);
    
    // Apply pagination
    const paginatedActivities = groupedActivities.slice(offset, offset + limit);
    const hasMore = groupedActivities.length > offset + limit;
    
    return {
      activities: paginatedActivities,
      hasMore,
    };
  }

  /**
   * Group adjacent contact_edited activities for the same contact within 24h window
   * Adjacent means consecutive in the sorted list (no other activity types in between)
   */
  private static groupAdjacentContactEdits(activities: ActivityFeedItem[]): ActivityFeedItem[] {
    if (activities.length === 0) return [];

    const result: ActivityFeedItem[] = [];
    let currentGroup: ActivityFeedItem[] = [];
    let currentContactId: string | null = null;
    let groupStartTimestamp: Date | null = null;

    for (const activity of activities) {
      // Check if this is a contact_edited activity
      if (activity.type === 'contact_edited' && activity.contact) {
        const activityTimestamp = new Date(activity.timestamp);
        
        // Check if we can add to existing group
        const canAddToGroup = currentContactId === activity.contact.id &&
          groupStartTimestamp !== null &&
          (groupStartTimestamp.getTime() - activityTimestamp.getTime()) <= GROUPING_WINDOW_MS;

        if (canAddToGroup) {
          // Add to existing group
          currentGroup.push(activity);
        } else {
          // Flush current group if exists
          if (currentGroup.length > 0) {
            result.push(this.createGroupedOrSingleItem(currentGroup));
          }
          // Start new group
          currentGroup = [activity];
          currentContactId = activity.contact.id;
          groupStartTimestamp = activityTimestamp;
        }
      } else {
        // Not a contact_edited activity - flush current group and add this item
        if (currentGroup.length > 0) {
          result.push(this.createGroupedOrSingleItem(currentGroup));
          currentGroup = [];
          currentContactId = null;
          groupStartTimestamp = null;
        }
        result.push(activity);
      }
    }

    // Flush any remaining group
    if (currentGroup.length > 0) {
      result.push(this.createGroupedOrSingleItem(currentGroup));
    }

    return result;
  }

  /**
   * Create a grouped activity item if multiple activities, or return single item
   */
  private static createGroupedOrSingleItem(activities: ActivityFeedItem[]): ActivityFeedItem {
    if (activities.length === 1) {
      return activities[0];
    }

    // Multiple activities - create a grouped item
    const firstActivity = activities[0];
    const lastActivity = activities[activities.length - 1];
    const contactId = firstActivity.contact!.id;
    const contactName = firstActivity.contact!.name;

    const groupedContact: GroupedContactActivityInfo = {
      id: contactId,
      name: contactName,
      editCount: activities.length,
      activities: activities,
      latestTimestamp: firstActivity.timestamp,
      earliestTimestamp: lastActivity.timestamp,
    };

    return {
      id: `contact-edit-group-${contactId}-${firstActivity.timestamp}`,
      type: 'contact_edited_group',
      timestamp: firstActivity.timestamp,
      groupedContact,
    };
  }

  /**
   * Get contact version activities (edits)
   */
  private static async getContactVersionActivities(
    userId: string,
    limit: number,
    hiddenContactIds: string[] = []
  ): Promise<ActivityFeedItem[]> {
    // Get contact versions where version > 1 (edits, not initial creation)
    // Join with contacts to get the contact name and verify ownership
    // Exclude hidden contacts from the feed
    const contactVersions = await this.prisma.contactVersion.findMany({
      where: {
        version: { gt: 1 }, // Only edits, not initial creation
        contact: {
          userId,
          isDeleted: false,
          ...(hiddenContactIds.length > 0 && { id: { notIn: hiddenContactIds } }),
        },
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            title: true,
            tags: {
              include: {
                tag: {
                  select: { name: true }
                }
              }
            }
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return contactVersions.map((cv) => ({
      id: `contact-edit-${cv.id}`,
      type: 'contact_edited' as ActivityType,
      timestamp: cv.createdAt.toISOString(),
      contact: {
        id: cv.contact.id,
        name: `${cv.contact.firstName} ${cv.contact.lastName}`,
        changes: cv.changes as ContactChanges,
        version: cv.version,
        company: cv.contact.company,
        title: cv.contact.title,
        tags: cv.contact.tags.map(t => t.tag.name),
      },
    }));
  }

  /**
   * Get task activities (created, completed, updated)
   */
  private static async getTaskActivities(
    userId: string,
    limit: number
  ): Promise<ActivityFeedItem[]> {
    const activities: ActivityFeedItem[] = [];

    // Get recently created tasks
    const recentTasks = await this.prisma.task.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    // Add task creation activities
    for (const task of recentTasks) {
      activities.push({
        id: `task-created-${task.id}`,
        type: 'task_created',
        timestamp: task.createdAt.toISOString(),
        task: {
          id: task.id,
          title: task.title,
          category: task.category,
          status: task.status,
          dueDate: task.dueDate.toISOString(),
        },
      });
    }

    // Get recently completed tasks
    const completedTasks = await this.prisma.task.findMany({
      where: {
        userId,
        status: 'complete',
        completedAt: { not: null },
      },
      orderBy: {
        completedAt: 'desc',
      },
      take: limit,
    });

    // Add task completion activities
    for (const task of completedTasks) {
      if (task.completedAt) {
        activities.push({
          id: `task-completed-${task.id}`,
          type: 'task_completed',
          timestamp: task.completedAt.toISOString(),
          task: {
            id: task.id,
            title: task.title,
            category: task.category,
            status: task.status,
            previousStatus: 'incomplete',
            dueDate: task.dueDate.toISOString(),
          },
        });
      }
    }

    return activities;
  }

  /**
   * Get contact merge activities
   */
  private static async getContactMergeActivities(
    userId: string,
    limit: number,
    hiddenContactIds: string[] = []
  ): Promise<ActivityFeedItem[]> {
    // Get contact merge events, excluding hidden contacts
    const mergeEvents = await this.prisma.contactMerge.findMany({
      where: {
        userId,
        ...(hiddenContactIds.length > 0 && { primaryContactId: { notIn: hiddenContactIds } }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return mergeEvents.map((merge) => ({
      id: `contact-merge-${merge.id}`,
      type: 'contact_merged' as ActivityType,
      timestamp: merge.createdAt.toISOString(),
      merge: {
        id: merge.id,
        primaryContactId: merge.primaryContactId,
        primaryContactName: merge.primaryContactName,
        secondaryContactName: merge.secondaryContactName,
        emailsMerged: merge.emailsMerged,
        phonesMerged: merge.phonesMerged,
        tagsMerged: merge.tagsMerged,
      },
    }));
  }
}
