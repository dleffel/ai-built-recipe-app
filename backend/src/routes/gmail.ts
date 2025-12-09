import { Router, Request, Response, RequestHandler } from 'express';
import { GmailAccountService } from '../services/gmailAccountService';
import { GmailOAuthService } from '../services/gmailOAuthService';
import { GmailWatchService } from '../services/gmailWatchService';

const router = Router();

/**
 * Middleware to ensure user is authenticated
 */
const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.user) {
    console.log('[Gmail] Auth middleware: User not authenticated');
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  console.log('[Gmail] Auth middleware: User authenticated, userId:', req.user.id);
  next();
};

/**
 * GET /api/gmail/accounts
 * List all connected Gmail accounts for the current user
 */
const listAccounts: RequestHandler = async (req, res) => {
  console.log('[Gmail] listAccounts: Starting for userId:', req.user!.id);
  try {
    const accounts = await GmailAccountService.getAccountsByUserId(req.user!.id);
    console.log('[Gmail] listAccounts: Found', accounts.length, 'accounts for userId:', req.user!.id);
    res.json({
      accounts: accounts.map(GmailAccountService.formatForResponse),
    });
  } catch (error) {
    console.error('[Gmail] listAccounts: Error listing Gmail accounts:', error);
    res.status(500).json({ error: 'Failed to list Gmail accounts' });
  }
};

/**
 * POST /api/gmail/accounts/connect
 * Initiate OAuth flow to connect a new Gmail account
 * Returns the authorization URL to redirect the user to
 */
const initiateConnect: RequestHandler = async (req, res) => {
  console.log('[Gmail] initiateConnect: Starting for userId:', req.user!.id);
  try {
    // Generate state parameter with user ID for security
    const state = Buffer.from(JSON.stringify({
      userId: req.user!.id,
      timestamp: Date.now(),
    })).toString('base64');
    console.log('[Gmail] initiateConnect: Generated state for userId:', req.user!.id);

    const authUrl = GmailOAuthService.generateAuthUrl(state);
    console.log('[Gmail] initiateConnect: Generated auth URL, redirecting user');
    
    res.json({ authUrl });
  } catch (error) {
    console.error('[Gmail] initiateConnect: Error initiating Gmail connection:', error);
    res.status(500).json({ error: 'Failed to initiate Gmail connection' });
  }
};

/**
 * GET /api/gmail/callback
 * OAuth callback handler for Gmail connection
 */
const handleCallback: RequestHandler = async (req, res) => {
  console.log('[Gmail] handleCallback: Received callback');
  console.log('[Gmail] handleCallback: Query params:', {
    hasCode: !!req.query.code,
    hasState: !!req.query.state,
    hasError: !!req.query.error,
    error: req.query.error,
  });
  
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      console.error('[Gmail] handleCallback: OAuth error from Google:', oauthError);
      res.redirect(`${process.env.CLIENT_URL}/settings/gmail?error=oauth_denied`);
      return;
    }

    if (!code || typeof code !== 'string') {
      console.error('[Gmail] handleCallback: Missing or invalid code parameter');
      res.redirect(`${process.env.CLIENT_URL}/settings/gmail?error=missing_code`);
      return;
    }

    // Verify state parameter
    let stateData: { userId: string; timestamp: number };
    try {
      if (!state || typeof state !== 'string') {
        console.error('[Gmail] handleCallback: Missing state parameter');
        throw new Error('Missing state');
      }
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      console.log('[Gmail] handleCallback: Decoded state, userId:', stateData.userId, 'timestamp:', stateData.timestamp);
      
      // Check state is not too old (5 minutes)
      const stateAge = Date.now() - stateData.timestamp;
      console.log('[Gmail] handleCallback: State age:', stateAge, 'ms');
      if (stateAge > 5 * 60 * 1000) {
        console.error('[Gmail] handleCallback: State expired, age:', stateAge, 'ms');
        throw new Error('State expired');
      }
    } catch (stateError) {
      console.error('[Gmail] handleCallback: State validation failed:', stateError);
      res.redirect(`${process.env.CLIENT_URL}/settings/gmail?error=invalid_state`);
      return;
    }

    // Exchange code for tokens
    console.log('[Gmail] handleCallback: Exchanging code for tokens...');
    const tokens = await GmailOAuthService.exchangeCodeForTokens(code);
    console.log('[Gmail] handleCallback: Token exchange successful, expires at:', tokens.expiresAt);
    
    // Get email address from tokens
    console.log('[Gmail] handleCallback: Getting email from tokens...');
    const email = await GmailOAuthService.getEmailFromTokens(tokens);
    console.log('[Gmail] handleCallback: Got email:', email);

    // Check if account already exists
    console.log('[Gmail] handleCallback: Checking for existing account, userId:', stateData.userId, 'email:', email);
    const existing = await GmailAccountService.findByUserAndEmail(stateData.userId, email);
    
    if (existing) {
      console.log('[Gmail] handleCallback: Found existing account, id:', existing.id, '- updating tokens');
      // Update existing account with new tokens
      await GmailAccountService.updateAccount(existing.id, stateData.userId, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        isActive: true,
      });
      console.log('[Gmail] handleCallback: Updated existing account successfully');
      
      // Ensure watch is set up
      console.log('[Gmail] handleCallback: Setting up watch for existing account...');
      try {
        await GmailWatchService.setupWatch(existing.id);
        console.log('[Gmail] handleCallback: Watch setup successful for existing account');
      } catch (watchError) {
        console.error('[Gmail] handleCallback: Watch setup failed for existing account:', watchError);
        // Continue anyway - account is connected, watch can be set up later
      }
      
      console.log('[Gmail] handleCallback: Redirecting with success=reconnected');
      res.redirect(`${process.env.CLIENT_URL}/settings/gmail?success=reconnected`);
      return;
    }

    // Create new Gmail account
    console.log('[Gmail] handleCallback: Creating new Gmail account for userId:', stateData.userId, 'email:', email);
    const account = await GmailAccountService.createAccount(stateData.userId, {
      email,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.expiresAt,
    });
    console.log('[Gmail] handleCallback: Created new Gmail account, id:', account.id);

    // Set up Gmail watch for real-time notifications
    console.log('[Gmail] handleCallback: Setting up watch for new account...');
    try {
      await GmailWatchService.setupWatch(account.id);
      console.log('[Gmail] handleCallback: Watch setup successful for new account');
    } catch (watchError) {
      console.error('[Gmail] handleCallback: Watch setup failed for new account:', watchError);
      // Continue anyway - account is connected, watch can be set up later
    }

    console.log('[Gmail] handleCallback: Redirecting with success=connected');
    res.redirect(`${process.env.CLIENT_URL}/settings/gmail?success=connected`);
  } catch (error) {
    console.error('[Gmail] handleCallback: Error handling Gmail callback:', error);
    console.error('[Gmail] handleCallback: Error stack:', error instanceof Error ? error.stack : 'No stack');
    res.redirect(`${process.env.CLIENT_URL}/settings/gmail?error=connection_failed`);
  }
};

