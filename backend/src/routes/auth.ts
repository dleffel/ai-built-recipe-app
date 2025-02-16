import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import passport from '../config/passport';
import { getMockUser } from '../config/passport';
import { UserService } from '../services/userService';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const router = Router();

// Helper function to format user response
const formatUserResponse = (dbUser: { id: string; email: string }, sessionUser?: Express.User) => ({
  id: dbUser.id,
  email: dbUser.email,
  displayName: sessionUser?.displayName || dbUser.email.split('@')[0],
  photo: sessionUser?.photoUrl || 'https://via.placeholder.com/150'
});

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
  async (req: Request, res: Response) => {
    try {
      // Ensure user is properly logged in
      if (!req.user) {
        console.error('No user in request after Google authentication');
        res.redirect('http://localhost:3000?error=auth_failed');
        return;
      }

      // Update last login time
      await UserService.updateLastLogin(req.user.id);
      
      // Redirect to frontend with success
      res.redirect('http://localhost:3000');
    } catch (error) {
      console.error('Error in Google callback:', error);
      res.redirect('http://localhost:3000?error=auth_failed');
    }
  }
);

// Development login route
const devLogin: RequestHandler = async (req, res) => {
  console.log('Dev login attempt, NODE_ENV:', process.env.NODE_ENV);
  
  if (process.env.NODE_ENV === 'production') {
    console.log('Not in development or test mode');
    res.status(404).json({ error: 'Not available in production' });
    return;
  }

  const mockUser = getMockUser();
  
  if (!mockUser) {
    res.status(500).json({ error: 'Mock user not found' });
    return;
  }

  try {
    // Ensure mock user exists in database and update last login
    const dbUser = await UserService.findOrCreateGoogleUser({
      email: mockUser.email,
      googleId: 'mock-google-id'
    });

    // Use the mock user's session data with updated ID
    mockUser.id = dbUser.id;
    req.login(mockUser, (err) => {
      if (err) {
        console.error(`Dev login error: ${err}`);
        res.status(500).json({ error: 'Failed to login' });
        return;
      }
      res.json(mockUser);
    });
  } catch (error) {
    console.error('Dev login database error:', error);
    if (error instanceof PrismaClientKnownRequestError) {
      res.status(500).json({ error: 'Database error: ' + error.message });
    } else {
      res.status(500).json({ error: 'Database error during login' });
    }
  }
};

// Get current user
const getCurrentUser: RequestHandler = async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    // Get fresh user data from database
    const user = await UserService.findById(req.user.id);
    if (!user) {
      req.logout((err) => {
        if (err) console.error('Logout error:', err);
      });
      res.status(401).json({ error: 'User not found in database' });
      return;
    }

    // Return the session user data which includes profile photo
    res.json(req.user);
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Logout route
const logout: RequestHandler = (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

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