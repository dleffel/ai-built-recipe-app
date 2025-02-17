import { mockUserService } from './mockServices';
import { jest } from '@jest/globals';
import { User } from '@prisma/client';
import { CreateUserData, UpdateProfileData, GoogleUserData } from './testTypes.test';

describe('mockUserService', () => {
  beforeEach(() => {
    mockUserService.mockClear();
  });

  describe('mock function initialization', () => {
    it('should have all required mock functions', () => {
      expect(mockUserService.findByEmail).toBeDefined();
      expect(mockUserService.findById).toBeDefined();
      expect(mockUserService.findByGoogleId).toBeDefined();
      expect(mockUserService.createUser).toBeDefined();
      expect(mockUserService.updateLastLogin).toBeDefined();
      expect(mockUserService.updateProfile).toBeDefined();
      expect(mockUserService.findOrCreateGoogleUser).toBeDefined();
      expect(mockUserService.resetPrisma).toBeDefined();
    });

    it('should initialize all functions as jest mocks', () => {
      expect(jest.isMockFunction(mockUserService.findByEmail)).toBe(true);
      expect(jest.isMockFunction(mockUserService.findById)).toBe(true);
      expect(jest.isMockFunction(mockUserService.findByGoogleId)).toBe(true);
      expect(jest.isMockFunction(mockUserService.createUser)).toBe(true);
      expect(jest.isMockFunction(mockUserService.updateLastLogin)).toBe(true);
      expect(jest.isMockFunction(mockUserService.updateProfile)).toBe(true);
      expect(jest.isMockFunction(mockUserService.findOrCreateGoogleUser)).toBe(true);
      expect(jest.isMockFunction(mockUserService.resetPrisma)).toBe(true);
    });
  });

  describe('mockClear', () => {
    it('should clear all mock functions', () => {
      // Setup - call each mock function
      mockUserService.findByEmail('test@example.com');
      mockUserService.findById('123');
      mockUserService.findByGoogleId('google123');
      mockUserService.createUser({ email: 'test@example.com' } as CreateUserData);
      mockUserService.updateLastLogin('123');
      mockUserService.updateProfile('123', {} as UpdateProfileData);
      mockUserService.findOrCreateGoogleUser({} as GoogleUserData);
      mockUserService.resetPrisma();

      // Verify calls were made
      expect(mockUserService.findByEmail).toHaveBeenCalled();
      expect(mockUserService.findById).toHaveBeenCalled();
      expect(mockUserService.findByGoogleId).toHaveBeenCalled();
      expect(mockUserService.createUser).toHaveBeenCalled();
      expect(mockUserService.updateLastLogin).toHaveBeenCalled();
      expect(mockUserService.updateProfile).toHaveBeenCalled();
      expect(mockUserService.findOrCreateGoogleUser).toHaveBeenCalled();
      expect(mockUserService.resetPrisma).toHaveBeenCalled();

      // Clear mocks
      mockUserService.mockClear();

      // Verify all mocks were cleared
      expect(mockUserService.findByEmail).not.toHaveBeenCalled();
      expect(mockUserService.findById).not.toHaveBeenCalled();
      expect(mockUserService.findByGoogleId).not.toHaveBeenCalled();
      expect(mockUserService.createUser).not.toHaveBeenCalled();
      expect(mockUserService.updateLastLogin).not.toHaveBeenCalled();
      expect(mockUserService.updateProfile).not.toHaveBeenCalled();
      expect(mockUserService.findOrCreateGoogleUser).not.toHaveBeenCalled();
      expect(mockUserService.resetPrisma).not.toHaveBeenCalled();
    });
  });

  describe('mock function implementations', () => {
    const mockUser: User = {
      id: '123',
      email: 'test@example.com',
      googleId: 'google123',
      displayName: 'Test User',
      photoUrl: 'https://example.com/photo.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date()
    };

    it('should allow findByEmail to return a mock user', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      const result = await mockUserService.findByEmail('test@example.com');
      expect(result).toEqual(mockUser);
      expect(mockUserService.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should allow findById to return a mock user', async () => {
      mockUserService.findById.mockResolvedValue(mockUser);
      const result = await mockUserService.findById('123');
      expect(result).toEqual(mockUser);
      expect(mockUserService.findById).toHaveBeenCalledWith('123');
    });

    it('should allow findByGoogleId to return a mock user', async () => {
      mockUserService.findByGoogleId.mockResolvedValue(mockUser);
      const result = await mockUserService.findByGoogleId('google123');
      expect(result).toEqual(mockUser);
      expect(mockUserService.findByGoogleId).toHaveBeenCalledWith('google123');
    });

    it('should allow createUser to return a mock user', async () => {
      const createUserData: CreateUserData = {
        email: 'test@example.com',
        googleId: 'google123',
        displayName: 'Test User',
        photoUrl: 'https://example.com/photo.jpg'
      };
      mockUserService.createUser.mockResolvedValue(mockUser);
      const result = await mockUserService.createUser(createUserData);
      expect(result).toEqual(mockUser);
      expect(mockUserService.createUser).toHaveBeenCalledWith(createUserData);
    });

    it('should allow updateLastLogin to return a mock user', async () => {
      mockUserService.updateLastLogin.mockResolvedValue(mockUser);
      const result = await mockUserService.updateLastLogin('123');
      expect(result).toEqual(mockUser);
      expect(mockUserService.updateLastLogin).toHaveBeenCalledWith('123');
    });

    it('should allow updateProfile to return a mock user', async () => {
      const updateData: UpdateProfileData = {
        displayName: 'Updated User',
        photoUrl: 'https://example.com/new-photo.jpg'
      };
      mockUserService.updateProfile.mockResolvedValue({
        ...mockUser,
        ...updateData
      });
      const result = await mockUserService.updateProfile('123', updateData);
      expect(result).toEqual({ ...mockUser, ...updateData });
      expect(mockUserService.updateProfile).toHaveBeenCalledWith('123', updateData);
    });

    it('should allow findOrCreateGoogleUser to return a mock user', async () => {
      const googleData: GoogleUserData = {
        email: 'test@example.com',
        googleId: 'google123',
        displayName: 'Test User',
        photoUrl: 'https://example.com/photo.jpg'
      };
      mockUserService.findOrCreateGoogleUser.mockResolvedValue(mockUser);
      const result = await mockUserService.findOrCreateGoogleUser(googleData);
      expect(result).toEqual(mockUser);
      expect(mockUserService.findOrCreateGoogleUser).toHaveBeenCalledWith(googleData);
    });

    it('should allow resetPrisma to be called', () => {
      mockUserService.resetPrisma();
      expect(mockUserService.resetPrisma).toHaveBeenCalled();
    });
  });
});