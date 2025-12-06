import api from './api';
import {
  Contact,
  ContactVersion,
  CreateContactDTO,
  UpdateContactDTO,
  ContactListParams,
  ContactListResponse,
} from '../types/contact';

/**
 * Contact API service for CRUD operations and version management
 */
export const contactApi = {
  /**
   * Create a new contact
   */
  create: async (data: CreateContactDTO): Promise<Contact> => {
    const response = await api.post<Contact>('/api/contacts', data);
    return response.data;
  },

  /**
   * Get paginated list of contacts with optional search
   */
  list: async (params?: ContactListParams): Promise<ContactListResponse> => {
    const response = await api.get<ContactListResponse>('/api/contacts', { params });
    return response.data;
  },

  /**
   * Get a single contact by ID
   */
  get: async (id: string): Promise<Contact> => {
    const response = await api.get<Contact>(`/api/contacts/${id}`);
    return response.data;
  },

  /**
   * Update a contact
   */
  update: async (id: string, data: UpdateContactDTO): Promise<Contact> => {
    const response = await api.put<Contact>(`/api/contacts/${id}`, data);
    return response.data;
  },

  /**
   * Delete a contact (soft delete)
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/contacts/${id}`);
  },

  /**
   * Get version history for a contact
   */
  getVersions: async (id: string): Promise<ContactVersion[]> => {
    const response = await api.get<ContactVersion[]>(`/api/contacts/${id}/versions`);
    return response.data;
  },

  /**
   * Get a specific version of a contact
   */
  getVersion: async (id: string, version: number): Promise<ContactVersion> => {
    const response = await api.get<ContactVersion>(`/api/contacts/${id}/versions/${version}`);
    return response.data;
  },

  /**
   * Restore a contact to a specific version
   */
  restoreVersion: async (id: string, version: number): Promise<Contact> => {
    const response = await api.post<Contact>(`/api/contacts/${id}/restore/${version}`);
    return response.data;
  },
};

export default contactApi;