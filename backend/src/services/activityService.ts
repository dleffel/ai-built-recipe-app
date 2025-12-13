import { BaseService } from './BaseService';
import {
  ActivityFeedItem,
  ActivityFeedParams,
  ActivityFeedResponse,
  ActivityType,
} from '../types/activity';
import { ContactChanges } from '../types/contact';

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
    
    // Fetch more than needed to account for merging and sorting
    const fetchLimit = limit + 10;
    
    // Fetch contact versions (edits only - version > 1), excluding hidden contacts
    const contactVersions = await this.getContactVersionActivities(userId, fetchLimit, hiddenContactIds);
    
    // Fetch task activities
    const taskActivities = await this.getTaskActivities(userId, fetchLimit);
    
    // Merge and sort by timestamp (most recent first)
    const allActivities = [...contactVersions, ...taskActivities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Apply pagination
    const paginatedActivities = allActivities.slice(offset, offset + limit);
    const hasMore = allActivities.length > offset + limit;
    
    return {
      activities: paginatedActivities,
      hasMore,
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
}