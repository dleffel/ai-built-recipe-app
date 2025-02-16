import api, { recipeApi } from '../services/api';
import { mockApi, createMockResponse } from '../setupTests';
import { Recipe, CreateRecipeDTO, UpdateRecipeDTO } from '../types/recipe';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

interface RecipeListResponse {
  recipes: Recipe[];
  pagination: {
    skip: number;
    take: number;
    total: number;
  };
}

type AxiosGetFunction = (url: string, config?: any) => Promise<AxiosResponse>;
type AxiosPostFunction = (url: string, data?: any, config?: any) => Promise<AxiosResponse>;
type AxiosPutFunction = (url: string, data?: any, config?: any) => Promise<AxiosResponse>;
type AxiosDeleteFunction = (url: string, config?: any) => Promise<AxiosResponse>;

describe('API Service', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.interceptors.response.handlers = undefined;

    // Set up interceptors again after clearing mocks
    const successHandler = (response: AxiosResponse) => response;
    const errorHandler = (error: AxiosError) => {
      const config = error.config as InternalAxiosRequestConfig;
      if (error.response?.status === 401 && !config?.url?.includes('current-user')) {
        console.error('Authentication error:', error);
      }
      return Promise.reject(error);
    };

    mockApi.interceptors.response.use(successHandler, errorHandler);
    mockApi.interceptors.response.handlers = [successHandler, errorHandler];
  });

  it('should have correct base configuration', () => {
    expect(mockApi.defaults.baseURL).toBe('http://localhost:5001');
    expect(mockApi.defaults.withCredentials).toBe(true);
    expect(mockApi.defaults.headers['Content-Type']).toBe('application/json');
  });

  it('should export axios instance with expected methods', () => {
    expect(mockApi.get).toBeDefined();
    expect(mockApi.post).toBeDefined();
    expect(mockApi.put).toBeDefined();
    expect(mockApi.delete).toBeDefined();
    expect(typeof mockApi.get).toBe('function');
    expect(typeof mockApi.post).toBe('function');
    expect(typeof mockApi.put).toBe('function');
    expect(typeof mockApi.delete).toBe('function');
  });

  describe('Response Interceptor', () => {
    it('should pass through successful responses', () => {
      const mockResponse = createMockResponse(mockRecipe);
      const handlers = mockApi.interceptors.response.handlers;
      expect(handlers).toBeTruthy();
      const [successHandler] = handlers!;
      const result = successHandler(mockResponse);
      expect(result).toBe(mockResponse);
    });

    it('should handle 401 errors without logging during auth check', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockError: AxiosError = {
        response: { status: 401 } as any,
        config: { url: '/auth/current-user' } as InternalAxiosRequestConfig,
        isAxiosError: true,
        name: 'AxiosError',
        message: 'Unauthorized',
        toJSON: () => ({})
      };

      const handlers = mockApi.interceptors.response.handlers;
      expect(handlers).toBeTruthy();
      const [_, errorHandler] = handlers!;
      
      await expect(errorHandler(mockError)).rejects.toBe(mockError);
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should log 401 errors for non-auth endpoints', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockError: AxiosError = {
        response: { status: 401 } as any,
        config: { url: '/api/recipes' } as InternalAxiosRequestConfig,
        isAxiosError: true,
        name: 'AxiosError',
        message: 'Unauthorized',
        toJSON: () => ({})
      };

      const handlers = mockApi.interceptors.response.handlers;
      expect(handlers).toBeTruthy();
      const [_, errorHandler] = handlers!;
      
      await expect(errorHandler(mockError)).rejects.toBe(mockError);
      expect(consoleSpy).toHaveBeenCalledWith('Authentication error:', mockError);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Recipe API', () => {
    const mockCreateData: CreateRecipeDTO = {
      title: 'New Recipe',
      ingredients: ['ingredient'],
      instructions: 'instructions'
    };

    const mockUpdateData: UpdateRecipeDTO = {
      title: 'Updated Recipe'
    };

    beforeEach(() => {
      jest.spyOn(mockApi, 'get').mockReset();
      jest.spyOn(mockApi, 'post').mockReset();
      jest.spyOn(mockApi, 'put').mockReset();
      jest.spyOn(mockApi, 'delete').mockReset();
    });

    it('should create a recipe', async () => {
      const mockResponse = createMockResponse(mockRecipe);
      (mockApi.post as jest.Mocked<AxiosPostFunction>).mockResolvedValueOnce(mockResponse);
      
      const result = await recipeApi.create(mockCreateData);
      
      expect(mockApi.post).toHaveBeenCalledWith('/api/recipes', mockCreateData);
      expect(result).toEqual(mockRecipe);
    });

    it('should list recipes with pagination', async () => {
      const mockListResponse: RecipeListResponse = {
        recipes: [mockRecipe],
        pagination: { skip: 0, take: 12, total: 1 }
      };
      const mockResponse = createMockResponse(mockListResponse);
      (mockApi.get as jest.Mocked<AxiosGetFunction>).mockResolvedValueOnce(mockResponse);
      
      const result = await recipeApi.list({ skip: 0, take: 12 });
      
      expect(mockApi.get).toHaveBeenCalledWith('/api/recipes', {
        params: { skip: 0, take: 12 }
      });
      expect(result).toEqual(mockListResponse);
    });

    it('should get a recipe by ID', async () => {
      const mockResponse = createMockResponse(mockRecipe);
      (mockApi.get as jest.Mocked<AxiosGetFunction>).mockResolvedValueOnce(mockResponse);
      
      const result = await recipeApi.get('1');
      
      expect(mockApi.get).toHaveBeenCalledWith('/api/recipes/1');
      expect(result).toEqual(mockRecipe);
    });

    it('should update a recipe', async () => {
      const updatedRecipe = { ...mockRecipe, ...mockUpdateData };
      const mockResponse = createMockResponse(updatedRecipe);
      (mockApi.put as jest.Mocked<AxiosPutFunction>).mockResolvedValueOnce(mockResponse);
      
      const result = await recipeApi.update('1', mockUpdateData);
      
      expect(mockApi.put).toHaveBeenCalledWith('/api/recipes/1', mockUpdateData);
      expect(result).toEqual(updatedRecipe);
    });

    it('should delete a recipe', async () => {
      const mockResponse = createMockResponse({});
      (mockApi.delete as jest.Mocked<AxiosDeleteFunction>).mockResolvedValueOnce(mockResponse);
      
      await recipeApi.delete('1');
      
      expect(mockApi.delete).toHaveBeenCalledWith('/api/recipes/1');
    });

    it('should handle API errors', async () => {
      const mockError = new Error('API Error');
      (mockApi.get as jest.Mocked<AxiosGetFunction>).mockRejectedValueOnce(mockError);
      
      await expect(recipeApi.get('1')).rejects.toThrow('API Error');
    });
  });
});