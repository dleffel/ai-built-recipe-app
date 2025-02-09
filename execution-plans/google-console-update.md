# Google Cloud Console Configuration Update

## Current Issue
The Google OAuth callback URL mismatch needs to be fixed. The error indicates that the authorized redirect URI in Google Cloud Console doesn't match our backend's callback URL.

## Required Changes

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" > "Credentials"
3. Find your OAuth 2.0 Client ID
4. Under "Authorized redirect URIs":
   - Remove: http://localhost:3000/auth/google/callback
   - Add: http://localhost:5001/auth/google/callback
   - Click "Save"

## Verification
After updating the redirect URI:
1. The backend is configured to use: http://localhost:5001/auth/google/callback
2. The frontend redirects to Google OAuth
3. Google redirects back to our backend
4. Backend processes authentication and redirects to frontend

## Current Configuration
- Backend Server: http://localhost:5001
- Frontend Server: http://localhost:3000
- OAuth Callback URL: http://localhost:5001/auth/google/callback
- Client ID: 691384679965-8pdk3shlndsftviaeplmhn6v2pujnptb.apps.googleusercontent.com

Please update the Google Cloud Console configuration with these settings before testing the authentication flow again.