import request from 'supertest';
import express from 'express';
import { RecipeService } from '../services/recipeService';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { User } from '@prisma/client';
import recipeRoutes from '../routes/recipes';

// Mock RecipeService
jest.mock('../services/recipeService');

describe('Recipe Routes', () => {
  let app: express.Application;
  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    photoUrl: 'https://example.com/photo.jpg',
    googleId: 'test-google-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date()
  };

  beforeEach(() => {
    app = express();
    // Add middleware to mock authentication
    app.use((req, res, next) => {
      req.user = mockUser;
      next();
    });
    app.use('/recipes', recipeRoutes);
  });

  describe('GET /recipes', () => {
    it('should handle errors correctly', async () => {
      const error = new Error('Database error');
      (RecipeService.findByUser as jest.Mock).mockRejectedValue(error);
      (RecipeService.countUserRecipes as jest.Mock).mockRejectedValue(error);

      const response = await request(app).get('/recipes');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch recipes' });
    });
  });

  describe('PUT /recipes/:id', () => {
    it('should handle errors correctly', async () => {
      const error = new Error('Update error');
      (RecipeService.updateRecipe as jest.Mock).mockRejectedValue(error);

      const response = await request(app)
        .put('/recipes/123')
        .send({ title: 'Updated Recipe' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to update recipe' });
    });

    it('should handle Prisma validation errors', async () => {
      const error = new PrismaClientKnownRequestError('Invalid data', {
        code: 'P2002',
        clientVersion: '2.0.0'
      });
      (RecipeService.updateRecipe as jest.Mock).mockRejectedValue(error);

      const response = await request(app)
        .put('/recipes/123')
        .send({ title: 'Updated Recipe' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid recipe data' });
    });
  });

  describe('DELETE /recipes/:id', () => {
    it('should handle errors correctly', async () => {
      const error = new Error('Delete error');
      (RecipeService.softDeleteRecipe as jest.Mock).mockRejectedValue(error);

      const response = await request(app).delete('/recipes/123');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to delete recipe' });
    });

    it('should handle not found errors', async () => {
      const error = new Error('Recipe not found or unauthorized');
      (RecipeService.softDeleteRecipe as jest.Mock).mockRejectedValue(error);

      const response = await request(app).delete('/recipes/123');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Recipe not found or unauthorized' });
    });
  });
});