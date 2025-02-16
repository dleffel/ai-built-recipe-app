import axios from 'axios';
import { Recipe, CreateRecipeDTO, UpdateRecipeDTO, RecipeListResponse } from '../types/recipe';

// Create axios instance with default config
const api = axios.create({
  baseURL: 'http://localhost:5001', // Backend server URL
  withCredentials: true, // Important for handling cookies/sessions
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't log 401s during auth check as they're expected when not logged in
    if (error.response?.status === 401 && !error.config.url.includes('current-user')) {
      console.error('Authentication error:', error);
    }
    return Promise.reject(error);
  }
);

// Recipe API endpoints
export const recipeApi = {
  // Create a new recipe
  create: async (data: CreateRecipeDTO): Promise<Recipe> => {
    const response = await api.post<Recipe>('/api/recipes', data);
    return response.data;
  },

  // Get paginated list of recipes
  list: async (params?: { skip?: number; take?: number }): Promise<RecipeListResponse> => {
    const response = await api.get<RecipeListResponse>('/api/recipes', { params });
    return response.data;
  },

  // Get a single recipe by ID
  get: async (id: string): Promise<Recipe> => {
    const response = await api.get<Recipe>(`/api/recipes/${id}`);
    return response.data;
  },

  // Update a recipe
  update: async (id: string, data: UpdateRecipeDTO): Promise<Recipe> => {
    const response = await api.put<Recipe>(`/api/recipes/${id}`, data);
    return response.data;
  },

  // Delete a recipe
  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/recipes/${id}`);
  }
};

export default api;