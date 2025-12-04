import { Request, Response } from 'express';
import { getMockUser } from '../config/passport';
import { UserService } from '../services/userService';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import passport from 'passport';
import authRouter from '../routes/auth';

// Mock passport
jest.mock('passport', () => {
  const mockAuthenticateMiddleware = (req: Request, res: Response, next: Function) => next();
  const mockAuthenticate = jest.fn(() => mockAuthenticateMiddleware);
  return {
    authenticate: mockAuthenticate,
    initialize: jest.fn(),
    session: jest.fn(),
    use: jest.fn()
  };
});

// Mock passport config
jest.mock('../config/passport', () => ({
  getMockUser: jest.fn(),
  __esModule: true,
  default: jest.requireActual('passport')
}));

// Extend Express Request to include our User type
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      displayName: string | null;
      photoUrl: string | null;
      googleId: string | null;
      createdAt: Date;
      updatedAt: Date;
      lastLoginAt: Date | null;
    }
  }
}

// Get the route handlers directly
const routes = (authRouter as any).stack
  .filter((layer: any) => layer.route)
  .reduce((acc: any, layer: any) => {
    const path = layer.route.path;
    const method = Object.keys(layer.route.methods)[0];
    acc[`${method}${path}`] = layer.route.stack[0].handle;
    return acc;
  }, {});

const devLoginHandler = routes['post/dev-login'];
const getCurrentUserHandler = routes['get/current-user'];
const logoutHandler = routes['get/logout'];

// Get the router instance for testing
const router = authRouter as any;

// Mock dependencies
jest.mock('../services/userService', () => ({
  UserService: {
    findOrCreateGoogleUser: jest.fn(),
    findById: jest.fn(),
    updateLastLogin: jest.fn()
  }
}));

