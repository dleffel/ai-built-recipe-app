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

// Apply routes with auth middleware
router.use(requireAuth);
router.get('/', getActivityFeed);

export default router;