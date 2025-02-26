import { Request, Response } from 'express';
import router from '../routes/recipes';
import { RecipeService } from '../services/recipeService';

// Mock RecipeService
jest.mock('../services/recipeService');

describe('Error Handling Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockConsoleError: jest.SpyInstance;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockNext = jest.fn();
    mockRequest = {
      params: {},
      query: {},
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        photoUrl: 'https://example.com/photo.jpg',
        googleId: 'test-google-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date()
      }
    };
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };

    // Mock console.error to verify proper error logging syntax
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    mockConsoleError.mockRestore();
    jest.clearAllMocks();
  });

  describe('Error Message Formatting', () => {
    it('should format get recipes error message correctly', async () => {
      const error = new Error('Test error');
      (RecipeService.findByUser as jest.Mock).mockRejectedValue(error);
      (RecipeService.countUserRecipes as jest.Mock).mockRejectedValue(error);

      // Find the GET handler for the root route
      const getHandler = (router as any).stack
        .find((layer: any) => layer.route?.path === '/' && layer.route.methods.get)
        ?.route?.stack[0].handle;

      if (!getHandler) {
        throw new Error('GET handler not found');
      }

      await getHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockConsoleError).toHaveBeenCalledWith('Get recipes error:', error);
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to fetch recipes' });
    });

    it('should format update recipe error message correctly', async () => {
      const error = new Error('Test error');
      (RecipeService.updateRecipe as jest.Mock).mockRejectedValue(error);

      mockRequest.params = { id: 'test-recipe-id' };
      mockRequest.body = { title: 'Updated Recipe' };

      // Find the PUT handler for the /:id route
      const putHandler = (router as any).stack
        .find((layer: any) => layer.route?.path === '/:id' && layer.route.methods.put)
        ?.route?.stack[0].handle;

      if (!putHandler) {
        throw new Error('PUT handler not found');
      }

      await putHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockConsoleError).toHaveBeenCalledWith('Update recipe error:', error);
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to update recipe' });
    });

    it('should format delete recipe error message correctly', async () => {
      const error = new Error('Test error');
      (RecipeService.softDeleteRecipe as jest.Mock).mockRejectedValue(error);

      mockRequest.params = { id: 'test-recipe-id' };

      // Find the DELETE handler for the /:id route
      const deleteHandler = (router as any).stack
        .find((layer: any) => layer.route?.path === '/:id' && layer.route.methods.delete)
        ?.route?.stack[0].handle;

      if (!deleteHandler) {
        throw new Error('DELETE handler not found');
      }

      await deleteHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockConsoleError).toHaveBeenCalledWith('Delete recipe error:', error);
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to delete recipe' });
    });
  });
});