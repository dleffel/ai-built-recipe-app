import api from './api';
import { ActivityFeedResponse } from '../types/activity';

/**
 * Response from hide contact endpoint
 */
interface HideContactResponse {
  success: boolean;
  hiddenContact: {
    contactId: string;
    contactName: string;
  };
}

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

  /**
   * Hide a contact from the activity feed
   * @param contactId - The ID of the contact to hide
   * @returns The hidden contact info including name for toast display
   */
  hideContact: async (contactId: string): Promise<HideContactResponse['hiddenContact']> => {
    const response = await api.post<HideContactResponse>(`/api/activity/hide-contact/${contactId}`);
    return response.data.hiddenContact;
  },

  /**
   * Unhide a contact from the activity feed (undo hide)
   * @param contactId - The ID of the contact to unhide
   */
  unhideContact: async (contactId: string): Promise<void> => {
    await api.delete(`/api/activity/hide-contact/${contactId}`);
  },
};

export default activityApi;