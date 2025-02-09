import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// User type definition
export interface User {
  id: string;
  displayName: string;
  email: string;
  photo?: string;
}

// Extend Express types
declare global {
  namespace Express {
    interface User {
      id: string;
      displayName: string;
      email: string;
      photo?: string;
    }
  }
}

// In-memory user store (replace with database in production)
const users: Map<string, User> = new Map();

// Add mock user for development
if (process.env.NODE_ENV !== 'production') {
  const mockUser: User = {
    id: 'dev-123',
    displayName: 'Development User',
    email: 'dev@example.com',
    photo: 'https://via.placeholder.com/150',
  };
  users.set(mockUser.id, mockUser);
}

passport.serializeUser((user: Express.User, done) => {
  done(null, user.id);
});

passport.deserializeUser((id: string, done) => {
  const user = users.get(id);
  if (!user) {
    done(new Error('User not found'));
    return;
  }
  done(null, user);
});

// Configure Google Strategy
const googleConfig = {
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: process.env.REDIRECT_URL,
  scope: ['profile', 'email'],
  state: true, // Enable state parameter for CSRF protection
};

console.log('Google OAuth Configuration:', {
  ...googleConfig,
  clientSecret: '[HIDDEN]',
});

passport.use(
  new GoogleStrategy(
    googleConfig,
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists
        let user = users.get(profile.id);

        if (!user) {
          // Create new user from Google profile
          user = {
            id: profile.id,
            displayName: profile.displayName,
            email: profile.emails?.[0]?.value ?? '',
            photo: profile.photos?.[0]?.value,
          };
          users.set(profile.id, user);
          console.log('Created new user from Google profile:', user);
        }

        return done(null, user);
      } catch (error) {
        console.error('Error in Google strategy:', error);
        return done(error as Error, undefined);
      }
    }
  )
);

// Export the mock user for development routes
export const getMockUser = (): User | undefined => 
  process.env.NODE_ENV !== 'production' ? users.get('dev-123') : undefined;

export default passport;