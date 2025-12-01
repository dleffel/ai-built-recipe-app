import { RequestHandler } from 'express';

/**
 * Middleware to ensure user is authenticated.
 * Returns 401 if no user is present in the request.
 */
export const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  next();
};