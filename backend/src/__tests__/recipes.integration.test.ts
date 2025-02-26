import { User, Recipe } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import {
  createTestUser,
  createTestRecipe,
  cleanupTestData,
  createTestSessionCookie,
  createRecipeData,
  setupRecipeMocks
} from './helpers/testHelpers.test';
import { RecipeService } from '../services/recipeService';
// Mock the RecipeService
jest.mock('../services/recipeService', () => ({
  RecipeService: {
    findByUser: jest.fn(),
    findById: jest.fn(),
    createRecipe: jest.fn(),
    updateRecipe: jest.fn(),
    softDeleteRecipe: jest.fn(),
    countUserRecipes: jest.fn()
  }
}));

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  // Set up default successful responses
  (RecipeService.findByUser as jest.Mock).mockResolvedValue([]);
  (RecipeService.findById as jest.Mock).mockResolvedValue(null);
  (RecipeService.createRecipe as jest.Mock).mockImplementation(async (userId, data) => ({
    id: 'test-id',
    userId,
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false
  }));
  (RecipeService.updateRecipe as jest.Mock).mockImplementation(async (id, userId, data) => ({
    id,
    userId,
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false
  }));
  (RecipeService.softDeleteRecipe as jest.Mock).mockResolvedValue(true);
});
jest.mock('../services/recipeService');

