import api from './api';

/**
 * User settings type
 */
export interface UserSettings {
  hiddenFeedTags: string[];
}

/**
 * Update user settings DTO
 */
export interface UpdateUserSettingsDTO {
  hiddenFeedTags?: string[];
}

/**
 * Settings API service for managing user settings
 */
export const settingsApi = {
  /**
   * Get user settings for the authenticated user
   */
  async getUserSettings(): Promise<UserSettings> {
    const response = await api.get<UserSettings>('/api/settings');
    return response.data;
  },

  /**
   * Update user settings for the authenticated user
   */
  async updateUserSettings(settings: UpdateUserSettingsDTO): Promise<UserSettings> {
    const response = await api.put<UserSettings>('/api/settings', settings);
    return response.data;
  },
};

export default settingsApi;
