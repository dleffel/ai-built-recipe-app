import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

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
    scope: ['profile', 'email'],
    state: true,
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

          console.log('Created new user from Google profile:', user);

          // In a real app, you would typically:
          // 1. Check if user exists in database
          // 2. Create new user if they don't exist
          // 3. Update existing user if they do exist
          // 4. Return user object

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
  // In development, return mock user
  if (process.env.NODE_ENV === 'development' && mockUser?.id === id) {
    return done(null, mockUser);
  }

  // In production, would typically:
  // 1. Query database for user by ID
  // 2. Return user if found
  // 3. Return error if not found
  done(new Error('User not found'), undefined);
});

export default passport;