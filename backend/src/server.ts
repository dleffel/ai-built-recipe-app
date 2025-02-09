import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import config from './config/server-config';

interface CustomError extends Error {
  status?: number;
  stack?: string;
}

/* istanbul ignore next */
function createApp(): Express {
  const app = express();

  // Middleware
  app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  return app;
}

const app = createApp();

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test error endpoint
app.get('/test-error', (_req: Request, _res: Response, next: NextFunction) => {
  const error: CustomError = new Error('Test error');
  error.status = 500;
  next(error);
});

// Error handling middleware
app.use((err: CustomError, _req: Request, res: Response, _next: NextFunction) => {
  /* istanbul ignore next */
  if (err.stack) {
    console.error(err.stack);
  }
  
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: {
      message: 'Not Found',
      status: 404
    }
  });
});

/* istanbul ignore next */
if (config.nodeEnv === 'production') {
  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, '../../frontend/build')));
  
  // Production catch-all route
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../../frontend/build/index.html'));
  });
}

/* istanbul ignore next */
function startServer(): void {
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
  });
}

// Start server only if this file is run directly
/* istanbul ignore if */
if (require.main === module) {
  startServer();
}

export default app;