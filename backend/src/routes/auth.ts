import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import passport from '../config/passport';
import { getMockUser } from '../config/passport';

const router = Router();

/* istanbul ignore next */
// Google OAuth routes
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

/* istanbul ignore next */
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: 'http://localhost:3000?error=auth_failed'
  }),
  ((req: Request, res: Response) => {
    res.redirect('http://localhost:3000');
  }) as RequestHandler
);

/* istanbul ignore next */
// Development login route
const devLogin: RequestHandler = (req, res) => {
  console.log('Dev login attempt, NODE_ENV:', process.env.NODE_ENV);
  
  if (process.env.NODE_ENV !== 'development') {
    console.log('Not in development mode');
    res.status(404).json({ error: 'Not available in production' });
    return;
  }

  const mockUser = getMockUser();
  console.log('Mock user:', mockUser);
  
  if (!mockUser) {
    res.status(500).json({ error: 'Mock user not found' });
    return;
  }

  /* istanbul ignore next */
  req.login(mockUser, (err) => {
    if (err) {
      console.error(`Dev login error: ${err}`);
      res.status(500).json({ error: 'Failed to login' });
      return;
    }
    res.json(mockUser);
  });
};

// Get current user
const getCurrentUser: RequestHandler = (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  res.json(req.user);
};

// Logout route
const logout: RequestHandler = (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  /* istanbul ignore next */
  req.logout((err) => {
    if (err) {
      console.error(`Logout error: ${err}`);
      res.status(500).json({ error: 'Failed to logout' });
      return;
    }
    res.json({ message: 'Logged out successfully' });
  });
};

router.post('/dev-login', devLogin);
router.get('/current-user', getCurrentUser);
router.get('/logout', logout);

export default router;