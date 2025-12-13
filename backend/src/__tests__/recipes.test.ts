import { Request, Response } from 'express';
import { RecipeService } from '../services/recipeService';
import { RecipeExtractionService, URLFetchError, RecipeExtractionError } from '../services/recipeExtractionService';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { User } from '@prisma/client';
import request from 'supertest';
import express from 'express';
import recipeRoutes from '../routes/recipes';

// Mock the services
jest.mock('../services/recipeService');
jest.mock('../services/recipeExtractionService');

describe('Recipe Routes', () => {
  let app: express.Application;
  let mockUser: User;

  beforeEach(() => {
    mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      googleId: 'test-google-id',
      displayName: 'Test User',
      photoUrl: 'https://example.com/photo.jpg',
      hiddenFeedTags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date()
    };

    app = express();
    app.use(express.json());
    // Mock authentication middleware
    app.use((req: Request, _res: Response, next) => {
      req.user = mockUser;
      next();
    });
    app.use('/recipes', recipeRoutes);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('URL Recipe Extraction', () => {
    it('should return 400 if URL is missing', async () => {
      const response = await request(app)
        .post('/recipes/extract-url')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'URL is required' });
    });

    it('should handle URLFetchError', async () => {
      const error = new URLFetchError('Failed to fetch URL');
      (RecipeExtractionService.extractRecipeFromUrl as jest.Mock).mockRejectedValue(error);

      const response = await request(app)
        .post('/recipes/extract-url')
        .send({ url: 'invalid-url' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: error.message });
    });

    it('should handle RecipeExtractionError', async () => {
      const error = new RecipeExtractionError('Failed to extract recipe', 'Invalid format');
      (RecipeExtractionService.extractRecipeFromUrl as jest.Mock).mockRejectedValue(error);

      const response = await request(app)
        .post('/recipes/extract-url')
        .send({ url: 'valid-url' });

      expect(response.status).toBe(422);
      expect(response.body).toEqual({
        error: error.message,
        details: error.details
      });
    });

    it('should successfully extract recipe from URL', async () => {
      const mockRecipe = {
        title: 'Test Recipe',
        ingredients: ['ingredient1'],
        instructions: ['step1'],
        sourceUrl: 'valid-url'
      };
      (RecipeExtractionService.extractRecipeFromUrl as jest.Mock).mockResolvedValue(mockRecipe);

      const response = await request(app)
        .post('/recipes/extract-url')
        .send({ url: 'valid-url' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRecipe);
    });
  });

  describe('Recipe Creation', () => {
    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/recipes')
        .send({ title: 'Test Recipe' }); // Missing ingredients and instructions

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Missing required fields: title, ingredients, and instructions are required'
      });
    });

    it('should handle database errors during creation', async () => {
      const error = new PrismaClientKnownRequestError('Database error', {
        code: 'P2002',
        clientVersion: '2.0.0'
      });
      (RecipeService.createRecipe as jest.Mock).mockRejectedValue(error);

      const response = await request(app)
        .post('/recipes')
        .send({
          title: 'Test Recipe',
          ingredients: ['ingredient1'],
          instructions: ['step1']
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid recipe data' });
    });

    it('should successfully create a recipe', async () => {
      const mockRecipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        ingredients: ['ingredient1'],
        instructions: ['step1'],
        userId: mockUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      (RecipeService.createRecipe as jest.Mock).mockResolvedValue(mockRecipe);

      const response = await request(app)
        .post('/recipes')
        .send({
          title: 'Test Recipe',
          ingredients: ['ingredient1'],
          instructions: ['step1']
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: mockRecipe.id,
        title: mockRecipe.title,
        ingredients: mockRecipe.ingredients,
        instructions: mockRecipe.instructions,
        userId: mockRecipe.userId
      });
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });
  });

  describe('Get Recipe Details', () => {
    it('should return 404 if recipe is not found', async () => {
      (RecipeService.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/recipes/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Recipe not found' });
    });

    it('should handle database errors when fetching recipe', async () => {
      (RecipeService.findById as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/recipes/recipe-id');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch recipe' });
    });

    it('should successfully return recipe details', async () => {
      const mockRecipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        ingredients: ['ingredient1'],
        instructions: ['step1'],
        userId: mockUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      (RecipeService.findById as jest.Mock).mockResolvedValue(mockRecipe);

      const response = await request(app)
        .get('/recipes/recipe-1');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: mockRecipe.id,
        title: mockRecipe.title,
        ingredients: mockRecipe.ingredients,
        instructions: mockRecipe.instructions,
        userId: mockRecipe.userId
      });
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });
  });

  describe('Update Recipe', () => {
    it('should return 404 if recipe not found or unauthorized', async () => {
      const error = new Error('Recipe not found or unauthorized');
      (RecipeService.updateRecipe as jest.Mock).mockRejectedValue(error);

      const response = await request(app)
        .put('/recipes/recipe-id')
        .send({ title: 'Updated Recipe' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Recipe not found or unauthorized' });
    });

    it('should handle invalid data during update', async () => {
      const error = new PrismaClientKnownRequestError('Database error', {
        code: 'P2002',
        clientVersion: '2.0.0'
      });
      (RecipeService.updateRecipe as jest.Mock).mockRejectedValue(error);

      const response = await request(app)
        .put('/recipes/recipe-id')
        .send({ title: 'Updated Recipe' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid recipe data' });
    });

    it('should successfully update a recipe', async () => {
      const mockRecipe = {
        id: 'recipe-1',
        title: 'Updated Recipe',
        ingredients: ['ingredient1'],
        instructions: ['step1'],
        userId: mockUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      (RecipeService.updateRecipe as jest.Mock).mockResolvedValue(mockRecipe);

      const response = await request(app)
        .put('/recipes/recipe-1')
        .send({ title: 'Updated Recipe' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: mockRecipe.id,
        title: mockRecipe.title,
        ingredients: mockRecipe.ingredients,
        instructions: mockRecipe.instructions,
        userId: mockRecipe.userId
      });
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });
  });

  describe('Delete Recipe', () => {
    it('should return 404 if recipe not found or unauthorized during deletion', async () => {
      const error = new Error('Recipe not found or unauthorized');
      (RecipeService.softDeleteRecipe as jest.Mock).mockRejectedValue(error);

      const response = await request(app)
        .delete('/recipes/recipe-id');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Recipe not found or unauthorized' });
    });

    it('should handle general errors during deletion', async () => {
      (RecipeService.softDeleteRecipe as jest.Mock).mockRejectedValue(new Error('Unknown error'));

      const response = await request(app)
        .delete('/recipes/recipe-id');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to delete recipe' });
    });

    it('should successfully delete a recipe', async () => {
      (RecipeService.softDeleteRecipe as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/recipes/recipe-1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Recipe deleted successfully' });
    });
  });

  describe('Authentication Middleware', () => {
    it('should return 401 if user is not authenticated', async () => {
      app = express();
      app.use(express.json());
      app.use('/recipes', recipeRoutes);

      const response = await request(app)
        .get('/recipes');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Not authenticated' });
    });
  });
});