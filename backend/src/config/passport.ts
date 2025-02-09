import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface User {
  id: string;
  displayName: string;
  email: string;
  photo: string;
}

// Extend Express.User interface
declare global {
  namespace Express {
    interface User {
      id: string;
      displayName: string;
      email: string;
      photo: string;
    }
  }
}

let mockUser: User | undefined;
// Store Google users in memory (in production this would be a database)
const googleUsers: Map<string, User> = new Map();

// Create mock user in development mode
if (process.env.NODE_ENV === 'development') {
  mockUser = {
    id: 'dev-123',
    displayName: 'Development User',
    email: 'dev@example.com',
    photo: 'test-photo.jpg',
  };
}

export const getMockUser = () => {
  if (process.env.NODE_ENV === 'development') {
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
          // Create user object from Google profile
          const user: User = {
            id: profile.id,
            displayName: profile.displayName,
            email: profile.emails?.[0]?.value || '',
            photo: profile.photos?.[0]?.value || '',
          };

          // Store user in memory
          googleUsers.set(user.id, user);
          console.log('Created new user from Google profile:', user);

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

// Serialize user for the session
passport.serializeUser((user: Express.User, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser((id: string, done) => {
  // In development, check for mock user first
  if (process.env.NODE_ENV === 'development' && mockUser?.id === id) {
    return done(null, mockUser);
  }

  // Check for Google user
  const googleUser = googleUsers.get(id);
  if (googleUser) {
    return done(null, googleUser);
  }

  // User not found
  return done(null, false);
});

export default passport;