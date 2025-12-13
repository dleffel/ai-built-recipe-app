import { Router, RequestHandler } from 'express';
import { User } from '@prisma/client';
import { UserSettingsService } from '../services/userSettingsService';
import { requireAuth } from '../middleware/auth';

// Extend the Express Request type to include the user property
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const router = Router();

/**
 * GET /api/settings
 * Get user settings for the authenticated user
 */
const getUserSettings: RequestHandler = async (req, res) => {
  try {
    const settings = await UserSettingsService.getUserSettings(req.user!.id);
    res.json(settings);
  } catch (error: unknown) {
    console.error('Get user settings error:', error);
    res.status(500).json({ error: 'Failed to fetch user settings' });
  }
};

/**
 * PUT /api/settings
 * Update user settings for the authenticated user
 */
const updateUserSettings: RequestHandler = async (req, res) => {
  try {
    const { hiddenFeedTags } = req.body;

    // Validate input
    if (hiddenFeedTags !== undefined && !Array.isArray(hiddenFeedTags)) {
      res.status(400).json({ error: 'hiddenFeedTags must be an array' });
      return;
    }

    if (hiddenFeedTags && !hiddenFeedTags.every((id: unknown) => typeof id === 'string')) {
      res.status(400).json({ error: 'hiddenFeedTags must be an array of strings' });
      return;
    }

    const settings = await UserSettingsService.updateUserSettings(req.user!.id, {
      hiddenFeedTags,
    });

    res.json(settings);
  } catch (error: unknown) {
    console.error('Update user settings error:', error);
    if (error instanceof Error && error.message.startsWith('Invalid tag IDs')) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to update user settings' });
  }
};

// Apply routes with auth middleware
router.use(requireAuth);
router.get('/', getUserSettings);
router.put('/', updateUserSettings);

export default router;
