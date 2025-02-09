import request from 'supertest';
import { Express } from 'express';
import { User } from '../config/passport';

// Create mock passport object
const mockPassport = {
  currentUser: null as User | null,
  initialize: () => (req: any, res: any, next: any) => {
    req.user = mockPassport.currentUser;
    req.login = (user: User, done: (err: any) => void) => {
      mockPassport.currentUser = user;
      req.user = user;
      process.nextTick(() => done(null));
    };
    req.logout = (done: (err: any) => void) => {
      mockPassport.currentUser = null;
      req.user = null;
      process.nextTick(() => done(null));
    };
    next();
  },
  session: () => (req: any, res: any, next: any) => {
    req.user = mockPassport.currentUser;
    next();
  },
  authenticate: () => (req: any, res: any, next: any) => next(),
  serializeUser: (user: User, done: (err: any, id?: string) => void) => {
    done(null, user.id);
  },
  deserializeUser: (id: string, done: (err: any, user?: User | false) => void) => {
    if (mockPassport.currentUser && mockPassport.currentUser.id === id) {
      done(null, mockPassport.currentUser);
    } else {
      done(null, false);
    }
  }
};

// Use doMock instead of jest.mock to avoid hoisting
jest.doMock('../config/passport', () => ({
  __esModule: true,
  default: mockPassport,
  getMockUser: jest.fn()
}));

// Import app after mocking
const app = require('../server').default;

describe('Auth Routes', () => {
  let agent: ReturnType<typeof request.agent>;

  beforeEach(() => {
    agent = request.agent(app);
    jest.clearAllMocks();
    process.env.NODE_ENV = 'development';
    mockPassport.currentUser = null;
  });

  afterEach(() => {
    process.env.NODE_ENV = 'test';
    mockPassport.currentUser = null;
  });

  describe('GET /auth/current-user', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await request(app).get('/auth/current-user');
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('POST /auth/dev-login', () => {
    it('returns 404 in production', async () => {
      process.env.NODE_ENV = 'production';
      const response = await request(app).post('/auth/dev-login');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not available in production');
    });

    it('handles missing mock user', async () => {
      // Mock getMockUser to return null
      const { getMockUser } = require('../config/passport');
      (getMockUser as jest.Mock).mockReturnValue(null);

      const response = await request(app)
        .post('/auth/dev-login');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Mock user not found');
    });

    it('maintains session after successful dev login', async () => {
      const mockUser = {
        id: 'dev-123',
        displayName: 'Development User',
        email: 'dev@example.com',
        photo: 'test-photo.jpg'
      };

      // Mock getMockUser to return our test user
      const { getMockUser } = require('../config/passport');
      (getMockUser as jest.Mock).mockReturnValue(mockUser);

      // Use agent to maintain session cookies
      const loginResponse = await agent
        .post('/auth/dev-login');

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toEqual(mockUser);

      // Verify session persists
      const checkResponse = await agent.get('/auth/current-user');
      expect(checkResponse.status).toBe(200);
      expect(checkResponse.body).toEqual(mockUser);
    });
  });

  describe('GET /auth/logout', () => {
    it('handles unauthorized logout', async () => {
      // Ensure no user is logged in
      mockPassport.currentUser = null;

      const response = await request(app).get('/auth/logout');
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Not authenticated');
    });

    it('successfully logs out', async () => {
      const mockUser = {
        id: 'dev-123',
        displayName: 'Development User',
        email: 'dev@example.com',
        photo: 'test-photo.jpg'
      };

      // Mock getMockUser to return our test user
      const { getMockUser } = require('../config/passport');
      (getMockUser as jest.Mock).mockReturnValue(mockUser);

      // First login
      await agent
        .post('/auth/dev-login');

      // Then logout
      const logoutResponse = await agent.get('/auth/logout');
      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.message).toBe('Logged out successfully');

      // Verify session is cleared
      const checkResponse = await agent.get('/auth/current-user');
      expect(checkResponse.status).toBe(401);
      expect(checkResponse.body.error).toBe('Not authenticated');
    });
  });
});