describe('Auth Routes', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let nextMock: jest.Mock;

  beforeEach(() => {
    req = {
      login: jest.fn().mockImplementation((user: Express.User, done: (err: any) => void) => done(null)),
      logout: jest.fn().mockImplementation((done: (err: any) => void) => done(null)),
      user: undefined
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      redirect: jest.fn()
    };
    nextMock = jest.fn();
    jest.clearAllMocks();
  });

  describe('User Response Formatting', () => {
    const mockDbUser = {
      id: 'test-id',
      email: 'test@example.com'
    };

    beforeEach(() => {
      (UserService.findById as jest.Mock).mockResolvedValue(mockDbUser);
    });

    it('should format user response with default displayName from email', async () => {
      const mockUserWithoutDisplayName = {
        id: 'test-id',
        email: 'john.doe@example.com',
        displayName: null,
        photoUrl: 'https://test-photo.jpg',
        googleId: 'mock-google-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null
      };

      (getMockUser as jest.Mock).mockReturnValue(mockUserWithoutDisplayName);
      (UserService.findOrCreateGoogleUser as jest.Mock).mockResolvedValue({
        id: 'test-id',
        email: 'john.doe@example.com'
      });

      await devLoginHandler(req as Request, res as Response, nextMock);
      
      expect(req.login).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-id',
          email: 'john.doe@example.com',
          displayName: 'john.doe',
          photoUrl: 'https://test-photo.jpg'
        }),
        expect.any(Function)
      );
    });

    it('should format user response with default photo URL', async () => {
      const mockUserWithoutPhoto = {
        id: 'test-id',
        email: 'test@example.com',
        displayName: 'Test User',
        photoUrl: null,
        googleId: 'mock-google-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null
      };

      (getMockUser as jest.Mock).mockReturnValue(mockUserWithoutPhoto);
      (UserService.findOrCreateGoogleUser as jest.Mock).mockResolvedValue({
        id: 'test-id',
        email: 'test@example.com'
      });

      await devLoginHandler(req as Request, res as Response, nextMock);
      
      expect(req.login).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-id',
          email: 'test@example.com',
          displayName: 'Test User',
          photoUrl: 'https://via.placeholder.com/150'
        }),
        expect.any(Function)
      );
    });

    it('should format user response with all default values', async () => {
      const mockUserWithoutBoth = {
        id: 'test-id',
        email: 'jane.smith@example.com',
        displayName: null,
        photoUrl: null,
        googleId: 'mock-google-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null
      };

      (getMockUser as jest.Mock).mockReturnValue(mockUserWithoutBoth);
      (UserService.findOrCreateGoogleUser as jest.Mock).mockResolvedValue({
        id: 'test-id',
        email: 'jane.smith@example.com'
      });

      await devLoginHandler(req as Request, res as Response, nextMock);
      
      expect(req.login).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-id',
          email: 'jane.smith@example.com',
          displayName: 'jane.smith',
          photoUrl: 'https://via.placeholder.com/150'
        }),
        expect.any(Function)
      );
    });

    it('should format user response with complete session data', async () => {
      // Set up a user with complete data
      req.user = {
        id: 'test-id',
        email: 'test@example.com',
        displayName: 'Test User',
        photoUrl: 'https://test-photo.jpg',
        googleId: 'test-google-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date()
      };

      await getCurrentUserHandler(req as Request, res as Response, nextMock);
      
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        id: 'test-id',
        email: 'test@example.com',
        displayName: 'Test User',
        photoUrl: 'https://test-photo.jpg'
      }));
    });

    it('should handle dev login response formatting', async () => {
      const mockUser = {
        id: 'test-id',
        email: 'test@example.com',
        displayName: 'Test User',
        photoUrl: 'https://test-photo.jpg',
        googleId: 'mock-google-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date()
      };

      (getMockUser as jest.Mock).mockReturnValue(mockUser);
      (UserService.findOrCreateGoogleUser as jest.Mock).mockResolvedValue(mockDbUser);

      await devLoginHandler(req as Request, res as Response, nextMock);
      
      // Response includes devAuthToken for iOS third-party cookie workaround
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        id: 'test-id',
        email: 'test@example.com',
        displayName: 'Test User',
        photoUrl: 'https://test-photo.jpg',
        devAuthToken: expect.any(String)
      }));
    });
  });

  describe('devLogin', () => {
    const mockUser: Express.User = {
      id: 'test-id',
      email: 'test@example.com',
      displayName: 'Test User',
      photoUrl: 'test-photo.jpg',
      googleId: 'mock-google-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date()
    };

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      (getMockUser as jest.Mock).mockReturnValue(mockUser);
    });

    it('should return 404 in production environment', async () => {
      process.env.NODE_ENV = 'production';
      await devLoginHandler(req as Request, res as Response, nextMock);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not available in production' });
    });

    it('should handle missing mock user', async () => {
      (getMockUser as jest.Mock).mockReturnValue(null);
      await devLoginHandler(req as Request, res as Response, nextMock);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Mock user not found' });
    });

    it('should handle undefined NODE_ENV', async () => {
      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;
      
      (getMockUser as jest.Mock).mockReturnValue(mockUser);
      (UserService.findOrCreateGoogleUser as jest.Mock).mockResolvedValue(mockUser);
      
      await devLoginHandler(req as Request, res as Response, nextMock);
      
      expect(res.status).not.toHaveBeenCalled();
      expect(req.login).toHaveBeenCalledWith(mockUser, expect.any(Function));
      // Response includes devAuthToken for iOS third-party cookie workaround
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ...mockUser,
        devAuthToken: expect.any(String)
      }));
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle login error', async () => {
      const loginError = new Error('Login failed');
      req.login = jest.fn().mockImplementation((user: Express.User, done: (err: any) => void) => done(loginError));
      (UserService.findOrCreateGoogleUser as jest.Mock).mockResolvedValue(mockUser);

      await devLoginHandler(req as Request, res as Response, nextMock);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to login' });
    });

    it('should handle Prisma database error', async () => {
      const prismaError = new PrismaClientKnownRequestError('Database error', {
        code: 'P2002',
        clientVersion: '2.0.0'
      });
      (UserService.findOrCreateGoogleUser as jest.Mock).mockRejectedValue(prismaError);

      await devLoginHandler(req as Request, res as Response, nextMock);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Database error: Database error' });
    });

    it('should handle generic database error', async () => {
      const genericError = new Error('Generic error');
      (UserService.findOrCreateGoogleUser as jest.Mock).mockRejectedValue(genericError);

      await devLoginHandler(req as Request, res as Response, nextMock);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Database error during login' });
    });

    it('should successfully login a user in development mode', async () => {
      (UserService.findOrCreateGoogleUser as jest.Mock).mockResolvedValue(mockUser);

      await devLoginHandler(req as Request, res as Response, nextMock);
      expect(UserService.findOrCreateGoogleUser).toHaveBeenCalledWith({
        email: mockUser.email,
        googleId: 'mock-google-id'
      });
      expect(req.login).toHaveBeenCalledWith(mockUser, expect.any(Function));
      // Response includes devAuthToken for iOS third-party cookie workaround
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ...mockUser,
        devAuthToken: expect.any(String)
      }));
    });

    it('should handle missing email in mock user', async () => {
      const userWithoutEmail = { ...mockUser, email: undefined };
      (getMockUser as jest.Mock).mockReturnValue(userWithoutEmail);
      (UserService.findOrCreateGoogleUser as jest.Mock).mockRejectedValue(new Error('Missing email'));

      await devLoginHandler(req as Request, res as Response, nextMock);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Database error during login' });
    });

    it('should handle missing googleId in mock user', async () => {
      const userWithoutGoogleId = { ...mockUser, googleId: undefined };
      (getMockUser as jest.Mock).mockReturnValue(userWithoutGoogleId);
      (UserService.findOrCreateGoogleUser as jest.Mock).mockRejectedValue(new Error('Missing googleId'));

      await devLoginHandler(req as Request, res as Response, nextMock);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Database error during login' });
    });
  });


  describe('getCurrentUser', () => {
    const mockUser: Express.User = {
      id: 'test-id',
      email: 'test@example.com',
      displayName: 'Test User',
      photoUrl: 'test-photo.jpg',
      googleId: 'mock-google-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date()
    };

    it('should handle database error when fetching user', async () => {
      req.user = mockUser;
      const dbError = new Error('Database error');
      (UserService.findById as jest.Mock).mockRejectedValue(dbError);

      await getCurrentUserHandler(req as Request, res as Response, nextMock);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Database error' });
    });

    it('should handle user not found in database', async () => {
      req.user = mockUser;
      (UserService.findById as jest.Mock).mockResolvedValue(null);

      await getCurrentUserHandler(req as Request, res as Response, nextMock);
      expect(req.logout).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found in database' });
    });

    it('should handle logout error when user not found', async () => {
      req.user = mockUser;
      const logoutError = new Error('Logout failed');
      req.logout = jest.fn().mockImplementation((done: (err: any) => void) => done(logoutError));
      (UserService.findById as jest.Mock).mockResolvedValue(null);

      await getCurrentUserHandler(req as Request, res as Response, nextMock);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found in database' });
    });

    it('should successfully return current user', async () => {
      req.user = mockUser;
      (UserService.findById as jest.Mock).mockResolvedValue(mockUser);

      await getCurrentUserHandler(req as Request, res as Response, nextMock);
      expect(UserService.findById).toHaveBeenCalledWith(mockUser.id);
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });

    it('should handle no user in session', async () => {
      req.user = undefined;

      await getCurrentUserHandler(req as Request, res as Response, nextMock);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
    });
  });

  describe('logout', () => {
    const mockUser: Express.User = {
      id: 'test-id',
      email: 'test@example.com',
      displayName: 'Test User',
      photoUrl: 'test-photo.jpg',
      googleId: 'mock-google-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date()
    };

    it('should handle logout error', async () => {
      req.user = mockUser;
      const logoutError = new Error('Logout failed');
      req.logout = jest.fn().mockImplementation((done: (err: any) => void) => done(logoutError));

      await logoutHandler(req as Request, res as Response, nextMock);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to logout' });
    });

    it('should successfully logout user', async () => {
      req.user = mockUser;

      await logoutHandler(req as Request, res as Response, nextMock);
      expect(req.logout).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });

    it('should return 401 when trying to logout without being logged in', async () => {
      req.user = undefined;

      await logoutHandler(req as Request, res as Response, nextMock);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
    });
  });
});