/**
 * POST /api/gmail/accounts/:id/activate
 * Activate monitoring for a Gmail account
 */
const activateAccount: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    
    const account = await GmailAccountService.activateAccount(id, req.user!.id);
    
    // Ensure watch is set up
    await GmailWatchService.setupWatch(account.id);
    
    res.json(GmailAccountService.formatForResponse(account));
  } catch (error) {
    console.error('Error activating Gmail account:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: 'Gmail account not found' });
    } else {
      res.status(500).json({ error: 'Failed to activate Gmail account' });
    }
  }
};

/**
 * POST /api/gmail/accounts/:id/deactivate
 * Deactivate monitoring for a Gmail account
 */
const deactivateAccount: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    
    const account = await GmailAccountService.deactivateAccount(id, req.user!.id);
    
    // Stop the watch
    await GmailWatchService.stopWatch(id);
    
    res.json(GmailAccountService.formatForResponse(account));
  } catch (error) {
    console.error('Error deactivating Gmail account:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: 'Gmail account not found' });
    } else {
      res.status(500).json({ error: 'Failed to deactivate Gmail account' });
    }
  }
};

/**
 * DELETE /api/gmail/accounts/:id
 * Disconnect a Gmail account
 */
const deleteAccount: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get account first to revoke tokens
    const account = await GmailAccountService.findById(id);
    if (account && account.userId === req.user!.id) {
      // Stop watch first
      await GmailWatchService.stopWatch(id);
      
      // Revoke OAuth tokens
      await GmailOAuthService.revokeTokens(account);
    }
    
    // Delete the account
    await GmailAccountService.deleteAccount(id, req.user!.id);
    
    res.json({ message: 'Gmail account disconnected' });
  } catch (error) {
    console.error('Error deleting Gmail account:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: 'Gmail account not found' });
      } else if (error.message.includes('primary')) {
        res.status(400).json({ error: 'Cannot delete primary Gmail account' });
      } else {
        res.status(500).json({ error: 'Failed to delete Gmail account' });
      }
    } else {
      res.status(500).json({ error: 'Failed to delete Gmail account' });
    }
  }
};

// OAuth callback route - must be BEFORE auth middleware since users
// are redirected here from Google OAuth and won't have a session yet
router.get('/callback', handleCallback);

// Apply auth middleware to all remaining routes
router.use(requireAuth);

// Protected routes (require authentication)
router.get('/accounts', listAccounts);
router.post('/accounts/connect', initiateConnect);
router.post('/accounts/:id/activate', activateAccount);
router.post('/accounts/:id/deactivate', deactivateAccount);
router.delete('/accounts/:id', deleteAccount);

export default router;