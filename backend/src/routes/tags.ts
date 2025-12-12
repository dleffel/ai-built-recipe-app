import { Router, RequestHandler } from 'express';
import { User } from '@prisma/client';
import { TagService } from '../services/tagService';
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

// Get all tags for the current user (for autocomplete)
const getUserTags: RequestHandler = async (req, res) => {
  try {
    const search = req.query.search as string | undefined;
    const tags = await TagService.getUserTags(req.user!.id, search);
    res.json({ tags });
  } catch (error: unknown) {
    console.error('Get tags error:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
};

// Apply routes with auth middleware
router.use(requireAuth);
router.get('/', getUserTags);

export default router;
