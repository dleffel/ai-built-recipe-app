# Google OAuth Configuration Update

## Current Setup
- Backend server running on: http://localhost:5001
- Frontend server running on: http://localhost:3000
- Current callback URL: http://localhost:5001/auth/google/callback

## Required Changes in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to "APIs & Services" > "Credentials"
4. Find and edit your OAuth 2.0 Client ID
5. Under "Authorized redirect URIs":
   - Remove: http://localhost:3000/auth/google/callback
   - Add: http://localhost:5001/auth/google/callback
6. Click "Save"

## Testing After Update

1. Ensure both servers are running:
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev

   # Terminal 2 - Frontend
   cd frontend && npm start
   ```

2. Test the authentication flow:
   - Visit http://localhost:3000
   - Click "Sign in with Google"
   - Complete Google authentication
   - Should be redirected back to http://localhost:3000 with active session

3. Expected behavior:
   - Google OAuth redirects to backend (5001)
   - Backend processes authentication
   - Backend redirects to frontend (3000)
   - Frontend shows authenticated user state

## Authentication Flow

1. Frontend (3000) -> Click "Sign in with Google"
2. Redirects to Google OAuth
3. Google redirects to Backend (5001/auth/google/callback)
4. Backend processes OAuth and sets session
5. Backend redirects to Frontend (3000)
6. Frontend shows authenticated state

Please update the Google Cloud Console configuration before testing the authentication flow again.