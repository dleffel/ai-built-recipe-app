import { Router, Request, Response, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import { TrainerService } from '../services/trainerService';

const router = Router();
const prisma = new PrismaClient();
const trainerService = new TrainerService();

// Middleware to ensure user is authenticated
const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  next();
};

// Get or create trainer conversation for user
router.get('/conversation', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    let conversation = await prisma.trainerConversation.findFirst({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!conversation) {
      conversation = await prisma.trainerConversation.create({
        data: { userId },
        include: {
          messages: true
        }
      });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send message to trainer
router.post('/chat', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { message, metrics, macros } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    // Get or create conversation
    let conversation = await prisma.trainerConversation.findFirst({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!conversation) {
      conversation = await prisma.trainerConversation.create({
        data: { userId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });
    }

    // Save user message
    const userMessage = await prisma.trainerMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message
      }
    });

    // Handle metrics if provided
    if (metrics) {
      await trainerService.updateDailyMetrics(userId, metrics);
    }

    // Handle macros if provided  
    if (macros) {
      await trainerService.updateDailyMacros(userId, macros);
    }

    // Get trainer response
    const trainerResponse = await trainerService.generateResponse(userId, message, conversation.messages);

    // Save trainer message
    const trainerMessage = await prisma.trainerMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'trainer',
        content: trainerResponse.message
      }
    });

    // Get updated conversation
    const updatedConversation = await prisma.trainerConversation.findUnique({
      where: { id: conversation.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    res.json({
      message: trainerResponse.message,
      todaysPlan: trainerResponse.todaysPlan,
      conversation: updatedConversation
    });

  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get daily metrics
router.get('/metrics/:date?', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const date = req.params.date || new Date().toISOString().split('T')[0];

    const metrics = await prisma.dailyMetrics.findUnique({
      where: {
        userId_date: {
          userId,
          date: new Date(date)
        }
      }
    });

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update daily metrics
router.post('/metrics', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const metrics = await trainerService.updateDailyMetrics(userId, req.body);
    res.json(metrics);
  } catch (error) {
    console.error('Error updating metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get daily macros
router.get('/macros/:date?', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const date = req.params.date || new Date().toISOString().split('T')[0];

    const macros = await prisma.dailyMacros.findUnique({
      where: {
        userId_date: {
          userId,
          date: new Date(date)
        }
      }
    });

    res.json(macros);
  } catch (error) {
    console.error('Error fetching macros:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update daily macros
router.post('/macros', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const macros = await trainerService.updateDailyMacros(userId, req.body);
    res.json(macros);
  } catch (error) {
    console.error('Error updating macros:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get trainer settings
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    let settings = await prisma.trainerSettings.findUnique({
      where: { userId }
    });

    if (!settings) {
      settings = await prisma.trainerSettings.create({
        data: { userId }
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update trainer settings
router.put('/settings', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const settings = await prisma.trainerSettings.upsert({
      where: { userId },
      update: req.body,
      create: {
        userId,
        ...req.body
      }
    });

    res.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get workout sessions
router.get('/workouts', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const workouts = await prisma.workoutSession.findMany({
      where: { userId },
      include: {
        exercises: {
          include: {
            sets: {
              orderBy: { setNumber: 'asc' }
            }
          }
        }
      },
      orderBy: { date: 'desc' },
      take: limit,
      skip: offset
    });

    res.json(workouts);
  } catch (error) {
    console.error('Error fetching workouts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create workout session
router.post('/workouts', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const workout = await trainerService.createWorkoutSession(userId, req.body);
    res.json(workout);
  } catch (error) {
    console.error('Error creating workout:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;