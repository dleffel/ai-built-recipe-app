import request from 'supertest';
import express from 'express';
import { RecipeService } from '../services/recipeService';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import recipeRoutes from '../routes/recipes';

// Mock RecipeService
jest.mock('../services/recipeService');

describe('Error Logging Format Tests', () => {
  let app: express.Application;
  let mockConsoleError: jest.SpyInstance;

  beforeEach(() => {
    app = express();
    // Add middleware to mock authentication
    app.use((req, res, next) => {
      req.user = {
        id: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        photoUrl: 'https://example.com/photo.jpg',
        googleId: 'test-google-id',
        hiddenFeedTags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date()
      };
      next();
    });
    app.use('/recipes', recipeRoutes);

    // Mock console.error to verify proper error message formatting
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockConsoleError.mockRestore();
    jest.resetModules();
  });

  describe('Error Message Format', () => {
    it('should format get recipes error message with comma', async () => {
      const error = new Error('Test error');
      (RecipeService.findByUser as jest.Mock).mockRejectedValue(error);
      (RecipeService.countUserRecipes as jest.Mock).mockRejectedValue(error);

      await request(app).get('/recipes');

      expect(mockConsoleError).toHaveBeenCalledWith('Get recipes error:', error);
    });

    it('should format update recipe error message with comma', async () => {
      const error = new Error('Test error');
      (RecipeService.updateRecipe as jest.Mock).mockRejectedValue(error);

      await request(app)
        .put('/recipes/123')
        .send({ title: 'Updated Recipe' });

      expect(mockConsoleError).toHaveBeenCalledWith('Update recipe error:', error);
    });

    it('should format delete recipe error message with comma', async () => {
      const error = new Error('Test error');
      (RecipeService.softDeleteRecipe as jest.Mock).mockRejectedValue(error);

      await request(app).delete('/recipes/123');

      expect(mockConsoleError).toHaveBeenCalledWith('Delete recipe error:', error);
    });

    it('should format Prisma validation error message with comma', async () => {
      const error = new PrismaClientKnownRequestError('Invalid data', {
        code: 'P2002',
        clientVersion: '2.0.0'
      });
      (RecipeService.updateRecipe as jest.Mock).mockRejectedValue(error);

      await request(app)
        .put('/recipes/123')
        .send({ title: 'Updated Recipe' });

      expect(mockConsoleError).toHaveBeenCalledWith('Update recipe error:', error);
    });
  });
});