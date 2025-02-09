import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieSession from 'cookie-session';
import passport from './config/passport';
import authRoutes from './routes/auth';
import serverConfig from './config/server-config';

const app = express();

// Enable CORS with credentials
app.use(cors({
  origin: serverConfig.clientUrl,
  credentials: true,
}));

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(cookieSession({
  name: 'session',
  keys: [serverConfig.sessionSecret],
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
}));

// Add regenerate and save functions to session
app.use((req: any, res: Response, next: NextFunction) => {
  if (req.session && !req.session.regenerate) {
    req.session.regenerate = (cb: () => void) => {
      cb();
    };
  }
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
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Test error endpoint
app.get('/test-error', (req: Request, res: Response, next: NextFunction) => {
  next(new Error('Test error'));
});

// Auth routes
app.use('/auth', authRoutes);

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