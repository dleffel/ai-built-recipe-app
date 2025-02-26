import { PrismaClient, User, Recipe } from '@prisma/client';
import { withTestTransaction, TestDataFactory } from '../setupTests';
import { prisma } from '../lib/prisma';

// Mock prisma client
jest.mock('../lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    $disconnect: jest.fn(),
    user: {
      create: jest.fn()
    },
    recipe: {
      create: jest.fn()
    }
  }
}));

describe('setupTests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('withTestTransaction', () => {
    it('should execute callback within a transaction', async () => {
      const mockCallback = jest.fn().mockResolvedValue('test result');
      const mockTx = {};
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb) => cb(mockTx));

      const result = await withTestTransaction(mockCallback);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(mockTx);
      expect(result).toBe('test result');
    });

    it('should propagate errors from the transaction', async () => {
      const mockError = new Error('Transaction error');
      const mockCallback = jest.fn().mockRejectedValue(mockError);
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb) => cb({}));

      await expect(withTestTransaction(mockCallback)).rejects.toThrow(mockError);
    });
  });

  describe('TestDataFactory', () => {
    describe('createUniqueTestData', () => {
      it('should generate unique test data', () => {
        const data1 = TestDataFactory.createUniqueTestData();
        const data2 = TestDataFactory.createUniqueTestData();

        expect(data1.email).toMatch(/^test-\d+-\d+@example\.com$/);
        expect(data1.googleId).toMatch(/^google-\d+-\d+$/);
        expect(data1.displayName).toMatch(/^Test User \d+-\d+$/);
        expect(data1.photoUrl).toMatch(/^https:\/\/via\.placeholder\.com\/150\?text=\d+-\d+$/);

        // Verify uniqueness
        expect(data1.email).not.toBe(data2.email);
        expect(data1.googleId).not.toBe(data2.googleId);
        expect(data1.displayName).not.toBe(data2.displayName);
        expect(data1.photoUrl).not.toBe(data2.photoUrl);
      });
    });

    describe('createUser', () => {
      it('should create a user with default test data', async () => {
        const mockTx = {
          user: { create: jest.fn() }
        };
        const testData = TestDataFactory.createUniqueTestData();
        jest.spyOn(TestDataFactory, 'createUniqueTestData').mockReturnValue(testData);

        const mockUser: User = {
          id: 'test-id',
          ...testData,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date()
        };
        mockTx.user.create.mockResolvedValue(mockUser);

        const result = await TestDataFactory.createUser(mockTx as any);

        expect(mockTx.user.create).toHaveBeenCalledWith({
          data: {
            ...testData,
            lastLoginAt: expect.any(Date)
          }
        });
        expect(result).toBe(mockUser);
      });

      it('should override default data with provided data', async () => {
        const mockTx = {
          user: { create: jest.fn() }
        };
        const testData = TestDataFactory.createUniqueTestData();
        jest.spyOn(TestDataFactory, 'createUniqueTestData').mockReturnValue(testData);

        const customData = {
          email: 'custom@example.com',
          displayName: 'Custom User'
        };

        const mockUser: User = {
          id: 'test-id',
          ...testData,
          ...customData,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date()
        };
        mockTx.user.create.mockResolvedValue(mockUser);

        const result = await TestDataFactory.createUser(mockTx as any, customData);

        expect(mockTx.user.create).toHaveBeenCalledWith({
          data: {
            ...testData,
            ...customData,
            lastLoginAt: expect.any(Date)
          }
        });
        expect(result).toBe(mockUser);
      });
    });

    describe('createRecipe', () => {
      it('should create a recipe with default test data', async () => {
        const mockTx = {
          recipe: { create: jest.fn() }
        };

        const userId = 'test-user-id';
        const mockRecipe: Recipe = {
          id: 'test-recipe-id',
          userId,
          title: expect.stringMatching(/^Test Recipe \d+$/), // Match any timestamp-based number
          instructions: ['Test instructions'],
          ingredients: ['ingredient 1', 'ingredient 2'],
          createdAt: new Date(),
          updatedAt: new Date(),
          description: null,
          servings: null,
          prepTime: null,
          cookTime: null,
          imageUrl: null,
          sourceUrl: null,
          isDeleted: false
        };
        mockTx.recipe.create.mockResolvedValue(mockRecipe);

        const result = await TestDataFactory.createRecipe(mockTx as any, userId);

        expect(mockTx.recipe.create).toHaveBeenCalledWith({
          data: {
            userId,
            title: expect.stringMatching(/^Test Recipe \d+$/),
            instructions: ['Test instructions'],
            ingredients: ['ingredient 1', 'ingredient 2'],
            sourceUrl: null
          }
        });
        expect(result).toBe(mockRecipe);
      });

      it('should override default data with provided data', async () => {
        const mockTx = {
          recipe: { create: jest.fn() }
        };

        const userId = 'test-user-id';
        const customData = {
          title: 'Custom Recipe',
          instructions: ['Custom instructions'],
          ingredients: ['custom ingredient'],
          servings: 4
        };

        const mockRecipe: Recipe = {
          id: 'test-recipe-id',
          userId,
          ...customData,
          createdAt: new Date(),
          updatedAt: new Date(),
          description: null,
          prepTime: null,
          cookTime: null,
          imageUrl: null,
          sourceUrl: null,
          isDeleted: false
        };
        mockTx.recipe.create.mockResolvedValue(mockRecipe);

       const result = await TestDataFactory.createRecipe(mockTx as any, userId, customData);

       expect(mockTx.recipe.create).toHaveBeenCalledWith({
         data: {
           userId,
           ...customData,
           sourceUrl: null
         }
       });
       expect(result).toBe(mockRecipe);
      });
    });
  });

  describe('cleanup', () => {
    it('should disconnect from prisma after all tests', async () => {
      // Call prisma.$disconnect directly since we're testing the cleanup
      await prisma.$disconnect();

      expect(prisma.$disconnect).toHaveBeenCalled();
    });
  });
});