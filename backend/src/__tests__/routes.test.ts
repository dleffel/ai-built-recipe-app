import { Request, Response } from 'express';
import router from '../routes/recipes';
import { RecipeService } from '../services/recipeService';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// Mock console.error to verify error logging
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

// Mock RecipeService
jest.mock('../services/recipeService');

describe('Recipe Route Error Handling', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

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
    jest.clearAllMocks();
  });

  describe('Error Logging', () => {
    it('should properly log get recipes error', async () => {
      const error = new Error('Test error');
      (RecipeService.findByUser as jest.Mock).mockRejectedValue(error);
// Get route handler from router
const routeHandlers = (router as any).stack
  .filter((layer: any) => layer.route)
  .reduce((handlers: any, layer: any) => {
    const method = Object.keys(layer.route.methods)[0];
    handlers[`${layer.route.path}:${method}`] = layer.route.stack.slice(-1)[0].handle;
    return handlers;
  }, {});
const getUserRecipes = routeHandlers['/:get'];

await getUserRecipes(mockRequest as Request, mockResponse as Response);
      await getUserRecipes(mockRequest as Request, mockResponse as Response);

      expect(mockConsoleError).toHaveBeenCalledWith('Get recipes error:', error);
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to fetch recipes' });
    });

    it('should properly log update recipe error', async () => {
      const error = new Error('Test error');
      (RecipeService.updateRecipe as jest.Mock).mockRejectedValue(error);
const routeHandlers = (router as any).stack
  .filter((layer: any) => layer.route)
  .reduce((handlers: any, layer: any) => {
    const method = Object.keys(layer.route.methods)[0];
    handlers[`${layer.route.path}:${method}`] = layer.route.stack.slice(-1)[0].handle;
    return handlers;
  }, {});
const updateRecipe = routeHandlers['/:id:put'];

await updateRecipe(mockRequest as Request, mockResponse as Response);
      await updateRecipe(mockRequest as Request, mockResponse as Response);

      expect(mockConsoleError).toHaveBeenCalledWith('Update recipe error:', error);
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to update recipe' });
    });

    it('should properly log delete recipe error', async () => {
      const error = new Error('Test error');
      (RecipeService.softDeleteRecipe as jest.Mock).mockRejectedValue(error);

      const routeHandlers = (router as any).stack
        .filter((layer: any) => layer.route)
        .reduce((handlers: any, layer: any) => {
          const method = Object.keys(layer.route.methods)[0];
          handlers[`${layer.route.path}:${method}`] = layer.route.stack.slice(-1)[0].handle;
          return handlers;
        }, {});
      const deleteRecipe = routeHandlers['/:id:delete'];

      await deleteRecipe(mockRequest as Request, mockResponse as Response);

      expect(mockConsoleError).toHaveBeenCalledWith('Delete recipe error:', error);
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to delete recipe' });
    });
  });
});