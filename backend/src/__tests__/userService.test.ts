import { UserService } from '../services/userService';
import { prisma } from '../lib/prisma';

describe('UserService', () => {
  // Clean up database before each test
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  // Clean up and disconnect after all tests
  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  // Helper to generate unique test data
  const createUniqueTestData = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const uniqueId = `${timestamp}-${random}`;
    
    return {
      email: `test-${uniqueId}@example.com`,
      googleId: `google-${uniqueId}`,
      displayName: `Test User ${uniqueId}`,
      photoUrl: `https://via.placeholder.com/150?text=${uniqueId}`
    };
  };

  describe('createUser', () => {
    it('should create a new user', async () => {
      const testData = createUniqueTestData();
      const user = await UserService.createUser(testData);
      
      expect(user).toBeDefined();
      expect(user.email).toBe(testData.email);
      expect(user.googleId).toBe(testData.googleId);
      expect(user.displayName).toBe(testData.displayName);
      expect(user.photoUrl).toBe(testData.photoUrl);
      expect(user.lastLoginAt).toBeDefined();
    });

    it('should not create duplicate users with same email', async () => {
      const testData = createUniqueTestData();
      await UserService.createUser(testData);
      
      await expect(
        UserService.createUser(testData)
      ).rejects.toThrow();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const testData = createUniqueTestData();
      const created = await UserService.createUser(testData);
      
      const found = await UserService.findByEmail(testData.email);
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe(testData.email);
    });

    it('should return null for non-existent email', async () => {
      const found = await UserService.findByEmail('nonexistent@example.com');
      expect(found).toBeNull();
    });
  });

  describe('findByGoogleId', () => {
    it('should find user by Google ID', async () => {
      const testData = createUniqueTestData();
      const created = await UserService.createUser(testData);
      
      const found = await UserService.findByGoogleId(testData.googleId!);
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.googleId).toBe(testData.googleId);
    });

    it('should return null for non-existent Google ID', async () => {
      const found = await UserService.findByGoogleId('nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('findOrCreateGoogleUser', () => {
    it('should create new user if not exists', async () => {
      const testData = createUniqueTestData();
      const user = await UserService.findOrCreateGoogleUser({
        email: testData.email,
        googleId: testData.googleId!,
        displayName: testData.displayName,
        photoUrl: testData.photoUrl
      });
      
      expect(user).toBeDefined();
      expect(user.email).toBe(testData.email);
      expect(user.googleId).toBe(testData.googleId);
      expect(user.displayName).toBe(testData.displayName);
      expect(user.photoUrl).toBe(testData.photoUrl);
    });

    it('should return existing user if email exists', async () => {
      const testData = createUniqueTestData();
      const existing = await UserService.createUser({
        email: testData.email
      });

      const user = await UserService.findOrCreateGoogleUser({
        email: testData.email,
        googleId: testData.googleId!,
        displayName: testData.displayName,
        photoUrl: testData.photoUrl
      });
      
      expect(user.id).toBe(existing.id);
      expect(user.googleId).toBe(testData.googleId);
      expect(user.displayName).toBe(testData.displayName);
      expect(user.photoUrl).toBe(testData.photoUrl);
    });

    it('should update lastLoginAt when finding existing user', async () => {
      const testData = createUniqueTestData();
      const user = await UserService.createUser(testData);
      const oldLoginTime = user.lastLoginAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const updated = await UserService.findOrCreateGoogleUser({
        email: testData.email,
        googleId: testData.googleId!
      });

      expect(updated.lastLoginAt!.getTime()).toBeGreaterThan(oldLoginTime!.getTime());
    });
  });
});