import api from './api';
import { ActivityFeedResponse } from '../types/activity';

/**
 * Activity API service for fetching activity feed data
 */
export const activityApi = {
  /**
   * Get recent activity feed for the authenticated user
   * @param limit - Maximum number of activities to return (default: 20, max: 50)
   * @param offset - Number of activities to skip for pagination (default: 0)
   */
  getRecentActivity: async (
    limit: number = 20,
    offset: number = 0
  ): Promise<ActivityFeedResponse> => {
    const response = await api.get<ActivityFeedResponse>('/api/activity', {
      params: { limit, offset },
    });
    return response.data;
  },
};

export default activityApi;