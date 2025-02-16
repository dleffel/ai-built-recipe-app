import { User, Recipe } from '@prisma/client';

// Test data types
export interface CreateUserData {
  email: string;
  googleId?: string;
  displayName?: string;
  photoUrl?: string;
}

export interface UpdateProfileData {
  displayName?: string;
  photoUrl?: string;
}

export interface GoogleUserData {
  email: string;
  googleId: string;
  displayName?: string;
  photoUrl?: string;
}

export interface TestUserData {
  email: string;
  googleId: string;
  displayName: string;
  photoUrl?: string;
}

// Recipe-related types
export interface CreateRecipeData {
  title: string;
  description?: string;
  ingredients: string[];
  instructions: string;
  servings?: number;
  prepTime?: number;
  cookTime?: number;
  imageUrl?: string;
}

export interface UpdateRecipeData {
  title?: string;
  description?: string;
  ingredients?: string[];
  instructions?: string;
  servings?: number;
  prepTime?: number;
  cookTime?: number;
  imageUrl?: string;
}

export interface FindByUserOptions {
  skip?: number;
  take?: number;
  includeDeleted?: boolean;
}

// Test utility types
export type MockUser = Omit<User, 'createdAt' | 'updatedAt' | 'lastLoginAt'>;
export type MockRecipe = Omit<Recipe, 'createdAt' | 'updatedAt'>;

// Add test cases to ensure types are working correctly
describe('Test Types', () => {
  it('should compile with correct types', () => {
    const testUser: TestUserData = {
      email: 'test@example.com',
      googleId: 'test-google-id',
      displayName: 'Test User',
      photoUrl: 'test-photo.jpg'
    };

    const testRecipe: CreateRecipeData = {
      title: 'Test Recipe',
      description: 'Test Description',
      ingredients: ['ingredient 1', 'ingredient 2'],
      instructions: 'Test Instructions',
      servings: 4,
      prepTime: 30,
      cookTime: 45,
      imageUrl: 'test-image.jpg'
    };

    const updateRecipe: UpdateRecipeData = {
      title: 'Updated Title',
      ingredients: ['new ingredient']
    };

    // TypeScript will catch any type errors at compile time
    expect(testUser.email).toBeDefined();
    expect(testRecipe.title).toBeDefined();
    expect(updateRecipe.title).toBeDefined();
  });
});