// Mock passport before importing app
const mockPassport = {
  authenticate: jest.fn((strategy) => (req: any, res: any, next: any) => {
    if (req.user) {  // Changed: check req.user instead of session
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  }),
  use: jest.fn(),
  serializeUser: jest.fn(),
  deserializeUser: jest.fn(),
  initialize: jest.fn(() => (req: any, res: any, next: any) => next()),
  session: jest.fn(() => (req: any, res: any, next: any) => {
    // This is the key change: handle session deserialization
    if (req.session?.passport?.user) {
      req.user = { id: req.session.passport.user };
    }
    next();
  })
};

jest.mock('passport', () => mockPassport);

// Mock cookie-session
jest.mock('cookie-session', () => {
  return jest.fn((options) => (req: any, res: any, next: any) => {
    // Get session cookie from request
    const sessionCookie = req.headers.cookie?.split(';')
      .find((c: string) => c.trim().startsWith('session='));
    
    if (sessionCookie) {
      // Extract and decode cookie value
      const cookieValue = sessionCookie.split('=')[1].trim();
      const decodedSession = JSON.parse(Buffer.from(cookieValue, 'base64').toString());
      req.session = decodedSession;
    } else {
      req.session = {};
    }
    next();
  });
});

// Import app after mocks
import request from 'supertest';
import app from '../server';

describe('Recipe API Integration Tests', () => {
  let testUser: User;
  let authCookie: string[];

  beforeAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    // Create a test user with index
    const index = Math.floor(Math.random() * 1000);
    testUser = await createTestUser(index);
    authCookie = createTestSessionCookie(testUser.id);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('POST /api/recipes', () => {
    const data = {
      title: 'Test Recipe',
      description: 'A test recipe description',
      ingredients: ['ingredient 1', 'ingredient 2'],
      instructions: 'Test instructions',
      servings: 4,
      prepTime: 30,
      cookTime: 45
    };

    it('should create a new recipe when authenticated', async () => {
      // Mock successful creation
      const createdRecipe = {
        id: 'test-id',
        userId: testUser.id,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false
      };
      (RecipeService.createRecipe as jest.Mock).mockResolvedValueOnce(createdRecipe);

      const response = await request(app)
        .post('/api/recipes')
        .set('Cookie', authCookie)
        .send(data);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        title: data.title,
        description: data.description,
        ingredients: data.ingredients,
        instructions: data.instructions,
        servings: data.servings,
        prepTime: data.prepTime,
        cookTime: data.cookTime,
        userId: testUser.id
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/recipes')
        .set('Cookie', authCookie)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields: title, ingredients, and instructions are required');
    });

    it('should validate partial required fields', async () => {
      const partialData = {
        title: 'Test Recipe',
        // missing ingredients and instructions
      };

      const response = await request(app)
        .post('/api/recipes')
        .set('Cookie', authCookie)
        .send(partialData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields: title, ingredients, and instructions are required');
    });

    it('should handle Prisma validation errors', async () => {
      // Mock Prisma error
      (RecipeService.createRecipe as jest.Mock).mockRejectedValueOnce(
        new PrismaClientKnownRequestError('Validation error', {
          code: 'P2002',
          clientVersion: '2.0.0'
        })
      );

      const response = await request(app)
        .post('/api/recipes')
        .set('Cookie', authCookie)
        .send(data);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid recipe data');
    });

    it('should validate ingredients array', async () => {
      const invalidData = {
        ...data,
        ingredients: 'not an array'
      };

      // Mock validation error
      (RecipeService.createRecipe as jest.Mock).mockRejectedValueOnce(
        new Error('Invalid ingredients')
      );

      const response = await request(app)
        .post('/api/recipes')
        .set('Cookie', authCookie)
        .send(invalidData);

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });

    it('should validate numeric fields', async () => {
      const invalidData = {
        ...data,
        servings: 'not a number',
        prepTime: 'not a number',
        cookTime: 'not a number'
      };

      // Mock validation error
      (RecipeService.createRecipe as jest.Mock).mockRejectedValueOnce(
        new Error('Invalid numeric fields')
      );

      const response = await request(app)
        .post('/api/recipes')
        .set('Cookie', authCookie)
        .send(invalidData);

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/recipes')
        .send(data);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/recipes', () => {
    let recipes: Recipe[];

    beforeEach(async () => {
      // Create test recipes with unique indices
      const indices = [1, 2, 3].map(i => Math.floor(Math.random() * 1000) + i);
      
      // Create recipe data for each index
      const recipesData = indices.map(index => createRecipeData(testUser, index));
      
      // Set up mocks for all recipes
      setupRecipeMocks(recipesData);
      
      // Create the recipes
      recipes = await Promise.all(
        indices.map(index => createTestRecipe(testUser, index))
      );
    });

    it('should return user recipes with pagination', async () => {
      // Mock successful response
      (RecipeService.findByUser as jest.Mock).mockResolvedValueOnce(recipes);
      (RecipeService.countUserRecipes as jest.Mock).mockResolvedValueOnce(3);

      const response = await request(app)
        .get('/api/recipes')
        .set('Cookie', authCookie)
        .query({ skip: 0, take: 10 });

      expect(response.status).toBe(200);
      expect(response.body.recipes).toHaveLength(3);
      expect(response.body.recipes.map((r: Recipe) => r.id)).toEqual(
        expect.arrayContaining(recipes.map(r => r.id))
      );
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(3);
    });

    it('should handle pagination correctly', async () => {
      // Mock paginated response
      (RecipeService.findByUser as jest.Mock).mockResolvedValueOnce([recipes[1]]);
      (RecipeService.countUserRecipes as jest.Mock).mockResolvedValueOnce(3);

      const response = await request(app)
        .get('/api/recipes')
        .set('Cookie', authCookie)
        .query({ skip: 1, take: 1 });

      expect(response.status).toBe(200);
      expect(response.body.recipes).toHaveLength(1);
      expect(response.body.pagination.total).toBe(3);
    });

    it('should handle invalid skip parameter', async () => {
      (RecipeService.findByUser as jest.Mock).mockRejectedValueOnce(
        new Error('Invalid skip parameter')
      );

      const response = await request(app)
        .get('/api/recipes')
        .set('Cookie', authCookie)
        .query({ skip: 'invalid', take: 10 });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch recipes');
    });

    it('should handle invalid take parameter', async () => {
      (RecipeService.findByUser as jest.Mock).mockRejectedValueOnce(
        new Error('Invalid take parameter')
      );

      const response = await request(app)
        .get('/api/recipes')
        .set('Cookie', authCookie)
        .query({ skip: 0, take: 'invalid' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch recipes');
    });

    it('should handle negative pagination values', async () => {
      (RecipeService.findByUser as jest.Mock).mockRejectedValueOnce(
        new Error('Invalid pagination values')
      );

      const response = await request(app)
        .get('/api/recipes')
        .set('Cookie', authCookie)
        .query({ skip: -1, take: -5 });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch recipes');
    });

    it('should handle database errors', async () => {
      (RecipeService.findByUser as jest.Mock).mockRejectedValueOnce(
        new Error('Database error')
      );

      const response = await request(app)
        .get('/api/recipes')
        .set('Cookie', authCookie)
        .query({ skip: 0, take: 10 });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch recipes');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/recipes');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/recipes/:id', () => {
    let recipe: Recipe;

    beforeEach(async () => {
      const index = Math.floor(Math.random() * 1000);
      const recipeData = createRecipeData(testUser, index);
      setupRecipeMocks([recipeData]);
      recipe = await createTestRecipe(testUser, index);
    });

    it('should return recipe by ID', async () => {
      // Mock successful response
      (RecipeService.findById as jest.Mock).mockResolvedValueOnce(recipe);

      const response = await request(app)
        .get(`/api/recipes/${recipe.id}`)
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(recipe.id);
      expect(response.body.title).toBe(recipe.title);
    });

    it('should return 404 for non-existent recipe', async () => {
      // Mock recipe not found
      (RecipeService.findById as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/recipes/non-existent-id')
        .set('Cookie', authCookie);

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`/api/recipes/${recipe.id}`);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/recipes/:id', () => {
    let recipe: Recipe;

    beforeEach(async () => {
      const recipeData = createRecipeData(testUser, 1);
      setupRecipeMocks([recipeData]);
      recipe = await createTestRecipe(testUser, 1);
    });

    it('should update recipe', async () => {
      const updateData = {
        title: 'Updated Title',
        description: 'Updated description'
      };

      // Mock successful update
      (RecipeService.updateRecipe as jest.Mock).mockResolvedValueOnce({
        ...recipe,
        ...updateData
      });

      const response = await request(app)
        .put(`/api/recipes/${recipe.id}`)
        .set('Cookie', authCookie)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe(updateData.title);
      expect(response.body.description).toBe(updateData.description);
      expect(response.body.ingredients).toEqual(recipe.ingredients);
    });

    it('should validate update data with Prisma error', async () => {
      const invalidData = {
        servings: 'not a number',
        prepTime: 'not a number',
        cookTime: 'not a number',
        ingredients: 'not an array'
      };

      // Mock Prisma validation error
      (RecipeService.updateRecipe as jest.Mock).mockRejectedValueOnce(
        new PrismaClientKnownRequestError('Invalid data format', {
          code: 'P2002',
          clientVersion: '2.0.0'
        })
      );

      const response = await request(app)
        .put(`/api/recipes/${recipe.id}`)
        .set('Cookie', authCookie)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid recipe data');
    });

    it('should handle generic validation errors', async () => {
      const invalidData = {
        servings: 'not a number',
        prepTime: 'not a number',
        cookTime: 'not a number'
      };

      // Mock generic error
      (RecipeService.updateRecipe as jest.Mock).mockRejectedValueOnce(
        new Error('Invalid data')
      );

      const response = await request(app)
        .put(`/api/recipes/${recipe.id}`)
        .set('Cookie', authCookie)
        .send(invalidData);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to update recipe');
    });

    it('should handle database errors during update', async () => {
      // Mock recipe not found error
      (RecipeService.updateRecipe as jest.Mock).mockRejectedValueOnce(
        new Error('Recipe not found or unauthorized')
      );

      const response = await request(app)
        .put(`/api/recipes/${recipe.id}`)
        .set('Cookie', authCookie)
        .send({ title: 'New Title' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Recipe not found or unauthorized');
    });

    it('should return 404 for non-existent recipe', async () => {
      // Mock recipe not found
      (RecipeService.updateRecipe as jest.Mock).mockRejectedValueOnce(
        new Error('Recipe not found or unauthorized')
      );

      const response = await request(app)
        .put('/api/recipes/non-existent-id')
        .set('Cookie', authCookie)
        .send({ title: 'New Title' });

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .put(`/api/recipes/${recipe.id}`)
        .send({ title: 'New Title' });

      expect(response.status).toBe(401);
    });

    describe('when recipe owned by different user', () => {
      let otherUser: User;
      let otherUserRecipe: Recipe;

      beforeEach(async () => {
        const otherUserIndex = Math.floor(Math.random() * 1000) + 1000; // Ensure different range
        otherUser = await createTestUser(otherUserIndex);
        const otherRecipeData = createRecipeData(otherUser, otherUserIndex + 1);
        setupRecipeMocks([otherRecipeData]);
        otherUserRecipe = await createTestRecipe(otherUser, otherUserIndex + 1);
      });

      it('should return 404 when updating recipe owned by different user', async () => {
        // Mock recipe not found error for different user's recipe
        (RecipeService.updateRecipe as jest.Mock).mockRejectedValueOnce(
          new Error('Recipe not found or unauthorized')
        );

        const response = await request(app)
          .put(`/api/recipes/${otherUserRecipe.id}`)
          .set('Cookie', authCookie)
          .send({ title: 'New Title' });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Recipe not found or unauthorized');
      });
    });
  });

  describe('DELETE /api/recipes/:id', () => {
    let recipe: Recipe;

    beforeEach(async () => {
      const recipeData = createRecipeData(testUser, 1);
      setupRecipeMocks([recipeData]);
      recipe = await createTestRecipe(testUser, 1);
    });

    it('should soft delete recipe', async () => {
      // Mock successful delete
      (RecipeService.softDeleteRecipe as jest.Mock).mockResolvedValueOnce(true);
      // Mock recipe not found after deletion
      (RecipeService.findById as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app)
        .delete(`/api/recipes/${recipe.id}`)
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Recipe deleted successfully');

      // Verify recipe is soft deleted
      const getResponse = await request(app)
        .get(`/api/recipes/${recipe.id}`)
        .set('Cookie', authCookie);

      expect(getResponse.status).toBe(404);
    });

    it('should handle database errors during delete', async () => {
      // Mock recipe not found error
      (RecipeService.softDeleteRecipe as jest.Mock).mockRejectedValueOnce(
        new Error('Recipe not found or unauthorized')
      );

      const response = await request(app)
        .delete(`/api/recipes/${recipe.id}`)
        .set('Cookie', authCookie);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Recipe not found or unauthorized');
    });

    describe('when recipe owned by different user', () => {
      let otherUser: User;
      let otherUserRecipe: Recipe;

      beforeEach(async () => {
        otherUser = await createTestUser(2);
        const otherRecipeData = createRecipeData(otherUser, 1);
        setupRecipeMocks([otherRecipeData]);
        otherUserRecipe = await createTestRecipe(otherUser, 1);
      });

      it('should return 404 when deleting recipe owned by different user', async () => {
        // Mock recipe not found error for different user's recipe
        (RecipeService.softDeleteRecipe as jest.Mock).mockRejectedValueOnce(
          new Error('Recipe not found or unauthorized')
        );

        const response = await request(app)
          .delete(`/api/recipes/${otherUserRecipe.id}`)
          .set('Cookie', authCookie);

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Recipe not found or unauthorized');
      });
    });

    it('should return 404 for non-existent recipe', async () => {
      // Mock recipe not found error
      (RecipeService.softDeleteRecipe as jest.Mock).mockRejectedValueOnce(
        new Error('Recipe not found or unauthorized')
      );

      const response = await request(app)
        .delete('/api/recipes/non-existent-id')
        .set('Cookie', authCookie);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Recipe not found or unauthorized');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .delete(`/api/recipes/${recipe.id}`);

      expect(response.status).toBe(401);
    });
  });
});