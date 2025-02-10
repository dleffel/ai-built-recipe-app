import request from 'supertest';
import app from '../server';
import { prisma } from '../lib/prisma';
import { UserService } from '../services/userService';

describe('Auth Routes', () => {
  // Store original NODE_ENV
  const originalEnv = process.env.NODE_ENV;

  beforeAll(() => {
    // Set NODE_ENV to development for tests
    process.env.NODE_ENV = 'development';
  });

  afterAll(async () => {
    // Restore original NODE_ENV
    process.env.NODE_ENV = originalEnv;
    // Clean up database
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  // Clean up database before each test
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  describe('GET /auth/current-user', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/auth/current-user')
        .expect(401);

      expect(response.body).toEqual({ error: 'Not authenticated' });
    });
  });

  describe('POST /auth/dev-login', () => {
    it('should return 404 in production mode', async () => {
      // Temporarily set NODE_ENV to production
      process.env.NODE_ENV = 'production';
      
      const response = await request(app)
        .post('/auth/dev-login')
        .expect(404);

      expect(response.body).toEqual({ error: 'Not available in production' });
      
      // Reset NODE_ENV back to development
      process.env.NODE_ENV = 'development';
    });

    it('should login successfully in development mode', async () => {
      const response = await request(app)
        .post('/auth/dev-login')
        .expect(200);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        email: 'dev@example.com',
        displayName: 'Development User',
        photo: 'https://via.placeholder.com/150'
      });
    });
  });

  describe('GET /auth/logout', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/auth/logout')
        .expect(401);

      expect(response.body).toEqual({ error: 'Not authenticated' });
    });
  });
});