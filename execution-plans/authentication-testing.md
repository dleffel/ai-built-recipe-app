# Authentication Testing Guide

## Available Authentication Methods

### 1. Google OAuth (Production Ready)
- Configured with proper session handling
- Uses cookie-session for session management
- Securely stores user data
- Redirects back to the application after authentication

### 2. Development Login (Development Only)
- Available only in development environment
- Uses mock user data
- Bypasses OAuth flow for easier testing
- Provides immediate authentication

## Testing Instructions

### Testing Google OAuth

1. Start both servers:
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev

   # Terminal 2 - Frontend
   cd frontend && npm start
   ```

2. Click "Sign in with Google" button
3. Complete Google authentication
4. You will be redirected back to the application
5. The application should show your Google profile information

### Testing Development Login

1. Ensure both servers are running
2. Click "Dev Login" button (only visible in development)
3. You should be immediately logged in with mock user data:
   - Name: Development User
   - Email: dev@example.com
   - Profile photo: placeholder image

### Testing Logout

1. While logged in (either method), click the "Logout" button
2. You should be returned to the login screen
3. Session should be cleared

## Troubleshooting

If Google OAuth callback is not working:
1. Verify the callback URL in Google Cloud Console matches: http://localhost:5001/auth/google/callback
2. Check that GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correct in backend/.env
3. Ensure REDIRECT_URL in backend/.env matches the callback URL

If development login is not working:
1. Verify NODE_ENV is not set to 'production'
2. Check backend console for any error messages
3. Verify cookie-session is properly configured

## Security Notes

- Google OAuth is configured with secure session handling
- Cookies are set with secure flags in production
- Session data is encrypted
- Development login is automatically disabled in production