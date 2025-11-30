import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieSession from 'cookie-session';
import passport from './config/passport';
import authRoutes from './routes/auth';
import recipeRoutes from './routes/recipes';
import taskRoutes from './routes/tasks';
import serverConfig from './config/server-config';
import { prisma } from './lib/prisma';

const app = express();

// Task rollover scheduler
const scheduleTaskRollover = () => {
  // Get current time in PT
  const now = new Date();
  
  // Create midnight in PT timezone
  const todayStr = now.toISOString().split('T')[0];
  const midnight = new Date(`${todayStr}T23:59:59.999-07:00`);
  midnight.setSeconds(midnight.getSeconds() + 1); // Add 1 second to get to next day 00:00:00
  
  // Calculate milliseconds until midnight PT
  const msUntilMidnight = midnight.getTime() - now.getTime();
  
  // Schedule the task rollover
  setTimeout(async () => {
    try {
      const { TaskService } = require('./services/taskService');
      
      // Get yesterday's date in PT
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const yesterdayDate = new Date(todayStr);
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
      
      // Create explicit PT timezone dates
      const yesterday = new Date(`${yesterdayStr}T00:00:00-07:00`);
      const today = new Date(`${todayStr}T00:00:00-07:00`);
      
      // Roll over tasks
      const rolledOverCount = await TaskService.rollOverTasks(yesterday, today);
      console.log(`Task rollover completed: ${rolledOverCount} tasks rolled over from ${yesterday.toISOString()} to ${today.toISOString()}`);
      
      // Schedule the next rollover
      scheduleTaskRollover();
    } catch (error) {
      console.error('Error during task rollover:', error);
      // Still schedule the next rollover even if this one failed
      scheduleTaskRollover();
    }
  }, msUntilMidnight);
  
  console.log(`Task rollover scheduled for ${midnight.toISOString()} (in ${Math.floor(msUntilMidnight / 60000)} minutes)`);
};

// Start the task rollover scheduler (but not in test environment)
if (process.env.NODE_ENV !== 'test') {
  scheduleTaskRollover();
}

// Trust proxy - needed for secure cookies behind a proxy
app.set('trust proxy', 1);

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
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
  domain: process.env.NODE_ENV === 'production' ? 'api.organizer.dannyleffel.com' : undefined,
  path: '/',
  httpOnly: true,
  signed: true
};

console.log('Cookie session configuration:', {
  ...cookieConfig,
  keys: '[REDACTED]' // Don't log the secret key
});

// Session middleware
app.use(cookieSession(cookieConfig));

// Log cookie-session details after middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const originalSetHeader = res.setHeader;
  res.setHeader = function(name: string, value: any) {
    console.log(`Setting header ${name}:`, value);
    return originalSetHeader.apply(this, [name, value]);
  };
  
  // Log detailed cookie-session state
  console.log('Cookie-session detailed state:', {
    env: process.env.NODE_ENV,
    sessionId: req.session?.id,
    cookieHeader: req.headers.cookie,
    cookieConfig: {
      domain: cookieConfig.domain,
      secure: cookieConfig.secure,
      sameSite: cookieConfig.sameSite,
      path: cookieConfig.path,
      httpOnly: cookieConfig.httpOnly
    },
    request: {
      host: req.headers.host,
      origin: req.headers.origin,
      protocol: req.protocol,
      secure: req.secure
    }
  });
  
  next();
});

// Enhanced logging middleware for all requests
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log('Request received:', {
    path: req.path,
    fullUrl: req.originalUrl,
    method: req.method,
    hasSession: !!req.session,
    sessionId: req.session?.id,
    cookies: req.headers.cookie,
    body: req.method === 'POST' ? req.body : undefined,
    headers: {
      ...req.headers,
      cookie: undefined // Don't log full cookie contents
    }
  });
  next();
});

// Log request and response for /auth routes
app.use('/auth', (req, res, next) => {
  // Log incoming request
  console.log('Auth request received:', {
    path: req.path,
    method: req.method,
    headers: req.headers,
    hasSession: !!req.session,
    sessionId: req.session?.id
  });

  // Log response when it's finished
  res.on('finish', () => {
    console.log('Auth response finished:', {
      path: req.path,
      statusCode: res.statusCode,
      headers: res.getHeaders(),
      hasSession: !!req.session,
      sessionId: req.session?.id,
      sessionContent: req.session
    });
  });

  next();
});

// Add session compatibility layer for Passport
app.use((req: any, res: Response, next: NextFunction) => {
  if (req.session) {
    // Log initial session state
    console.log('Session state before:', {
      path: req.path,
      hasSession: !!req.session,
      sessionKeys: Object.keys(req.session)
    });

    // Add regenerate method
    if (!req.session.regenerate) {
      req.session.regenerate = (callback: (err?: any) => void) => {
        console.log('Regenerating session');
        // Store current session data
        const oldSession = { ...req.session };
        
        // Clear session data
        Object.keys(req.session).forEach(key => {
          if (key !== 'regenerate' && key !== 'save') {
            delete req.session[key];
          }
        });

        console.log('Session regenerated:', {
          before: oldSession,
          after: req.session
        });
        
        callback();
      };
    }

    // Add save method
    if (!req.session.save) {
      req.session.save = (callback: (err?: any) => void) => {
        console.log('Saving session:', {
          sessionData: { ...req.session }
        });
        callback();
      };
    }

    // Log final session state
    console.log('Session state after:', {
      hasSession: !!req.session,
      sessionKeys: Object.keys(req.session)
    });
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

// Task routes
app.use('/api/tasks', taskRoutes);

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