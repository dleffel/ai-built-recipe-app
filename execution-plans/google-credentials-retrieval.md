# Google OAuth Credentials Retrieval Guide

## Step-by-Step Instructions

1. **Access Google Cloud Console**
   - Go to https://console.cloud.google.com/
   - Sign in with your Google account if not already signed in

2. **Navigate to Your Project**
   - In the top navigation bar, ensure your project is selected
   - If not, click the project dropdown and select your project

3. **Access OAuth Credentials**
   - In the left sidebar, click "APIs & Services"
   - Click "Credentials"
   - Look for "OAuth 2.0 Client IDs" in the credentials list

4. **View Credentials**
   - Find the entry for your web application
   - Click the pencil (edit) icon or the client ID name
   - You should now see:
     * Client ID
     * Client Secret
   
5. **Verify/Update Redirect URIs**
   - In the same credentials page, scroll to "Authorized redirect URIs"
   - For local development, add (if not already present):
     * http://localhost:3000/auth/google/callback
   - For production (if applicable), add your production callback URL

6. **Save Your Credentials**
   - Copy the Client ID and Client Secret
   - We'll use these to set up environment variables in the next phase

## Security Notes
- Keep your Client Secret secure and never commit it to version control
- We'll store these credentials in environment variables
- The Client ID is public and will be used in the frontend
- The Client Secret should only be used in the backend

Once you have these credentials, let me know and we can proceed with implementing the Google login functionality in the application.