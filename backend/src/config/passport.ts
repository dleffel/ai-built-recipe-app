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

// Extend Express.User interface to match Prisma User
declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends PrismaUser {}
  }
}

// Mock user for development
const mockUser: PrismaUser = {
  id: 'dev-123',
  email: 'dev@example.com',
  displayName: 'Development User',
  photoUrl: 'https://via.placeholder.com/150',
  googleId: 'mock-google-id',
  hiddenFeedTags: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: new Date()
};

export const getMockUser = () => {
  // Allow mock user in development/test mode OR when explicitly enabled via ENABLE_DEV_LOGIN
  const isDevLoginEnabled = process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEV_LOGIN === 'true';
  if (isDevLoginEnabled) {
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

          console.log('Created/found user:', user);

          return done(null, user);
        } catch (error) {
          console.error('Error in Google authentication:', error);
          return done(error as Error);
        }
      }
    )
  );
}

// Serialize user for the session
passport.serializeUser((user, done) => {
  console.log('Serializing user:', user);
  // Only serialize the ID for security
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id: string, done) => {
  try {
    console.log('Deserializing user id:', id);

    // Check for mock user when dev login is enabled
    const isDevLoginEnabled = process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEV_LOGIN === 'true';
    
    // First, try to find user in database by ID
    // This handles both regular users AND dev login users (who get a real database ID)
    const user = await UserService.findById(id);
    if (user) {
      console.log('Deserialized user from database:', user);
      
      // For dev login users, check if this is the mock user by googleId
      // and return the mock user object with updated ID for consistency
      if (isDevLoginEnabled && user.googleId === 'mock-google-id') {
        console.log('Found dev login user in database, returning with mock user properties');
        // Return the database user (which has the correct ID for session consistency)
        return done(null, user);
      }
      
      return done(null, user);
    }
    
    // Fallback: Check for legacy mock user ID (in case session was created before DB user existed)
    if (isDevLoginEnabled && id === mockUser.id) {
      console.log('Using legacy mock user for dev login');
      return done(null, mockUser);
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