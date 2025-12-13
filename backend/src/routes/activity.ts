import { Router, RequestHandler } from 'express';
import { User } from '@prisma/client';
import { ActivityService } from '../services/activityService';
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
 * GET /api/activity
 * Get recent activity feed for the authenticated user
 * Query params:
 *   - limit: number (default: 20, max: 50)
 *   - offset: number (default: 0)
 */
const getActivityFeed: RequestHandler = async (req, res) => {
  try {
    const limit = Math.min(
      parseInt(req.query.limit as string) || 20,
      50 // Max limit
    );
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await ActivityService.getRecentActivity(req.user!.id, {
      limit,
      offset,
    });

    res.json(result);
  } catch (error: unknown) {
    console.error('Get activity feed error:', error);
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
};

/**
 * POST /api/activity/hide-contact/:contactId
 * Hide a contact from the activity feed
 */
const hideContact: RequestHandler = async (req, res) => {
  try {
    const { contactId } = req.params;
    
    if (!contactId) {
      res.status(400).json({ error: 'Contact ID is required' });
      return;
    }

    const result = await ActivityService.hideContactFromFeed(req.user!.id, contactId);
    res.json({
      success: true,
      hiddenContact: {
        contactId,
        contactName: result.contactName
      }
    });
  } catch (error: unknown) {
    console.error('Hide contact error:', error);
    if (error instanceof Error && error.message === 'Contact not found') {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to hide contact' });
  }
};

/**
 * DELETE /api/activity/hide-contact/:contactId
 * Unhide a contact from the activity feed (undo hide)
 */
const unhideContact: RequestHandler = async (req, res) => {
  try {
    const { contactId } = req.params;
    
    if (!contactId) {
      res.status(400).json({ error: 'Contact ID is required' });
      return;
    }

    await ActivityService.unhideContactFromFeed(req.user!.id, contactId);
    res.json({ success: true });
  } catch (error: unknown) {
    console.error('Unhide contact error:', error);
    res.status(500).json({ error: 'Failed to unhide contact' });
  }
};

// Apply routes with auth middleware
router.use(requireAuth);
router.get('/', getActivityFeed);
router.post('/hide-contact/:contactId', hideContact);
router.delete('/hide-contact/:contactId', unhideContact);

export default router;