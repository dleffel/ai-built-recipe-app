import { TagListResponse } from '../types/contact';
import api from './api';

/**
 * Tag API service for managing user tags
 */
export const tagApi = {
  /**
   * Get all tags for the current user
   * Optionally filter by search query for autocomplete
   */
  async getUserTags(search?: string): Promise<TagListResponse> {
    const params = new URLSearchParams();
    if (search) {
      params.append('search', search);
    }
    const queryString = params.toString();
    const url = queryString ? `/api/tags?${queryString}` : '/api/tags';
    const response = await api.get<TagListResponse>(url);
    return response.data;
  },
};

export default tagApi;
