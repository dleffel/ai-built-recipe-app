import { mockPrisma, resetMockPrisma, setupMockPrisma } from './mockPrisma';
import { Recipe, User } from '@prisma/client';

describe('mockPrisma', () => {
  beforeEach(() => {
    resetMockPrisma();
  });

  describe('resetMockPrisma', () => {
    it('should reset all mock implementations', () => {
      // Set up some mock implementations
      mockPrisma.recipe.create.mockResolvedValue({} as Recipe);
      mockPrisma.recipe.findFirst.mockResolvedValue({} as Recipe);
      mockPrisma.recipe.findMany.mockResolvedValue([]);
      mockPrisma.recipe.update.mockResolvedValue({} as Recipe);
      mockPrisma.recipe.count.mockResolvedValue(1);
      mockPrisma.user.create.mockResolvedValue({} as User);
      mockPrisma.user.findUnique.mockResolvedValue({} as User);
      mockPrisma.user.update.mockResolvedValue({} as User);

      // Reset all mocks
      resetMockPrisma();

      // Verify all mocks were reset
      expect(mockPrisma.recipe.create).not.toHaveBeenCalled();
      expect(mockPrisma.recipe.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.recipe.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.recipe.update).not.toHaveBeenCalled();
      expect(mockPrisma.recipe.count).not.toHaveBeenCalled();
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('setupMockPrisma', () => {
    describe('Recipe mocks', () => {
      const mockRecipe: Recipe = {
        id: 'test-id',
        userId: 'test-user-id',
        title: 'Test Recipe',
        description: 'Test Description',
        ingredients: ['ingredient 1'],
        instructions: 'Test Instructions',
        servings: 4,
        prepTime: 30,
        cookTime: 45,
        imageUrl: 'test-image.jpg',
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      it('should set up recipe create mock', async () => {
        setupMockPrisma.mockRecipeCreate(mockRecipe);
        const result = await mockPrisma.recipe.create({
          data: {
            title: 'Test Recipe',
            ingredients: ['test'],
            instructions: 'Test instructions',
            userId: 'test-user-id'
          }
        });
        expect(result).toBe(mockRecipe);
      });

      it('should set up recipe find mock', async () => {
        setupMockPrisma.mockRecipeFind(mockRecipe);
        const result = await mockPrisma.recipe.findFirst();
        expect(result).toBe(mockRecipe);
      });

      it('should set up recipe findMany mock', async () => {
        const mockRecipes = [mockRecipe];
        setupMockPrisma.mockRecipeFindMany(mockRecipes);
        const result = await mockPrisma.recipe.findMany();
        expect(result).toBe(mockRecipes);
      });
    });

    describe('User mocks', () => {
      const mockUser: User = {
        id: 'test-id',
        email: 'test@example.com',
        googleId: 'test-google-id',
        displayName: 'Test User',
        photoUrl: 'test-photo.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date()
      };

      it('should set up user create mock', async () => {
        setupMockPrisma.mockUserCreate(mockUser);
        const result = await mockPrisma.user.create({
          data: {
            email: 'test@example.com',
            googleId: 'test-google-id',
            displayName: 'Test User',
            lastLoginAt: new Date()
          }
        });
        expect(result).toBe(mockUser);
      });

      it('should set up user find mock', async () => {
        setupMockPrisma.mockUserFind(mockUser);
        const result = await mockPrisma.user.findUnique({
          where: { id: 'test-id' }
        });
        expect(result).toBe(mockUser);
      });
    });
  });
});