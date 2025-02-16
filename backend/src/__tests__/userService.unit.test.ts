import { User } from '@prisma/client';
import { UserService } from '../services/userService';
import { mockPrisma, resetMockPrisma } from './helpers/mockPrisma';
import { TestUserData } from './helpers/testTypes.test';

describe('UserService Unit Tests', () => {
  beforeEach(() => {
    resetMockPrisma();
    UserService.prisma = mockPrisma;
  });

  afterEach(() => {
    UserService.resetPrisma();
  });

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    googleId: 'test-google-id',
    displayName: 'Test User',
    photoUrl: 'https://example.com/photo.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date()
  };

  describe('createUser', () => {
    it('should create a new user', async () => {
      const testData: TestUserData = {
        email: 'test@example.com',
        googleId: 'test-google-id',
        displayName: 'Test User',
        photoUrl: 'https://example.com/photo.jpg'
      };

      mockPrisma.user.create.mockResolvedValue({
        ...mockUser,
        ...testData
      });

      const result = await UserService.createUser(testData);

      expect(result).toMatchObject(testData);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          ...testData,
          lastLoginAt: expect.any(Date)
        }
      });
    });

    it('should handle unique constraint violations', async () => {
      const testData: TestUserData = {
        email: 'test@example.com',
        googleId: 'test-google-id',
        displayName: 'Test User'
      };

      mockPrisma.user.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['email'] }
      });

      await expect(UserService.createUser(testData))
        .rejects
        .toMatchObject({
          code: 'P2002',
          meta: { target: ['email'] }
        });
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await UserService.findByEmail(mockUser.email);

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockUser.email }
      });
    });

    it('should return null for non-existent email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await UserService.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await UserService.findById(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id }
      });
    });

    it('should return null for non-existent ID', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await UserService.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByGoogleId', () => {
    it('should find user by Google ID', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await UserService.findByGoogleId(mockUser.googleId!);

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { googleId: mockUser.googleId }
      });
    });

    it('should return null for non-existent Google ID', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await UserService.findByGoogleId('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateLastLogin', () => {
    it('should update user last login time', async () => {
      const updatedUser = {
        ...mockUser,
        lastLoginAt: new Date()
      };

      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await UserService.updateLastLogin(mockUser.id);

      expect(result).toEqual(updatedUser);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) }
      });
    });
  });

  describe('updateProfile', () => {
    it('should update user profile information', async () => {
      const updateData = {
        displayName: 'Updated Name',
        photoUrl: 'https://example.com/new-photo.jpg'
      };

      const updatedUser = {
        ...mockUser,
        ...updateData,
        updatedAt: new Date()
      };

      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await UserService.updateProfile(mockUser.id, updateData);

      expect(result).toEqual(updatedUser);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          ...updateData,
          updatedAt: expect.any(Date)
        }
      });
    });
  });

  describe('findOrCreateGoogleUser', () => {
    const googleProfile = {
      email: 'test@example.com',
      googleId: 'test-google-id',
      displayName: 'Test User',
      photoUrl: 'https://example.com/photo.jpg'
    };

    it('should update existing user found by Google ID', async () => {
      // Mock finding existing user by Google ID
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Mock the update operation
      const updatedUser = {
        ...mockUser,
        displayName: googleProfile.displayName,
        photoUrl: googleProfile.photoUrl,
        lastLoginAt: expect.any(Date),
        updatedAt: expect.any(Date)
      };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await UserService.findOrCreateGoogleUser(googleProfile);

      expect(result).toEqual(updatedUser);
      // Verify findUnique was called with Google ID
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { googleId: googleProfile.googleId }
      });
      // Verify update was called with profile data
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          displayName: googleProfile.displayName,
          photoUrl: googleProfile.photoUrl,
          updatedAt: expect.any(Date)
        }
      });
    });

    it('should update profile and last login for existing user found by Google ID', async () => {
      // Create user with same profile data
      const existingUser = {
        ...mockUser,
        displayName: googleProfile.displayName,
        photoUrl: googleProfile.photoUrl
      };
      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      // Mock the update operation
      const updatedUser = {
        ...existingUser,
        displayName: googleProfile.displayName,
        photoUrl: googleProfile.photoUrl,
        updatedAt: expect.any(Date)
      };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await UserService.findOrCreateGoogleUser(googleProfile);

      expect(result).toEqual(updatedUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { googleId: googleProfile.googleId }
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: existingUser.id },
        data: {
          displayName: googleProfile.displayName,
          photoUrl: googleProfile.photoUrl,
          updatedAt: expect.any(Date)
        }
      });
    });

    it('should update existing user found by email', async () => {
      // First findUnique (by googleId) returns null
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      
      // Second findUnique (by email) returns existing user
      const existingUser = { ...mockUser, googleId: null };
      mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);

      // Update returns updated user
      const updatedUser = { ...mockUser, ...googleProfile };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await UserService.findOrCreateGoogleUser(googleProfile);

      expect(result).toEqual(updatedUser);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: existingUser.id },
        data: {
          googleId: googleProfile.googleId,
          displayName: googleProfile.displayName,
          photoUrl: googleProfile.photoUrl,
          lastLoginAt: expect.any(Date)
        }
      });
    });

    it('should create new user if none exists', async () => {
      // Both findUnique calls return null
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Create returns new user
      const newUser = { ...mockUser, ...googleProfile };
      mockPrisma.user.create.mockResolvedValue(newUser);

      const result = await UserService.findOrCreateGoogleUser(googleProfile);

      expect(result).toEqual(newUser);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          ...googleProfile,
          lastLoginAt: expect.any(Date)
        }
      });
    });
  });
});