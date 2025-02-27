import { PrismaClient, User, Recipe } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { RecipeService } from '../../services/recipeService';
import { UserService } from '../../services/userService';

// Create mock PrismaClient
const mockPrisma: DeepMockProxy<PrismaClient> = mockDeep<PrismaClient>();

// Mock the prisma import
jest.mock('../../lib/prisma', () => ({
  prisma: mockPrisma
}));

// Helper to create a unique test user
export const createTestUser = async (index: number): Promise<User> => {
  const timestamp = Date.now();
  const uniqueId = `${timestamp}-${index}-${Math.random().toString(36).substring(2, 7)}`;
  
  const userData = {
    id: `user-${uniqueId}`,
    email: `test-${uniqueId}@example.com`,
    googleId: `google-${uniqueId}`,
    displayName: `Test User ${uniqueId}`,
    photoUrl: `https://via.placeholder.com/150?text=${uniqueId}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date()
  };

  mockPrisma.user.create.mockResolvedValueOnce(userData);
  return mockPrisma.user.create({ data: userData });
};

// Helper to create a test recipe
// Helper to create recipe test data without setting up mocks
export const createRecipeData = (user: User, index: number): Recipe => {
  return {
    id: `recipe-test-${index}`,
    title: `Test Recipe ${index}`,
    description: `Description for test recipe ${index}`,
    ingredients: [`Ingredient ${index}-1`, `Ingredient ${index}-2`],
    instructions: [`Step 1 for test recipe ${index}`, `Step 2 for test recipe ${index}`],
    servings: 4,
    prepTime: 30,
    cookTime: 45,
    userId: user.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
    sourceUrl: null,
    imageUrl: null
  };
};

// Helper to set up recipe mocks for a test
export const setupRecipeMocks = (recipes: Recipe[]) => {
  // Set up sequential mocks for each recipe
  recipes.forEach(recipe => {
    mockPrisma.recipe.create.mockResolvedValueOnce(recipe);
    console.log(`[Test Helper] Mock set up for recipe: ${recipe.id}`);
  });
};

export const createTestRecipe = async (user: User, index: number): Promise<Recipe> => {
  console.log(`\n[Test Helper] Creating recipe with index ${index}`);
  
  // Set up user mock
  mockPrisma.user.findUnique.mockResolvedValueOnce({
    id: user.id,
    email: user.email,
    googleId: user.googleId,
    displayName: user.displayName,
    photoUrl: user.photoUrl,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt
  });
  
  // Create recipe data
  const recipeData = createRecipeData(user, index);
  
  console.log('[Test Helper] Recipe data created:', {
    id: recipeData.id,
    title: recipeData.title,
    userId: recipeData.userId
  });
  
  // Create the recipe
  const result = await mockPrisma.recipe.create({ data: recipeData });
  
  console.log('[Test Helper] Recipe created:', {
    id: result.id,
    title: result.title,
    userId: result.userId
  });
  
  return result;
};

// Helper to clean up test data
export const cleanupTestData = async () => {
  console.log('[Test Cleanup] Starting data cleanup');
  
  // Delete recipes first
  const recipeResult = await mockPrisma.recipe.deleteMany({ where: {} });
  console.log('[Test Cleanup] Deleted recipes:', recipeResult);
  
  // Then delete users
  const userResult = await mockPrisma.user.deleteMany({ where: {} });
  console.log('[Test Cleanup] Deleted users:', userResult);
  
  // Verify cleanup
  const remainingUsers = await mockPrisma.user.count();
  const remainingRecipes = await mockPrisma.recipe.count();
  console.log('[Test Cleanup] Remaining data:', { users: remainingUsers, recipes: remainingRecipes });
  
  console.log('[Test Cleanup] Cleanup complete');
};

// Helper to create a test session cookie
export const createTestSessionCookie = (userId: string): string[] => {
  const session = {
    passport: { user: userId }
  };
  
  // Create signed cookie with base64 encoding
  const cookieValue = Buffer.from(JSON.stringify(session)).toString('base64');
  return [`session=${cookieValue}; path=/; httponly`];
};

describe('Test Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock responses
    mockPrisma.user.count.mockResolvedValue(0);
    mockPrisma.recipe.count.mockResolvedValue(0);
    // Track mock data
    let mockRecipes = new Set<string>();
    let mockUsers = new Set<string>();

    // Mock recipe create with proper Prisma types
    mockPrisma.recipe.create.mockImplementation((args) => {
      const recipe = {
        ...args.data,
        id: args.data.id as string, // Assert id is string
        user: () => mockDeep<any>({ id: args.data.userId as string }) // Assert userId is string
      };
      mockRecipes.add(recipe.id);
      return mockDeep<any>({
        ...recipe,
        [Symbol.toStringTag]: 'PrismaPromise'
      });
    });

    // Mock user create with proper Prisma types
    mockPrisma.user.create.mockImplementation((args) => {
      const user = {
        ...args.data,
        id: args.data.id as string, // Assert id is string
        recipes: () => mockDeep<any>([])
      };
      mockUsers.add(user.id);
      return mockDeep<any>({
        ...user,
        [Symbol.toStringTag]: 'PrismaPromise'
      });
    });

    // Mock deleteMany with proper Prisma types
    mockPrisma.recipe.deleteMany.mockReturnValue(
      mockDeep<any>({
        [Symbol.toStringTag]: 'PrismaPromise',
        then: (fn: (val: { count: number }) => any) => {
          const count = mockRecipes.size;
          mockRecipes.clear();
          return fn({ count });
        }
      })
    );

    mockPrisma.user.deleteMany.mockReturnValue(
      mockDeep<any>({
        [Symbol.toStringTag]: 'PrismaPromise',
        then: (fn: (val: { count: number }) => any) => {
          const count = mockUsers.size;
          mockUsers.clear();
          return fn({ count });
        }
      })
    );

    // Mock count operations with proper Prisma types
    mockPrisma.recipe.count.mockReturnValue(
      mockDeep<any>({
        [Symbol.toStringTag]: 'PrismaPromise',
        then: (fn: (val: number) => any) => fn(mockRecipes.size)
      })
    );

    mockPrisma.user.count.mockReturnValue(
      mockDeep<any>({
        [Symbol.toStringTag]: 'PrismaPromise',
        then: (fn: (val: number) => any) => fn(mockUsers.size)
      })
    );
    
    mockPrisma.$transaction.mockImplementation((fn: unknown) => {
      if (typeof fn === 'function') {
        return fn(mockPrisma);
      }
      return Promise.resolve([]);
    });
  });

  it('should create a test user with unique data', async () => {
    const user = await createTestUser(1);
    expect(user).toBeDefined();
    expect(user.email).toMatch(/test-.*@example\.com/);
    expect(user.googleId).toMatch(/google-.*/);
    expect(user.displayName).toBeDefined();
    expect(user.photoUrl).toBeDefined();
  });

  it('should create multiple users with unique data', async () => {
    const user1 = await createTestUser(1);
    const user2 = await createTestUser(2);
    expect(user1.email).not.toBe(user2.email);
    expect(user1.googleId).not.toBe(user2.googleId);
  });

  it('should create a test recipe', async () => {
    const user = await createTestUser(1);
    const mockRecipe = {
      id: 'recipe-test-1',
      title: 'Test Recipe 1',
      description: 'Test Description',
      ingredients: ['ingredient 1', 'ingredient 2'],
      instructions: ['step 1', 'step 2'],
      servings: 4,
      prepTime: 30,
      cookTime: 45,
      userId: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
      sourceUrl: null,
      imageUrl: null
    };

    mockPrisma.recipe.create.mockResolvedValueOnce(mockRecipe);
    const recipe = await createTestRecipe(user, 1);
    
    expect(recipe).toBeDefined();
    expect(recipe.title).toBe(mockRecipe.title);
    expect(recipe.userId).toBe(user.id);
    expect(recipe.ingredients).toHaveLength(2);
  });

  it('should create multiple recipes for the same user', async () => {
    const user = await createTestUser(1);
    
    // Create recipe data
    const recipe1Data = createRecipeData(user, 1);
    const recipe2Data = createRecipeData(user, 2);
    
    // Set up mocks for both recipes
    setupRecipeMocks([recipe1Data, recipe2Data]);
    
    // Create recipes
    const recipe1 = await createTestRecipe(user, 1);
    const recipe2 = await createTestRecipe(user, 2);
    
    expect(recipe1).toEqual(recipe1Data);
    expect(recipe2).toEqual(recipe2Data);
    expect(recipe1.title).not.toBe(recipe2.title);
    expect(recipe1.userId).toBe(recipe2.userId);
  });

  it('should clean up test data', async () => {
    // Create test data
    const user = await createTestUser(1);
    const recipe1Data = createRecipeData(user, 1);
    const recipe2Data = createRecipeData(user, 2);
    
    // Set up mocks for recipe creation
    setupRecipeMocks([recipe1Data, recipe2Data]);
    
    // Create test recipes
    await createTestRecipe(user, 1);
    await createTestRecipe(user, 2);

    // Mock successful cleanup operations
    mockPrisma.recipe.deleteMany.mockResolvedValueOnce({ count: 2 });
    mockPrisma.user.deleteMany.mockResolvedValueOnce({ count: 1 });
    mockPrisma.user.count.mockResolvedValueOnce(0);
    mockPrisma.recipe.count.mockResolvedValueOnce(0);

    // Clean up
    await cleanupTestData();

    // Verify cleanup
    const userCount = await mockPrisma.user.count();
    const recipeCount = await mockPrisma.recipe.count();
    expect(userCount).toBe(0);
    expect(recipeCount).toBe(0);

    // Verify deleteMany was called with correct parameters
    expect(mockPrisma.recipe.deleteMany).toHaveBeenCalledWith({ where: {} });
    expect(mockPrisma.user.deleteMany).toHaveBeenCalledWith({ where: {} });
  });

  it('should create valid session cookie', () => {
    const userId = 'test-user-id';
    const cookie = createTestSessionCookie(userId);
    expect(cookie).toHaveLength(1);
    expect(cookie[0]).toMatch(/^session=/);
    expect(cookie[0]).toMatch(/path=\//);
    expect(cookie[0]).toMatch(/httponly/);

    // Verify cookie content
    const cookieValue = cookie[0].split('=')[1].split(';')[0];
    const decodedSession = JSON.parse(Buffer.from(cookieValue, 'base64').toString());
    expect(decodedSession.passport.user).toBe(userId);
  });
});