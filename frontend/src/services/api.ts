import axios from 'axios';
import { Recipe, CreateRecipeDTO, UpdateRecipeDTO, RecipeListResponse, RecipeSortField, RecipeSortOrder } from '../types/recipe';

// Dev auth token storage key
const DEV_AUTH_TOKEN_KEY = 'dev_auth_token';

// Get stored dev auth token
export const getDevAuthToken = (): string | null => {
  return localStorage.getItem(DEV_AUTH_TOKEN_KEY);
};

// Store dev auth token
export const setDevAuthToken = (token: string): void => {
  localStorage.setItem(DEV_AUTH_TOKEN_KEY, token);
};

// Clear dev auth token
export const clearDevAuthToken = (): void => {
  localStorage.removeItem(DEV_AUTH_TOKEN_KEY);
};

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001', // Use environment variable with fallback
  withCredentials: true, // Important for handling cookies/sessions
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include dev auth token if available
// This is a fallback for iOS third-party cookie blocking in Railway preview environments
api.interceptors.request.use(
  (config) => {
    const token = getDevAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't log 401s during auth check as they're expected when not logged in
    if (error.response?.status === 401 && !error.config.url.includes('current-user')) {
      console.error('Authentication error:', error);
      // Redirect to recipes page instead of home page when authentication fails
      if (window.location.pathname !== '/recipes' &&
          !window.location.pathname.startsWith('/login')) {
        console.log('Redirecting to recipes page due to auth error');
      }
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

  // Extract recipe from URL
  extractFromUrl: async (url: string): Promise<CreateRecipeDTO> => {
    const response = await api.post<CreateRecipeDTO>('/api/recipes/extract-url', { url });
    return response.data;
  },

  // Get paginated list of recipes with optional search and sorting
  list: async (params?: {
    skip?: number;
    take?: number;
    search?: string;
    sortBy?: RecipeSortField;
    sortOrder?: RecipeSortOrder;
  }): Promise<RecipeListResponse> => {
    console.log('[DEBUG] API list request params:', params);
    const response = await api.get<RecipeListResponse>('/api/recipes', { params });
    console.log('[DEBUG] API list response:', {
      total: response.data.pagination.total,
      count: response.data.recipes.length,
      search: response.data.pagination.search,
      sortBy: response.data.pagination.sortBy,
      sortOrder: response.data.pagination.sortOrder
    });
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