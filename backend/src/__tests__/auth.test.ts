import express, { Request, Response, NextFunction } from 'express';

// Mock passport before importing anything else
jest.mock('../config/passport', () => ({
  getMockUser: jest.fn().mockReturnValue({
    id: 'dev-123',
    displayName: 'Development User',
    email: 'dev@example.com',
    photo: 'test-photo.jpg',
  }),
  authenticate: jest.fn((strategy: string, options: any) => {
    return (req: Request, res: Response, next: NextFunction) => next();
  }),
  initialize: jest.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
  session: jest.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
}));

const mockAuthenticate = jest.fn((strategy, options) => {
  return (req: Request, res: Response, next: NextFunction) => next();
});

jest.mock('passport', () => ({
  authenticate: mockAuthenticate,
  initialize: jest.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
  session: jest.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
}));

// Import after mocks are set up
import request from 'supertest';
import passport from 'passport';
import { getMockUser } from '../config/passport';
import authRoutes from '../routes/auth';

describe('Auth Routes', () => {
  let app: express.Application;
  const mockUser = {
    id: 'test-123',
    displayName: 'Test User',
    email: 'test@example.com',
    photo: 'test-photo.jpg',
  };

  beforeEach(() => {
    // Reset environment and mocks
    process.env.NODE_ENV = 'development';
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    
    // Mock session middleware
    app.use((req: any, res: any, next: any) => {
      req.session = {};
      next();
    });

    // Mock passport middleware
    app.use((req: any, res: any, next: any) => {
      req.login = jest.fn((user: any, done: (err: any) => void) => {
        req.user = user;
        done(null);
      });
      req.logout = jest.fn((done: (err: any) => void) => {
        req.user = null;
        done(null);
      });
      next();
    });

    app.use(passport.initialize());
    app.use(passport.session());
    app.use('/auth', authRoutes);
  });

  describe('POST /auth/dev-login', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should login with mock user in development mode', async () => {
      const mockUser = getMockUser();
      
      const response = await request(app)
        .post('/auth/dev-login')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(mockUser);
    });

    it('should not be available in production', async () => {
      process.env.NODE_ENV = 'production';
      
      const response = await request(app)
        .post('/auth/dev-login')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toEqual({ error: 'Not available in production' });
    });

    it('should handle missing mock user', async () => {
      (getMockUser as jest.Mock).mockReturnValueOnce(null);

      const response = await request(app)
        .post('/auth/dev-login')
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({ error: 'Mock user not found' });
    });

    it('should handle login errors', async () => {
      app = express();
      app.use(express.json());
      app.use((req: any, res: any, next: any) => {
        req.login = (user: any, done: (err: any) => void) => {
          done(new Error('Login failed'));
        };
        next();
      });
      app.use('/auth', authRoutes);

      const response = await request(app)
        .post('/auth/dev-login')
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to login' });
    });
  });

  describe('GET /auth/current-user', () => {
    it('should return user when authenticated', async () => {
      const app = express();
      app.use(express.json());
      app.use((req: any, res: any, next: any) => {
        req.user = mockUser;
        next();
      });
      app.use('/auth', authRoutes);

      const response = await request(app)
        .get('/auth/current-user')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(mockUser);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/auth/current-user')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toEqual({ error: 'Not authenticated' });
    });
  });

  describe('GET /auth/logout', () => {
    it('should logout user and return success message', async () => {
      const app = express();
      app.use(express.json());
      app.use((req: any, res: any, next: any) => {
        req.user = mockUser;
        req.logout = (done: (err: any) => void) => {
          req.user = null;
          done(null);
        };
        next();
      });
      app.use('/auth', authRoutes);

      const response = await request(app)
        .get('/auth/logout')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({ message: 'Logged out successfully' });
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/auth/logout')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toEqual({ error: 'Not authenticated' });
    });

    it('should handle logout errors', async () => {
      const app = express();
      app.use(express.json());
      app.use((req: any, res: any, next: any) => {
        req.user = mockUser;
        req.logout = (done: (err: any) => void) => {
          done(new Error('Logout failed'));
        };
        next();
      });
      app.use('/auth', authRoutes);

      const response = await request(app)
        .get('/auth/logout')
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to logout' });
    });
  });
});