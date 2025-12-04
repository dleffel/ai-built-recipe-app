import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieSession from 'cookie-session';
import passport from './config/passport';
import authRoutes, { validateDevAuthToken } from './routes/auth';
import recipeRoutes from './routes/recipes';
import taskRoutes from './routes/tasks';
import serverConfig from './config/server-config';
import { prisma } from './lib/prisma';
import { UserService } from './services/userService';
import { createPTDate, toDateStringPT, getEndOfDayPT } from './utils/timezoneUtils';

const app = express();

// Task rollover scheduler
const scheduleTaskRollover = () => {
  // Get current time
  const now = new Date();
  
  // Get end of today in PT timezone (this correctly handles DST)
  // Adding 1ms to get to the start of the next day
  const endOfTodayPT = getEndOfDayPT(now);
  const midnightPT = new Date(endOfTodayPT.getTime() + 1);
  
  // Calculate milliseconds until midnight PT
  const msUntilMidnight = midnightPT.getTime() - now.getTime();
  
  // Schedule the task rollover
  setTimeout(async () => {
    try {
      const { TaskService } = require('./services/taskService');
      
      // Get today's date in PT timezone (the day we're rolling INTO)
      const now = new Date();
      const todayStr = toDateStringPT(now);
      
      // Get yesterday's date in PT timezone (the day we're rolling FROM)
      const yesterdayDate = new Date(now);
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = toDateStringPT(yesterdayDate);
      
      // Create proper PT timezone dates using the utility function
      // This correctly handles both PST (UTC-8) and PDT (UTC-7)
      const yesterday = createPTDate(yesterdayStr);
      const today = createPTDate(todayStr);
      
      // Roll over tasks
      const rolledOverCount = await TaskService.rollOverTasks(yesterday, today);
      console.log(`Task rollover completed: ${rolledOverCount} tasks rolled over from ${yesterdayStr} to ${todayStr}`);
      
      // Schedule the next rollover
      scheduleTaskRollover();
    } catch (error) {
      console.error('Error during task rollover:', error);
      // Still schedule the next rollover even if this one failed
      scheduleTaskRollover();
    }
  }, msUntilMidnight);
  
  console.log(`Task rollover scheduled for ${midnightPT.toISOString()} (in ${Math.floor(msUntilMidnight / 60000)} minutes)`);
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

// Enable cross-site cookies for production OR when CROSS_SITE_COOKIES=true (Railway preview envs)
const enableCrossSiteCookies = process.env.NODE_ENV === 'production' || process.env.CROSS_SITE_COOKIES === 'true';

// Determine cookie domain:
// - For production with custom domain (organizer.dannyleffel.com), don't set domain to allow cookie to work on exact host
// - For Railway preview environments, don't set domain (cookies will be scoped to exact host)
// - For development, don't set domain
// Note: Setting domain to a specific value can cause issues with cross-origin requests
// When domain is not set, the cookie is scoped to the exact host that set it
const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

// Log cookie configuration
const cookieConfig = {
  name: 'session',
  keys: [serverConfig.sessionSecret],
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  secure: enableCrossSiteCookies,
  sameSite: enableCrossSiteCookies ? 'none' as const : 'lax' as const,
  // Only set domain if explicitly configured via COOKIE_DOMAIN env var
  // Not setting domain allows cookies to work correctly in cross-origin scenarios
  domain: cookieDomain,
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

    // Add save method for cookie-session compatibility
    // cookie-session doesn't have a native save() method like express-session
    // We need to ensure the session is marked as modified so the cookie gets updated
    if (!req.session.save) {
      req.session.save = (callback: (err?: any) => void) => {
        console.log('Saving session:', {
          sessionData: { ...req.session }
        });
        // Touch the session to ensure cookie-session marks it as modified
        // This forces the Set-Cookie header to be sent with the response
        if (req.session) {
          // Setting a timestamp ensures the session is considered "dirty"
          // and will be re-serialized to the cookie
          req.session._lastAccess = Date.now();
        }
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

// Dev auth token middleware - fallback for iOS third-party cookie blocking
// This checks for Authorization: Bearer <token> header and authenticates if valid
app.use(async (req: any, res: Response, next: NextFunction) => {
  // Skip if already authenticated via session
  if (req.user) {
    return next();
  }
  
  // Check for dev auth token in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const userId = validateDevAuthToken(token);
    
    if (userId) {
      try {
        // Look up user from database
        const user = await UserService.findById(userId);
        if (user) {
          console.log('Authenticated via dev auth token:', userId);
          req.user = user;
        }
      } catch (error) {
        console.error('Error looking up user for dev auth token:', error);
      }
    }
  }
  
  next();
});

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