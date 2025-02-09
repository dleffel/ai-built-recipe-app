import express, { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { getMockUser, User } from '../config/passport';

// Extend Express Request type to include login method
declare module 'express-serve-static-core' {
  interface Request {
    login(user: User, done: (err: any) => void): void;
    logout(done: (err: any) => void): void;
    user?: User;
  }
}

const router = express.Router();

// Google OAuth login route
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

// Google OAuth callback route
router.get(
  '/google/callback',
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('google', (err: Error | null, user: User | false) => {
      if (err) {
        console.error('Google auth error:', err);
        return res.redirect('http://localhost:3000?error=auth_failed');
      }
      
      if (!user) {
        return res.redirect('http://localhost:3000?error=no_user');
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('Login error:', loginErr);
          return res.redirect('http://localhost:3000?error=login_failed');
        }
        
        // Successful authentication, redirect to frontend
        return res.redirect('http://localhost:3000');
      });
    })(req, res, next);
  }
);

// Development only route handler
const devLoginHandler = async (req: Request, res: Response): Promise<void> => {
  const mockUser = getMockUser();
  
  if (!mockUser) {
    res.status(500).json({ error: 'Mock user not found' });
    return;
  }

  req.login(mockUser, (err) => {
    if (err) {
      console.error('Dev login error:', err);
      res.status(500).json({ error: 'Failed to login' });
      return;
    }
    res.json(mockUser);
  });
};

// Only add dev login route in development
if (process.env.NODE_ENV !== 'production') {
  router.post('/dev-login', devLoginHandler);
}

// Get current user
router.get('/current-user', (req: Request, res: Response) => {
  if (req.user) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Logout route
router.get('/logout', (req: Request, res: Response, next: NextFunction) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

export default router;