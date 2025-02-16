import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import { UserService } from '../services/userService';
import type { User as PrismaUser } from '@prisma/client';

// Load environment variables
dotenv.config();

// Define our session user type to match frontend expectations
export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  photoUrl: string;
}

// Extend Express.User interface
declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends SessionUser {}
  }
}

// Mock user for development
const mockUser: SessionUser = {
  id: 'dev-123',
  email: 'dev@example.com',
  displayName: 'Development User',
  photoUrl: 'https://via.placeholder.com/150'
};

export const getMockUser = () => {
  if (process.env.NODE_ENV !== 'production') {
    return mockUser;
  }
  return undefined;
};

// Configure Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const config = {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.REDIRECT_URL || 'http://localhost:5001/auth/google/callback',
  };

  console.log('Google OAuth Configuration:', {
    ...config,
    clientSecret: '[HIDDEN]',
  });

  passport.use(
    new GoogleStrategy(
      config,
      async (accessToken, refreshToken, profile, done) => {
        try {
          if (!profile.emails?.[0]?.value) {
            return done(new Error('No email provided from Google'));
          }

          // Log full profile for debugging
          console.log('Full Google profile:', JSON.stringify(profile, null, 2));

          // Find or create user using UserService
          const user = await UserService.findOrCreateGoogleUser({
            email: profile.emails[0].value,
            googleId: profile.id,
            displayName: profile.displayName,
            photoUrl: profile.photos?.[0]?.value
          });

          // Create session user with profile data
          const sessionUser: SessionUser = {
            id: user.id,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoUrl: user.photoUrl || 'https://via.placeholder.com/150'
          };

          console.log('Created session user:', sessionUser);

          return done(null, sessionUser);
        } catch (error) {
          console.error('Error in Google authentication:', error);
          return done(error as Error);
        }
      }
    )
  );
}

// Serialize user for the session
passport.serializeUser((user: Express.User, done) => {
  console.log('Serializing user:', user);
  // Only serialize the ID for security
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id: string, done) => {
  try {
    console.log('Deserializing user id:', id);

    // In development, check for mock user first
    if (process.env.NODE_ENV === 'development' && id === mockUser.id) {
      console.log('Using mock user for development');
      return done(null, mockUser);
    }

    // Find user in database by ID
    const user = await UserService.findById(id);
    if (user) {
      // Update last login time
      await UserService.updateLastLogin(user.id);
      
      // Create session user from database
      const sessionUser: SessionUser = {
        id: user.id,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        photoUrl: user.photoUrl || 'https://via.placeholder.com/150'
      };

      console.log('Deserialized session user:', sessionUser);
      return done(null, sessionUser);
    }

    console.log('User not found in database:', { id });
    // User not found
    return done(null, false);
  } catch (error) {
    console.error('Error deserializing user:', error);
    return done(error);
  }
});

export default passport;