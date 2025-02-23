import { PrismaClient, User, Recipe } from '@prisma/client';
import { RecipeService } from '../../services/recipeService';
import { UserService } from '../../services/userService';

const prisma = new PrismaClient();

// Helper to create a unique test user
export const createTestUser = async (index: number): Promise<User> => {
  const timestamp = Date.now();
  const uniqueId = `${timestamp}-${index}-${Math.random().toString(36).substring(2, 7)}`;
  
  // Create user with transaction to ensure atomicity
  return await prisma.$transaction(async (tx) => {
    return await tx.user.create({
      data: {
        email: `test-${uniqueId}@example.com`,
        googleId: `google-${uniqueId}`,
        displayName: `Test User ${uniqueId}`,
        photoUrl: `https://via.placeholder.com/150?text=${uniqueId}`
      }
    });
  });
};

// Helper to create a test recipe
export const createTestRecipe = async (user: User, index: number): Promise<Recipe> => {
  const uniqueId = `${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`;
  
  // Create recipe with transaction to ensure atomicity and foreign key constraints
  return await prisma.$transaction(async (tx) => {
    // Verify user exists
    const existingUser = await tx.user.findUnique({ where: { id: user.id } });
    if (!existingUser) {
      throw new Error('User not found');
    }

    return await tx.recipe.create({
      data: {
        title: `Test Recipe ${uniqueId}`,
        description: `Description for test recipe ${uniqueId}`,
        ingredients: [`Ingredient ${uniqueId}-1`, `Ingredient ${uniqueId}-2`],
        instructions: [`Step 1 for test recipe ${uniqueId}`, `Step 2 for test recipe ${uniqueId}`],
        servings: 4,
        prepTime: 30,
        cookTime: 45,
        userId: user.id
      }
    });
  });
};

// Helper to clean up test data
export const cleanupTestData = async () => {
try {
  // Delete all recipes first
  await prisma.recipe.deleteMany({
    where: {} // Clear where clause to delete all
  });
  
  // Then delete all users after recipes are gone
  await prisma.user.deleteMany({
    where: {} // Clear where clause to delete all
  });
} catch (error) {
  console.error('Error cleaning up test data:', error);
  throw error;
}
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
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
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
    const recipe = await createTestRecipe(user, 1);
    expect(recipe).toBeDefined();
    expect(recipe.title).toMatch(/Test Recipe/);
    expect(recipe.userId).toBe(user.id);
    expect(recipe.ingredients).toHaveLength(2);
  });

  it('should create multiple recipes for the same user', async () => {
    const user = await createTestUser(1);
    const recipe1 = await createTestRecipe(user, 1);
    const recipe2 = await createTestRecipe(user, 2);
    expect(recipe1.id).not.toBe(recipe2.id);
    expect(recipe1.title).not.toBe(recipe2.title);
    expect(recipe1.userId).toBe(recipe2.userId);
  });

  it('should clean up test data', async () => {
    // Create test data
    const user = await createTestUser(1);
    await createTestRecipe(user, 1);
    await createTestRecipe(user, 2);

    // Clean up
    await cleanupTestData();

    // Verify cleanup
    const userCount = await prisma.user.count();
    const recipeCount = await prisma.recipe.count();
    expect(userCount).toBe(0);
    expect(recipeCount).toBe(0);
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