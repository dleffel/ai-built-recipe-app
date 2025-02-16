import { User, Recipe } from '@prisma/client';
import { createTestUser, createTestRecipe, cleanupTestData, createTestSessionCookie } from './helpers/testHelpers.test';

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
    // Create a test user and session
    testUser = await createTestUser(1);
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
      expect(response.body).toHaveProperty('error');
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
      // Create test recipes
      recipes = await Promise.all([
        createTestRecipe(testUser, 1),
        createTestRecipe(testUser, 2),
        createTestRecipe(testUser, 3)
      ]);
    });

    it('should return user recipes with pagination', async () => {
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
    });

    it('should handle pagination correctly', async () => {
      const response = await request(app)
        .get('/api/recipes')
        .set('Cookie', authCookie)
        .query({ skip: 1, take: 1 });

      expect(response.status).toBe(200);
      expect(response.body.recipes).toHaveLength(1);
      expect(response.body.pagination.total).toBe(3);
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
      recipe = await createTestRecipe(testUser, 1);
    });

    it('should return recipe by ID', async () => {
      const response = await request(app)
        .get(`/api/recipes/${recipe.id}`)
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(recipe.id);
      expect(response.body.title).toBe(recipe.title);
    });

    it('should return 404 for non-existent recipe', async () => {
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
      recipe = await createTestRecipe(testUser, 1);
    });

    it('should update recipe', async () => {
      const updateData = {
        title: 'Updated Title',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/recipes/${recipe.id}`)
        .set('Cookie', authCookie)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe(updateData.title);
      expect(response.body.description).toBe(updateData.description);
      expect(response.body.ingredients).toEqual(recipe.ingredients);
    });

    it('should return 404 for non-existent recipe', async () => {
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
        otherUser = await createTestUser(2);
        otherUserRecipe = await createTestRecipe(otherUser, 1);
      });

      it('should return 404 when updating recipe owned by different user', async () => {
        const response = await request(app)
          .put(`/api/recipes/${otherUserRecipe.id}`)
          .set('Cookie', authCookie)
          .send({ title: 'New Title' });

        expect(response.status).toBe(404);
      });
    });
  });

  describe('DELETE /api/recipes/:id', () => {
    let recipe: Recipe;

    beforeEach(async () => {
      recipe = await createTestRecipe(testUser, 1);
    });

    it('should soft delete recipe', async () => {
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

    it('should return 404 for non-existent recipe', async () => {
      const response = await request(app)
        .delete('/api/recipes/non-existent-id')
        .set('Cookie', authCookie);

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .delete(`/api/recipes/${recipe.id}`);

      expect(response.status).toBe(401);
    });
  });
});