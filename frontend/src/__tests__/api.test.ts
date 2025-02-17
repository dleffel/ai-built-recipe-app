import api, { recipeApi } from '../services/api';
import { mockApi, createMockResponse } from '../setupTests';
import { Recipe, CreateRecipeDTO, UpdateRecipeDTO } from '../types/recipe';
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

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

describe('API Service', () => {
  let consoleSpy: ReturnType<typeof jest.spyOn>;
  let errorHandler: (error: AxiosError) => Promise<never>;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Set up error handler
    errorHandler = (error: AxiosError) => {
      if (error.response?.status === 401 &&
          error.config?.url &&
          !error.config.url.includes('current-user') &&
          error.config.url.startsWith('/api/')) {
        console.error('Authentication error:', error);
      }
      return Promise.reject(error);
    };

    // Mock the error handler
    jest.spyOn(api.interceptors.response, 'use').mockImplementation((_, reject) => {
      if (reject) {
        reject(error => errorHandler(error));
      }
      return 0;
    });

    // Reset API mocks
    jest.spyOn(api, 'get').mockReset();
    jest.spyOn(api, 'post').mockReset();
    jest.spyOn(api, 'put').mockReset();
    jest.spyOn(api, 'delete').mockReset();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should have correct base configuration', () => {
    expect(api.defaults.baseURL).toBe('http://localhost:5001');
    expect(api.defaults.withCredentials).toBe(true);
    expect(api.defaults.headers['Content-Type']).toBe('application/json');
  });

  it('should create axios instance with correct config', () => {
    const instance = axios.create({
      baseURL: 'http://localhost:5001',
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    expect(api.defaults).toEqual(instance.defaults);
  });

  it('should pass through successful responses directly', async () => {
    const mockResponse = createMockResponse(mockRecipe);
    const result = mockResponse;
    expect(result).toBe(mockResponse);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should pass through successful responses with data', async () => {
    const mockResponse = createMockResponse(mockRecipe);
    const result = mockResponse;
    expect(result.data).toBe(mockRecipe);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should handle 401 errors for auth check endpoint without logging', async () => {
    const error = {
      response: { status: 401 },
      config: { url: '/auth/current-user', headers: {} } as InternalAxiosRequestConfig,
      isAxiosError: true,
      name: 'AxiosError',
      message: 'Unauthorized',
      toJSON: () => ({})
    } as AxiosError;

    await expect(errorHandler(error)).rejects.toBe(error);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should log 401 errors for non-auth endpoints', async () => {
    const error = {
      response: { status: 401 },
      config: { url: '/api/recipes', headers: {} } as InternalAxiosRequestConfig,
      isAxiosError: true,
      name: 'AxiosError',
      message: 'Unauthorized',
      toJSON: () => ({})
    } as AxiosError;

    await expect(errorHandler(error)).rejects.toBe(error);
    expect(consoleSpy).toHaveBeenCalledWith('Authentication error:', error);
  });

  it('should handle successful create response', async () => {
    const mockResponse = createMockResponse(mockRecipe);
    (api.post as jest.Mocked<AxiosPostFunction>).mockResolvedValueOnce(mockResponse);
    const result = await recipeApi.create(mockRecipe);
    expect(result).toBe(mockResponse.data);
    expect(api.post).toHaveBeenCalledWith('/api/recipes', mockRecipe);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should handle successful list response with no params', async () => {
    const mockListResponse = {
      recipes: [mockRecipe],
      pagination: { skip: 0, take: 10, total: 1 }
    };
    const mockResponse = createMockResponse(mockListResponse);
    (api.get as jest.Mocked<AxiosGetFunction>).mockResolvedValueOnce(mockResponse);
    const result = await recipeApi.list();
    expect(result).toBe(mockResponse.data);
    expect(api.get).toHaveBeenCalledWith('/api/recipes', { params: undefined });
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should handle successful list response with pagination', async () => {
    const mockListResponse = {
      recipes: [mockRecipe],
      pagination: { skip: 5, take: 5, total: 1 }
    };
    const mockResponse = createMockResponse(mockListResponse);
    (api.get as jest.Mocked<AxiosGetFunction>).mockResolvedValueOnce(mockResponse);
    const result = await recipeApi.list({ skip: 5, take: 5 });
    expect(result).toBe(mockResponse.data);
    expect(api.get).toHaveBeenCalledWith('/api/recipes', { params: { skip: 5, take: 5 } });
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should handle successful get response', async () => {
    const mockResponse = createMockResponse(mockRecipe);
    (api.get as jest.Mocked<AxiosGetFunction>).mockResolvedValueOnce(mockResponse);
    const result = await recipeApi.get('1');
    expect(result).toBe(mockResponse.data);
    expect(api.get).toHaveBeenCalledWith('/api/recipes/1');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should handle successful update response', async () => {
    const updateData = { title: 'Updated Recipe' };
    const updatedRecipe = { ...mockRecipe, ...updateData };
    const mockResponse = createMockResponse(updatedRecipe);
    (api.put as jest.Mocked<AxiosPutFunction>).mockResolvedValueOnce(mockResponse);
    const result = await recipeApi.update('1', updateData);
    expect(result).toBe(mockResponse.data);
    expect(api.put).toHaveBeenCalledWith('/api/recipes/1', updateData);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should handle successful delete response', async () => {
    const mockResponse = createMockResponse(undefined);
    (api.delete as jest.Mocked<AxiosDeleteFunction>).mockResolvedValueOnce(mockResponse);
    await recipeApi.delete('1');
    expect(api.delete).toHaveBeenCalledWith('/api/recipes/1');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should handle errors without response object', async () => {
    const error = {
      config: { url: '/api/recipes', headers: {} } as InternalAxiosRequestConfig,
      isAxiosError: true,
      name: 'AxiosError',
      message: 'Network Error',
      toJSON: () => ({})
    } as AxiosError;

    await expect(errorHandler(error)).rejects.toBe(error);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should handle errors without config', async () => {
    const error = {
      response: { status: 401 },
      isAxiosError: true,
      name: 'AxiosError',
      message: 'Unauthorized',
      toJSON: () => ({})
    } as AxiosError;

    await expect(errorHandler(error)).rejects.toBe(error);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should handle errors with config but without url', async () => {
    const error = {
      response: { status: 401 },
      config: { headers: {} } as InternalAxiosRequestConfig,
      isAxiosError: true,
      name: 'AxiosError',
      message: 'Unauthorized',
      toJSON: () => ({})
    } as AxiosError;

    await expect(errorHandler(error)).rejects.toBe(error);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should handle errors with malformed url', async () => {
    const error = {
      response: { status: 401 },
      config: { url: 'invalid-url', headers: {} } as InternalAxiosRequestConfig,
      isAxiosError: true,
      name: 'AxiosError',
      message: 'Unauthorized',
      toJSON: () => ({})
    } as AxiosError;

    await expect(errorHandler(error)).rejects.toBe(error);
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});