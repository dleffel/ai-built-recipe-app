import { Request, Response } from 'express';
import router from '../routes/recipes';
import { RecipeService } from '../services/recipeService';

// Mock RecipeService
jest.mock('../services/recipeService');

describe('Error Logging Tests', () => {
  // Extract route handlers from router
  const routeHandlers = (router as any).stack
    .filter((layer: any) => layer.route)
    .reduce((handlers: any, layer: any) => {
      const method = Object.keys(layer.route.methods)[0];
      handlers[`${layer.route.path}:${method}`] = layer.route.stack.slice(-1)[0].handle;
      return handlers;
    }, {});

  const getUserRecipes = routeHandlers['/:get'];
  const updateRecipe = routeHandlers['/:id:put'];
  const deleteRecipe = routeHandlers['/:id:delete'];
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockConsoleError: jest.SpyInstance;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
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
  });

  describe('Error Message Formatting', () => {
    it('should format get recipes error message correctly', async () => {
      const error = new Error('Test error');
      (RecipeService.findByUser as jest.Mock).mockRejectedValue(error);
      
      await getUserRecipes(mockRequest as Request, mockResponse as Response);
      
      // Verify error message format
      expect(mockConsoleError).toHaveBeenCalledWith('Get recipes error:', error);
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to fetch recipes' });
    });

    it('should format update recipe error message correctly', async () => {
      const error = new Error('Test error');
      (RecipeService.updateRecipe as jest.Mock).mockRejectedValue(error);
      
      await updateRecipe(mockRequest as Request, mockResponse as Response);
      
      // Verify error message format
      expect(mockConsoleError).toHaveBeenCalledWith('Update recipe error:', error);
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to update recipe' });
    });

    it('should format delete recipe error message correctly', async () => {
      const error = new Error('Test error');
      (RecipeService.softDeleteRecipe as jest.Mock).mockRejectedValue(error);
      
      await deleteRecipe(mockRequest as Request, mockResponse as Response);
      
      // Verify error message format
      expect(mockConsoleError).toHaveBeenCalledWith('Delete recipe error:', error);
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to delete recipe' });
    });
  });
});