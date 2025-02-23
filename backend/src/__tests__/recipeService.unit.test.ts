import { Recipe } from '@prisma/client';
import { RecipeService } from '../services/recipeService';
import { mockPrisma, resetMockPrisma } from './helpers/mockPrisma';

describe('RecipeService Unit Tests', () => {
  beforeEach(() => {
    resetMockPrisma();
    RecipeService.prisma = mockPrisma;
  });

  afterEach(() => {
    RecipeService.resetPrisma();
  });

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    googleId: 'google-1',
    displayName: 'Test User',
    photoUrl: 'https://example.com/photo.jpg',
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockRecipeData = {
    title: 'Test Recipe',
    description: 'A test recipe description',
    ingredients: ['ingredient 1', 'ingredient 2'],
    instructions: ['Step 1', 'Step 2'],
    servings: 4,
    prepTime: 30,
    cookTime: 45
  };

  describe('createRecipe', () => {
    it('should create a new recipe', async () => {
      const expectedRecipe: Recipe = {
        id: 'recipe-1',
        userId: mockUser.id,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        imageUrl: null,
        sourceUrl: null,
        ...mockRecipeData,
      };

      mockPrisma.recipe.create.mockResolvedValue(expectedRecipe);

      const result = await RecipeService.createRecipe(mockUser.id, mockRecipeData);

      expect(result).toEqual(expectedRecipe);
      expect(mockPrisma.recipe.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          ...mockRecipeData,
        }
      });
    });

    it('should create recipe with minimal required fields', async () => {
      const minimalData = {
        title: 'Minimal Recipe',
        ingredients: ['ingredient'],
        instructions: ['Simple instruction step']
      };

      const expectedRecipe: Recipe = {
        id: 'recipe-1',
        userId: mockUser.id,
        isDeleted: false,
        description: null,
        servings: null,
        prepTime: null,
        cookTime: null,
        imageUrl: null,
        sourceUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...minimalData,
      };

      mockPrisma.recipe.create.mockResolvedValue(expectedRecipe);

      const result = await RecipeService.createRecipe(mockUser.id, minimalData);

      expect(result).toEqual(expectedRecipe);
      expect(mockPrisma.recipe.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          ...minimalData,
        }
      });
    });

    it('should fail when user does not exist', async () => {
      mockPrisma.recipe.create.mockRejectedValue(new Error('Foreign key constraint failed'));

      await expect(
        RecipeService.createRecipe('non-existent-id', mockRecipeData)
      ).rejects.toThrow(/foreign key constraint/i);
    });
  });

  describe('findById', () => {
    it('should find recipe by ID', async () => {
      const expectedRecipe: Recipe = {
        id: 'recipe-1',
        userId: mockUser.id,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        imageUrl: null,
        sourceUrl: null,
        ...mockRecipeData,
      };

      mockPrisma.recipe.findFirst.mockResolvedValue(expectedRecipe);

      const result = await RecipeService.findById('recipe-1');

      expect(result).toEqual(expectedRecipe);
      expect(mockPrisma.recipe.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'recipe-1',
          isDeleted: false
        }
      });
    });

    it('should return null for non-existent recipe', async () => {
      mockPrisma.recipe.findFirst.mockResolvedValue(null);

      const result = await RecipeService.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByUser', () => {
    it('should return user recipes with pagination', async () => {
      const expectedRecipes: Recipe[] = [
        {
          ...mockRecipeData,
          id: 'recipe-1',
          title: 'Recipe 1',
          userId: mockUser.id,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          imageUrl: null,
          sourceUrl: null,
        }
      ];

      mockPrisma.recipe.findMany.mockResolvedValue(expectedRecipes);

      const result = await RecipeService.findByUser(mockUser.id, { skip: 1, take: 1 });

      expect(result).toEqual(expectedRecipes);
      expect(mockPrisma.recipe.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
          isDeleted: false
        },
        skip: 1,
        take: 1,
        orderBy: {
          updatedAt: 'desc'
        }
      });
    });

    it('should include deleted recipes when specified', async () => {
      const expectedRecipes: Recipe[] = [
        {
          id: 'recipe-1',
          userId: mockUser.id,
          isDeleted: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          imageUrl: null,
          sourceUrl: null,
          ...mockRecipeData,
        }
      ];

      mockPrisma.recipe.findMany.mockResolvedValue(expectedRecipes);

      const result = await RecipeService.findByUser(mockUser.id, { includeDeleted: true });

      expect(result).toEqual(expectedRecipes);
      expect(mockPrisma.recipe.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
          isDeleted: undefined
        },
        skip: undefined,
        take: undefined,
        orderBy: {
          updatedAt: 'desc'
        }
      });
    });
  });

  describe('updateRecipe', () => {
    const mockExistingRecipe: Recipe = {
      id: 'recipe-1',
      userId: mockUser.id,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      imageUrl: null,
      sourceUrl: null,
      ...mockRecipeData,
    };

    it('should update recipe', async () => {
      mockPrisma.recipe.findFirst.mockResolvedValue(mockExistingRecipe);
      
      const updateData = {
        title: 'Updated Title',
        description: 'Updated description'
      };

      const expectedUpdated = {
        ...mockExistingRecipe,
        updatedAt: expect.any(Date),
        ...updateData,
      };

      mockPrisma.recipe.update.mockResolvedValue(expectedUpdated);

      const result = await RecipeService.updateRecipe('recipe-1', mockUser.id, updateData);

      expect(result).toEqual(expectedUpdated);
      expect(mockPrisma.recipe.update).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
        data: {
          updatedAt: expect.any(Date),
          ...updateData,
        }
      });
    });

    it('should throw error when recipe not found', async () => {
      mockPrisma.recipe.findFirst.mockResolvedValue(null);

      await expect(
        RecipeService.updateRecipe('non-existent-id', mockUser.id, { title: 'New Title' })
      ).rejects.toThrow('Recipe not found or unauthorized');
    });

    it('should throw error when user is not owner', async () => {
      mockPrisma.recipe.findFirst.mockResolvedValue({
        ...mockExistingRecipe,
        userId: 'different-user-id',
      });

      await expect(
        RecipeService.updateRecipe('recipe-1', mockUser.id, { title: 'New Title' })
      ).rejects.toThrow('Recipe not found or unauthorized');
    });
  });

  describe('softDeleteRecipe', () => {
    const mockExistingRecipe: Recipe = {
      id: 'recipe-1',
      userId: mockUser.id,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      imageUrl: null,
      sourceUrl: null,
      ...mockRecipeData,
    };

    it('should soft delete recipe', async () => {
      mockPrisma.recipe.findFirst.mockResolvedValue(mockExistingRecipe);

      const expectedDeleted = {
        ...mockExistingRecipe,
        isDeleted: true,
        updatedAt: expect.any(Date),
      };

      mockPrisma.recipe.update.mockResolvedValue(expectedDeleted);

      const result = await RecipeService.softDeleteRecipe('recipe-1', mockUser.id);

      expect(result).toEqual(expectedDeleted);
      expect(mockPrisma.recipe.update).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
        data: {
          isDeleted: true,
          updatedAt: expect.any(Date)
        }
      });
    });
  });

  describe('countUserRecipes', () => {
    it('should return correct count of user recipes', async () => {
      mockPrisma.recipe.count.mockResolvedValue(3);

      const result = await RecipeService.countUserRecipes(mockUser.id);

      expect(result).toBe(3);
      expect(mockPrisma.recipe.count).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
          isDeleted: false
        }
      });
    });

    it('should return 0 for non-existent user', async () => {
      mockPrisma.recipe.count.mockResolvedValue(0);

      const result = await RecipeService.countUserRecipes('non-existent-id');

      expect(result).toBe(0);
    });
  });
});