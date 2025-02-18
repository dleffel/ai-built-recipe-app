import { User } from '@prisma/client';
import { createTestUser, cleanupTestData, createTestSessionCookie } from './helpers/testHelpers.test';

// Mock the RecipeExtractionService
jest.mock('../services/recipeExtractionService', () => {
  // Create mock error classes
  class MockURLFetchError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'URLFetchError';
    }
  }

  class MockRecipeExtractionError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'RecipeExtractionError';
    }
  }

  return {
    RecipeExtractionService: {
      extractRecipeFromUrl: jest.fn()
    },
    URLFetchError: MockURLFetchError,
    RecipeExtractionError: MockRecipeExtractionError
  };
});

// Import after mocks
import { RecipeExtractionService, URLFetchError, RecipeExtractionError } from '../services/recipeExtractionService';

// Mock passport before importing app
const mockPassport = {
  authenticate: jest.fn((strategy) => (req: any, res: any, next: any) => {
    if (req.user) {
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
    const sessionCookie = req.headers.cookie?.split(';')
      .find((c: string) => c.trim().startsWith('session='));
    
    if (sessionCookie) {
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

describe('Recipe Extraction API Integration Tests', () => {
  let testUser: User;
  let authCookie: string[];

  beforeAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    testUser = await createTestUser(1);
    authCookie = createTestSessionCookie(testUser.id);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('POST /api/recipes/extract-url', () => {
    const validUrl = 'https://example.com/recipe';
    const mockRecipeData = {
      title: 'Test Recipe',
      description: 'Test Description',
      ingredients: ['Ingredient 1', 'Ingredient 2'],
      instructions: 'Test Instructions',
      servings: 4,
      prepTime: 30,
      cookTime: 45
    };

    it('should extract recipe from valid URL', async () => {
      (RecipeExtractionService.extractRecipeFromUrl as jest.Mock)
        .mockResolvedValueOnce(mockRecipeData);

      const response = await request(app)
        .post('/api/recipes/extract-url')
        .set('Cookie', authCookie)
        .send({ url: validUrl });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRecipeData);
      expect(RecipeExtractionService.extractRecipeFromUrl).toHaveBeenCalledWith(validUrl);
    }, 30000);

    it('should return 400 for invalid URL format', async () => {
      (RecipeExtractionService.extractRecipeFromUrl as jest.Mock)
        .mockRejectedValueOnce(new URLFetchError('Invalid URL format'));

      const response = await request(app)
        .post('/api/recipes/extract-url')
        .set('Cookie', authCookie)
        .send({ url: 'invalid-url' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid URL format');
    }, 30000);

    it('should return 422 when recipe extraction fails', async () => {
      (RecipeExtractionService.extractRecipeFromUrl as jest.Mock)
        .mockRejectedValueOnce(new RecipeExtractionError('Failed to extract recipe data'));

      const response = await request(app)
        .post('/api/recipes/extract-url')
        .set('Cookie', authCookie)
        .send({ url: validUrl });

      expect(response.status).toBe(422);
      expect(response.body.error).toBe('Failed to extract recipe data');
    }, 30000);

    it('should handle network errors during extraction', async () => {
      (RecipeExtractionService.extractRecipeFromUrl as jest.Mock)
        .mockRejectedValueOnce(new URLFetchError('Network error'));

      const response = await request(app)
        .post('/api/recipes/extract-url')
        .set('Cookie', authCookie)
        .send({ url: validUrl });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Network error');
    }, 30000);

    it('should handle malformed recipe data', async () => {
      (RecipeExtractionService.extractRecipeFromUrl as jest.Mock)
        .mockRejectedValueOnce(new RecipeExtractionError('Missing required recipe fields'));

      const response = await request(app)
        .post('/api/recipes/extract-url')
        .set('Cookie', authCookie)
        .send({ url: validUrl });

      expect(response.status).toBe(422);
      expect(response.body.error).toBe('Missing required recipe fields');
    }, 30000);

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/recipes/extract-url')
        .send({ url: validUrl });

      expect(response.status).toBe(401);
    }, 30000);

    it('should return 400 when URL is missing', async () => {
      const response = await request(app)
        .post('/api/recipes/extract-url')
        .set('Cookie', authCookie)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('URL is required');
    }, 30000);
  });
});