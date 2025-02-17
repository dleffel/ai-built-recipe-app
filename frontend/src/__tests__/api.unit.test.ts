import api, { recipeApi } from '../services/api';
import { mockApi, createMockResponse } from '../setupTests';
import { Recipe } from '../types/recipe';
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('API Service Unit Tests', () => {
  // Test data
  const mockRecipe: Recipe = {
    id: '1',
    title: 'Test Recipe',
    description: 'Test description',
    ingredients: ['ingredient 1', 'ingredient 2'],
    instructions: 'Test instructions',
    servings: 4,
    prepTime: 30,
    cookTime: 45,
    imageUrl: 'https://example.com/image.jpg',
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: 'user-1'
  };

  // Core configuration tests
  describe('API Configuration', () => {
    it('should create axios instance with correct config', () => {
      expect(api.defaults.baseURL).toBe('http://localhost:5001');
      expect(api.defaults.withCredentials).toBe(true);
      expect(api.defaults.headers['Content-Type']).toBe('application/json');
    });
  });

  // Authentication and error handling
  describe('Response Interceptor', () => {
    let consoleSpy: ReturnType<typeof jest.spyOn>;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should pass through successful responses', async () => {
      const mockResponse = createMockResponse(mockRecipe);
      const onFulfilled = (response: AxiosResponse) => response;
      const result = onFulfilled(mockResponse);
      expect(result).toBe(mockResponse);
      expect(result.data).toBe(mockRecipe);
    });

    it('should log 401 errors for non-auth endpoints', async () => {
      const error = {
        response: createErrorResponse(401),
        config: { url: '/api/recipes', headers: {} } as InternalAxiosRequestConfig,
        isAxiosError: true,
        name: 'AxiosError',
        message: 'Unauthorized',
        toJSON: () => ({})
      } as AxiosError;

      const onRejected = (error: AxiosError) => {
        if (error.response?.status === 401 && !error.config?.url?.includes('current-user')) {
          console.error('Authentication error:', error);
        }
        return Promise.reject(error);
      };

      await expect(onRejected(error)).rejects.toBe(error);
      expect(consoleSpy).toHaveBeenCalledWith('Authentication error:', error);
    });

    it('should not log 401 errors for auth endpoints', async () => {
      const error = {
        response: createErrorResponse(401),
        config: { url: '/auth/current-user', headers: {} } as InternalAxiosRequestConfig,
        isAxiosError: true,
        name: 'AxiosError',
        message: 'Unauthorized',
        toJSON: () => ({})
      } as AxiosError;

      const onRejected = (error: AxiosError) => {
        if (error.response?.status === 401 && !error.config?.url?.includes('current-user')) {
          console.error('Authentication error:', error);
        }
        return Promise.reject(error);
      };

      await expect(onRejected(error)).rejects.toBe(error);
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  // API Methods
  describe('API Methods', () => {
    type MockedGet = jest.MockedFunction<typeof api.get>;
    type MockedPost = jest.MockedFunction<typeof api.post>;
    type MockedPut = jest.MockedFunction<typeof api.put>;
    type MockedDelete = jest.MockedFunction<typeof api.delete>;

    beforeEach(() => {
      (api.get as MockedGet).mockReset();
      (api.post as MockedPost).mockReset();
      (api.put as MockedPut).mockReset();
      (api.delete as MockedDelete).mockReset();
    });

    describe('Recipe CRUD Operations', () => {
      it('should create recipe', async () => {
        const mockResponse = createMockResponse(mockRecipe) as AxiosResponse<Recipe>;
        (api.post as MockedPost).mockResolvedValueOnce(mockResponse);
        const result = await recipeApi.create(mockRecipe);
        expect(result).toBe(mockResponse.data);
        expect(api.post).toHaveBeenCalledWith('/api/recipes', mockRecipe);
      });

      it('should list recipes with pagination', async () => {
        const mockListResponse = {
          recipes: [mockRecipe],
          pagination: { skip: 0, take: 10, total: 1 }
        };
        const mockResponse = createMockResponse(mockListResponse) as AxiosResponse<typeof mockListResponse>;
        (api.get as MockedGet).mockResolvedValueOnce(mockResponse);
        const result = await recipeApi.list({ skip: 10, take: 20 });
        expect(result).toBe(mockResponse.data);
        expect(api.get).toHaveBeenCalledWith('/api/recipes', { params: { skip: 10, take: 20 } });
      });

      it('should get recipe by id', async () => {
        const mockResponse = createMockResponse(mockRecipe) as AxiosResponse<Recipe>;
        (api.get as MockedGet).mockResolvedValueOnce(mockResponse);
        const result = await recipeApi.get('1');
        expect(result).toBe(mockResponse.data);
        expect(api.get).toHaveBeenCalledWith('/api/recipes/1');
      });

      it('should update recipe', async () => {
        const updateData = { title: 'Updated Recipe' };
        const mockResponse = createMockResponse({ ...mockRecipe, ...updateData }) as AxiosResponse<Recipe>;
        (api.put as MockedPut).mockResolvedValueOnce(mockResponse);
        const result = await recipeApi.update('1', updateData);
        expect(result).toBe(mockResponse.data);
        expect(api.put).toHaveBeenCalledWith('/api/recipes/1', updateData);
      });

      it('should delete recipe', async () => {
        const mockResponse = createMockResponse(undefined) as AxiosResponse<void>;
        (api.delete as MockedDelete).mockResolvedValueOnce(mockResponse);
        await recipeApi.delete('1');
        expect(api.delete).toHaveBeenCalledWith('/api/recipes/1');
      });
    });

    describe('Error Handling', () => {
      it('should handle network errors', async () => {
        const error = new Error('Network error') as AxiosError;
        (api.get as MockedGet).mockRejectedValueOnce(error);
        await expect(recipeApi.get('1')).rejects.toThrow(error);
      });

      it('should handle 401 errors', async () => {
        const error = {
          response: createErrorResponse(401),
          config: { url: '/api/recipes', headers: {} } as InternalAxiosRequestConfig,
          isAxiosError: true,
          name: 'AxiosError',
          message: 'Unauthorized',
          toJSON: () => ({})
        } as AxiosError;
        (api.get as MockedGet).mockRejectedValueOnce(error);
        await expect(recipeApi.get('1')).rejects.toEqual(error);
      });

      it('should handle server errors', async () => {
        const error = {
          response: createErrorResponse(500),
          config: { url: '/api/recipes', headers: {} } as InternalAxiosRequestConfig,
          isAxiosError: true,
          name: 'AxiosError',
          message: 'Internal server error',
          toJSON: () => ({})
        } as AxiosError;
        (api.get as MockedGet).mockRejectedValueOnce(error);
        await expect(recipeApi.get('1')).rejects.toEqual(error);
      });
    });
  });
});

// Helper function to create error responses
function createErrorResponse(status: number): AxiosResponse {
  return {
    status,
    statusText: status === 401 ? 'Unauthorized' : 'Error',
    headers: {},
    config: { url: '/api/recipes', headers: {} } as InternalAxiosRequestConfig,
    data: {}
  };
}