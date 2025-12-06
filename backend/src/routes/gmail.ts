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
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  next();
};

/**
 * GET /api/gmail/accounts
 * List all connected Gmail accounts for the current user
 */
const listAccounts: RequestHandler = async (req, res) => {
  try {
    const accounts = await GmailAccountService.getAccountsByUserId(req.user!.id);
    res.json({
      accounts: accounts.map(GmailAccountService.formatForResponse),
    });
  } catch (error) {
    console.error('Error listing Gmail accounts:', error);
    res.status(500).json({ error: 'Failed to list Gmail accounts' });
  }
};

/**
 * POST /api/gmail/accounts/connect
 * Initiate OAuth flow to connect a new Gmail account
 * Returns the authorization URL to redirect the user to
 */
const initiateConnect: RequestHandler = async (req, res) => {
  try {
    // Generate state parameter with user ID for security
    const state = Buffer.from(JSON.stringify({
      userId: req.user!.id,
      timestamp: Date.now(),
    })).toString('base64');

    const authUrl = GmailOAuthService.generateAuthUrl(state);
    
    res.json({ authUrl });
  } catch (error) {
    console.error('Error initiating Gmail connection:', error);
    res.status(500).json({ error: 'Failed to initiate Gmail connection' });
  }
};

/**
 * GET /api/gmail/callback
 * OAuth callback handler for Gmail connection
 */
const handleCallback: RequestHandler = async (req, res) => {
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      console.error('OAuth error:', oauthError);
      res.redirect(`${process.env.CLIENT_URL}/settings/gmail?error=oauth_denied`);
      return;
    }

    if (!code || typeof code !== 'string') {
      res.redirect(`${process.env.CLIENT_URL}/settings/gmail?error=missing_code`);
      return;
    }

    // Verify state parameter
    let stateData: { userId: string; timestamp: number };
    try {
      if (!state || typeof state !== 'string') {
        throw new Error('Missing state');
      }
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      
      // Check state is not too old (5 minutes)
      if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
        throw new Error('State expired');
      }
    } catch {
      res.redirect(`${process.env.CLIENT_URL}/settings/gmail?error=invalid_state`);
      return;
    }

    // Exchange code for tokens
    const tokens = await GmailOAuthService.exchangeCodeForTokens(code);
    
    // Get email address from tokens
    const email = await GmailOAuthService.getEmailFromTokens(tokens);

    // Check if account already exists
    const existing = await GmailAccountService.findByUserAndEmail(stateData.userId, email);
    
    if (existing) {
      // Update existing account with new tokens
      await GmailAccountService.updateAccount(existing.id, stateData.userId, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        isActive: true,
      });
      
      // Ensure watch is set up
      await GmailWatchService.setupWatch(existing.id);
      
      res.redirect(`${process.env.CLIENT_URL}/settings/gmail?success=reconnected`);
      return;
    }

    // Create new Gmail account
    const account = await GmailAccountService.createAccount(stateData.userId, {
      email,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.expiresAt,
    });

    // Set up Gmail watch for real-time notifications
    await GmailWatchService.setupWatch(account.id);

    res.redirect(`${process.env.CLIENT_URL}/settings/gmail?success=connected`);
  } catch (error) {
    console.error('Error handling Gmail callback:', error);
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

// Apply auth middleware to all routes except callback
router.use(requireAuth);

// Routes
router.get('/accounts', listAccounts);
router.post('/accounts/connect', initiateConnect);
router.get('/callback', handleCallback);
router.post('/accounts/:id/activate', activateAccount);
router.post('/accounts/:id/deactivate', deactivateAccount);
router.delete('/accounts/:id', deleteAccount);

export default router;