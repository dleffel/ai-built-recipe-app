import { Recipe, User } from '@prisma/client';
import { jest } from '@jest/globals';
import {
  CreateRecipeData,
  UpdateProfileData,
  CreateUserData,
  GoogleUserData,
  FindByUserOptions
} from './testTypes.test';

// Mock UserService
export const mockUserService = {
  findByEmail: jest.fn() as jest.MockedFunction<(email: string) => Promise<User | null>>,
  findById: jest.fn() as jest.MockedFunction<(id: string) => Promise<User | null>>,
  findByGoogleId: jest.fn() as jest.MockedFunction<(googleId: string) => Promise<User | null>>,
  createUser: jest.fn() as jest.MockedFunction<(data: CreateUserData) => Promise<User>>,
  updateLastLogin: jest.fn() as jest.MockedFunction<(id: string) => Promise<User>>,
  updateProfile: jest.fn() as jest.MockedFunction<(id: string, data: UpdateProfileData) => Promise<User>>,
  findOrCreateGoogleUser: jest.fn() as jest.MockedFunction<(profile: GoogleUserData) => Promise<User>>,
  resetPrisma: jest.fn() as jest.MockedFunction<() => void>,

  // Helper to reset all mocks
  mockClear() {
    this.findByEmail.mockClear();
    this.findById.mockClear();
    this.findByGoogleId.mockClear();
    this.createUser.mockClear();
    this.updateLastLogin.mockClear();
    this.updateProfile.mockClear();
    this.findOrCreateGoogleUser.mockClear();
    this.resetPrisma.mockClear();
  }
};