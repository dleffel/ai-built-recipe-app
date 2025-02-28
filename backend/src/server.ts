import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieSession from 'cookie-session';
import passport from './config/passport';
import authRoutes from './routes/auth';
import recipeRoutes from './routes/recipes';
import serverConfig from './config/server-config';
import { prisma } from './lib/prisma';

const app = express();

// Enable CORS with credentials
app.use(cors({
  origin: serverConfig.clientUrl,
  credentials: true,
}));

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log cookie configuration
const cookieConfig = {
  name: 'session',
  keys: [serverConfig.sessionSecret],
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
  domain: process.env.NODE_ENV === 'production' ? '.recipes.dannyleffel.com' : undefined,
  path: '/'
};

console.log('Cookie session configuration:', {
  ...cookieConfig,
  keys: '[REDACTED]' // Don't log the secret key
});

// Session middleware
app.use(cookieSession(cookieConfig));

// Log all response headers for /auth routes
app.use('/auth', (req, res, next) => {
  const originalSend = res.send;
  res.send = function(...args) {
    console.log('Response headers for', req.path, ':', res.getHeaders());
    return originalSend.apply(res, args);
  };
  next();
});

// Add regenerate and save functions to session
app.use((req: any, res: Response, next: NextFunction) => {
  /* istanbul ignore next */
  if (req.session && !req.session.regenerate) {
    req.session.regenerate = (cb: () => void) => {
      cb();
    };
  }
  /* istanbul ignore next */
  if (req.session && !req.session.save) {
    req.session.save = (cb: () => void) => {
      cb();
    };
  }
  next();
});

// Initialize passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

// Health check endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Test error endpoint
app.get('/test-error', (req: Request, res: Response, next: NextFunction) => {
  next(new Error('Test error'));
});

// Auth routes
app.use('/auth', authRoutes);

// Recipe routes
app.use('/api/recipes', recipeRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: {
      status: 404,
      message: 'Not Found'
    }
  });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.stack) {
    console.error(err.stack);
  }

  res.status(err.status || 500).json({
    error: {
      status: err.status || 500,
      message: err.message || 'Internal Server Error'
    }
  });
});

export default app;