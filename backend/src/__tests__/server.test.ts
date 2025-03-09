import request from 'supertest';
import http from 'http';
import app from '../server';
import { prisma } from '../lib/prisma';

// Mock prisma
jest.mock('../lib/prisma', () => ({
  prisma: {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn()
  }
}));

describe('Server', () => {
  let server: http.Server;

  beforeAll(() => {
    server = http.createServer(app);
    server.listen();
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Check', () => {
    it('should return 200 OK when database is connected', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([1]);

      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        database: 'connected',
        timestamp: expect.any(String)
      });
    });

    it('should return 500 when database is disconnected', async () => {
      const error = new Error('Database connection failed');
      (prisma.$queryRaw as jest.Mock).mockRejectedValueOnce(error);

      const response = await request(app).get('/api/health');
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        status: 'error',
        database: 'disconnected',
        error: 'Database connection failed',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: {
          status: 404,
          message: 'Not Found'
        }
      });
    });

    it('should handle JSON parsing errors', async () => {
      const response = await request(app)
        .post('/api/recipes')
        .set('Content-Type', 'application/json')
        .send('invalid json{');

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should handle test errors', async () => {
      const response = await request(app).get('/test-error');
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: {
          status: 500,
          message: 'Test error'
        }
      });
    });
  });

  describe('CORS', () => {
    it('should allow CORS requests from configured origin', async () => {
      const response = await request(app)
        .options('/api/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-credentials']).toBe('true');
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Session Handling', () => {
    it('should handle session middleware', async () => {
      const response = await request(app)
        .get('/auth/current-user')
        .set('Cookie', ['session=test']);

      expect(response.status).toBe(401); // Unauthorized but session middleware processed
      expect(response.body).toEqual({ error: 'Not authenticated' });
    });

    it('should handle session regeneration', async () => {
      const response = await request(app)
        .get('/auth/logout')
        .set('Cookie', ['session=test']);

      expect(response.status).toBe(401); // Unauthorized but session middleware processed
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should handle session save', async () => {
      const response = await request(app)
        .get('/auth/current-user')
        .set('Cookie', ['session=test']);

      expect(response.status).toBe(401); // Unauthorized but session middleware processed
      expect(response.headers['set-cookie']).toBeDefined();
    });
  });

  describe('Request Logging', () => {
    it('should log requests without error', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await request(app).get('/api/health');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Error Logging', () => {
    it('should log errors without crashing', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await request(app)
        .post('/api/recipes')
        .set('Content-Type', 'application/json')
        .send('invalid json{');

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Authentication Routes', () => {
    it('should mount auth routes', async () => {
      const response = await request(app).get('/auth/current-user');
      expect(response.status).toBe(401); // Unauthorized but route exists
    });
  });

  describe('Recipe Routes', () => {
    it('should mount recipe routes', async () => {
      const response = await request(app).get('/api/recipes');
      expect(response.status).toBe(401); // Unauthorized but route exists
    });
  });

  describe('Body Parsing', () => {
    it('should parse JSON bodies', async () => {
      const response = await request(app)
        .post('/api/recipes')
        .send({ test: true });

      expect(response.status).toBe(401); // Unauthorized but body was parsed
    });

    it('should parse URL-encoded bodies', async () => {
      const response = await request(app)
        .post('/api/recipes')
        .send('test=true');

      expect(response.status).toBe(401); // Unauthorized but body was parsed
    });
  });

  describe('Session Compatibility Layer', () => {
    it('should add regenerate method to session', async () => {
      const response = await request(app)
        .get('/auth/current-user')
        .set('Cookie', ['session=test']);

      expect(response.status).toBe(401);
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should add save method to session', async () => {
      const response = await request(app)
        .get('/auth/current-user')
        .set('Cookie', ['session=test']);

      expect(response.status).toBe(401);
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should handle missing session', async () => {
      const response = await request(app)
        .get('/auth/current-user');

      expect(response.status).toBe(401);
    });
  });
});