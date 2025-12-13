import { BaseService } from './BaseService';
import {
  ActivityFeedItem,
  ActivityFeedParams,
  ActivityFeedResponse,
  ActivityType,
} from '../types/activity';
import { ContactChanges } from '../types/contact';
import { UserSettingsService } from './userSettingsService';

/**
 * Service for aggregating activity feed data from various sources
 */
export class ActivityService extends BaseService {
  /**
   * Get recent activity for a user
   * Aggregates contact edits and task activities into a unified feed
   */
  static async getRecentActivity(
    userId: string,
    params: ActivityFeedParams = {}
  ): Promise<ActivityFeedResponse> {
    const { limit = 20, offset = 0 } = params;
    
    // Fetch more than needed to account for merging and sorting
    const fetchLimit = limit + 10;
    
    // Get hidden feed tags for filtering
    const hiddenFeedTags = await UserSettingsService.getHiddenFeedTags(userId);
    
    // Fetch contact versions (edits only - version > 1)
    const contactVersions = await this.getContactVersionActivities(userId, fetchLimit, hiddenFeedTags);
    
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
   * Filters out contacts that have any of the hidden tags
   */
  private static async getContactVersionActivities(
    userId: string,
    limit: number,
    hiddenFeedTags: string[] = []
  ): Promise<ActivityFeedItem[]> {
    // Build the where clause for contact versions
    // If there are hidden tags, exclude contacts that have any of those tags
    const contactWhereClause: {
      userId: string;
      isDeleted: boolean;
      tags?: { none: { tagId: { in: string[] } } };
    } = {
      userId,
      isDeleted: false,
    };

    // If there are hidden tags, filter out contacts with those tags
    if (hiddenFeedTags.length > 0) {
      contactWhereClause.tags = {
        none: {
          tagId: { in: hiddenFeedTags },
        },
      };
    }

    // Get contact versions where version > 1 (edits, not initial creation)
    // Join with contacts to get the contact name and verify ownership
    const contactVersions = await this.prisma.contactVersion.findMany({
      where: {
        version: { gt: 1 }, // Only edits, not initial creation
        contact: contactWhereClause,
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