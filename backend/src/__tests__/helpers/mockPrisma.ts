import { PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

// Create a mock PrismaClient that can be used in tests
export const mockPrisma: DeepMockProxy<PrismaClient> = mockDeep<PrismaClient>();

// Helper to reset all mocks between tests
export const resetMockPrisma = () => {
  jest.clearAllMocks();
  // Reset specific mock implementations if needed
  mockPrisma.recipe.create.mockReset();
  mockPrisma.recipe.findFirst.mockReset();
  mockPrisma.recipe.findMany.mockReset();
  mockPrisma.recipe.update.mockReset();
  mockPrisma.recipe.count.mockReset();
  mockPrisma.user.create.mockReset();
  mockPrisma.user.findUnique.mockReset();
  mockPrisma.user.update.mockReset();
};

// Helper to set up common mock responses
export const setupMockPrisma = {
  // Recipe mocks
  mockRecipeCreate: (returnValue: any) => {
    mockPrisma.recipe.create.mockResolvedValue(returnValue);
  },
  mockRecipeFind: (returnValue: any) => {
    mockPrisma.recipe.findFirst.mockResolvedValue(returnValue);
  },
  mockRecipeFindMany: (returnValue: any) => {
    mockPrisma.recipe.findMany.mockResolvedValue(returnValue);
  },

  // User mocks
  mockUserCreate: (returnValue: any) => {
    mockPrisma.user.create.mockResolvedValue(returnValue);
  },
  mockUserFind: (returnValue: any) => {
    mockPrisma.user.findUnique.mockResolvedValue(returnValue);
  }
};