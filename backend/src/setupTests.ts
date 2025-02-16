import { PrismaClient, User, Recipe, Prisma } from '@prisma/client';
import { prisma } from './lib/prisma';

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Test transaction utility to ensure test isolation
 */
export async function withTestTransaction<T>(
  callback: (tx: TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    return callback(tx);
  });
}

/**
 * Test data factory for creating test entities
 */
export class TestDataFactory {
  static createUniqueTestData() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const uniqueId = `${timestamp}-${random}`;
    
    return {
      email: `test-${uniqueId}@example.com`,
      googleId: `google-${uniqueId}`,
      displayName: `Test User ${uniqueId}`,
      photoUrl: `https://via.placeholder.com/150?text=${uniqueId}`
    };
  }

  static async createUser(tx: TransactionClient, data?: Partial<User>): Promise<User> {
    const testData = this.createUniqueTestData();
    return tx.user.create({
      data: {
        ...testData,
        ...data,
        lastLoginAt: new Date()
      }
    });
  }

  static async createRecipe(
    tx: TransactionClient,
    userId: string,
    data?: Partial<Omit<Recipe, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<Recipe> {
    const testData = {
      title: `Test Recipe ${Date.now()}`,
      instructions: 'Test instructions',
      ingredients: ['ingredient 1', 'ingredient 2'],
      ...data
    };

    return tx.recipe.create({
      data: {
        ...testData,
        userId
      }
    });
  }
}

// Clean up database and disconnect after all tests
afterAll(async () => {
  await prisma.$disconnect();
});