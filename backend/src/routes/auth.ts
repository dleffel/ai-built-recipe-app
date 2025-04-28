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
  (req: Request, res: Response, next: NextFunction) => {
    console.log('Google callback received:', {
      headers: req.headers,
      session: req.session,
      cookies: req.cookies
    });

    // Monitor Set-Cookie header
    const originalSetHeader = res.setHeader;
    res.setHeader = function(name: string, value: any) {
      console.log(`[Callback] Setting header ${name}:`, value);
      return originalSetHeader.apply(this, [name, value]);
    };

    next();
  },
  passport.authenticate('google', {
    failureRedirect: 'https://organizer.dannyleffel.com?error=auth_failed'
  }),
  async (req: Request, res: Response) => {
    try {
      console.log('Passport authentication successful, session:', req.session);
      
      // Log response headers before any redirects
      console.log('Response headers before redirect:', {
        headers: res.getHeaders(),
        cookies: req.headers.cookie,
        host: req.headers.host
      });
      
      // Ensure user is properly logged in
      if (!req.user) {
        console.error('No user in request after Google authentication');
        res.redirect('https://organizer.dannyleffel.com?error=auth_failed');
        return;
      }

      // Update last login time
      await UserService.updateLastLogin(req.user.id);
      
      // Ensure session is saved before redirect
      if (req.session) {
        await new Promise<void>((resolve, reject) => {
          req.session!.save((err: Error | null) => {
            if (err) {
              console.error('Error saving session:', err);
              reject(err);
              return;
            }
            console.log('Session saved successfully');
            resolve();
          });
        });
      }
      
      // Set cache control headers
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      // Log detailed cookie state before redirect
      console.log('Cookie state before redirect:', {
        session: req.session,
        user: req.user,
        headers: {
          request: req.headers,
          response: res.getHeaders()
        },
        setCookieHeader: res.getHeader('set-cookie'),
        cookieConfig: {
          domain: process.env.NODE_ENV === 'production' ? '.recipes.dannyleffel.com' : undefined,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        }
      });
      
      // Redirect to frontend with success
      res.redirect('https://organizer.dannyleffel.com');
    } catch (error) {
      console.error('Error in Google callback:', error);
      res.redirect('https://organizer.dannyleffel.com?error=auth_failed');
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

    // Cast mockUser to Express.User and update with database ID
    const user = mockUser as Express.User;
    user.id = dbUser.id;

    // Format the user response with proper fallbacks
    const formatted = formatUserResponse(dbUser, user);

    // Update only the display name and photo URL
    user.displayName = formatted.displayName;
    user.photoUrl = formatted.photo;

    req.login(user, (err) => {
      if (err) {
        console.error(`Dev login error: ${err}`);
        res.status(500).json({ error: 'Failed to login' });
        return;
      }
      res.json(user);
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