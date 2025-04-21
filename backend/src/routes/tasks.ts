import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { TaskService, CreateTaskDTO, UpdateTaskDTO, MoveTaskDTO, ReorderTaskDTO } from '../services/taskService';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const router = Router();

// Middleware to ensure user is authenticated
const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  next();
};

// Create task
const createTask: RequestHandler = async (req, res) => {
  try {
    // Add validation
    const { title, dueDate, status, category, displayOrder } = req.body;
    if (!title || !dueDate || !status || !category || displayOrder === undefined) {
      res.status(400).json({ 
        error: 'Missing required fields: title, dueDate, status, category, and displayOrder are required' 
      });
      return;
    }

    // Parse date if it's a string
    const parsedData = {
      ...req.body,
      dueDate: new Date(req.body.dueDate)
    };

    const task = await TaskService.createTask(req.user!.id, parsedData);
    res.json(task);
  } catch (error: unknown) {
    console.error('Create task error:', error);
    if (error instanceof PrismaClientKnownRequestError) {
      res.status(400).json({ error: 'Invalid task data' });
    } else {
      res.status(500).json({ error: 'Failed to create task' });
    }
  }
};

// Get all tasks for the current user
const getUserTasks: RequestHandler = async (req, res) => {
  try {
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 100;
    const status = req.query.status as string | undefined;
    
    const tasks = await TaskService.getTasksByUserId(req.user!.id, { skip, take, status });
    res.json(tasks);
  } catch (error: unknown) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

// Get tasks for a specific date
const getTasksByDate: RequestHandler = async (req, res) => {
  try {
    const dateParam = req.params.date;
    if (!dateParam) {
      res.status(400).json({ error: 'Date parameter is required' });
      return;
    }

    // Parse the date parameter
    const date = new Date(dateParam);
    if (isNaN(date.getTime())) {
      res.status(400).json({ error: 'Invalid date format' });
      return;
    }

    const tasks = await TaskService.getTasksByUserIdAndDate(req.user!.id, date);
    res.json(tasks);
  } catch (error: unknown) {
    console.error('Get tasks by date error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks for the specified date' });
  }
};

// Update task
const updateTask: RequestHandler = async (req, res) => {
  try {
    // Parse date if it's a string and present
    const parsedData: UpdateTaskDTO = { ...req.body };
    if (req.body.dueDate) {
      parsedData.dueDate = new Date(req.body.dueDate);
    }

    const task = await TaskService.updateTask(
      req.params.id,
      req.user!.id,
      parsedData
    );
    res.json(task);
  } catch (error: unknown) {
    console.error('Update task error:', error);
    if (error instanceof Error && error.message === 'Task not found or unauthorized') {
      res.status(404).json({ error: error.message });
    } else if (error instanceof PrismaClientKnownRequestError) {
      res.status(400).json({ error: 'Invalid task data' });
    } else {
      res.status(500).json({ error: 'Failed to update task' });
    }
  }
};

// Delete task
const deleteTask: RequestHandler = async (req, res) => {
  try {
    await TaskService.deleteTask(req.params.id, req.user!.id);
    res.json({ message: 'Task deleted successfully' });
  } catch (error: unknown) {
    console.error('Delete task error:', error);
    if (error instanceof Error && error.message === 'Task not found or unauthorized') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete task' });
    }
  }
};

// Move task to a different date
const moveTask: RequestHandler = async (req, res) => {
  try {
    const { dueDate, isRolledOver } = req.body;
    if (!dueDate) {
      res.status(400).json({ error: 'dueDate is required' });
      return;
    }

    const moveData: MoveTaskDTO = {
      dueDate: new Date(dueDate),
      isRolledOver
    };

    const task = await TaskService.moveTask(
      req.params.id,
      req.user!.id,
      moveData
    );
    res.json(task);
  } catch (error: unknown) {
    console.error('Move task error:', error);
    if (error instanceof Error && error.message === 'Task not found or unauthorized') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to move task' });
    }
  }
};

// Reorder task
const reorderTask: RequestHandler = async (req, res) => {
  try {
    const { displayOrder } = req.body;
    if (displayOrder === undefined) {
      res.status(400).json({ error: 'displayOrder is required' });
      return;
    }

    const reorderData: ReorderTaskDTO = {
      displayOrder: parseInt(displayOrder)
    };

    const task = await TaskService.reorderTask(
      req.params.id,
      req.user!.id,
      reorderData
    );
    res.json(task);
  } catch (error: unknown) {
    console.error('Reorder task error:', error);
    if (error instanceof Error && error.message === 'Task not found or unauthorized') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to reorder task' });
    }
  }
};

// Apply routes with auth middleware
router.use(requireAuth);
router.post('/', createTask);
router.get('/', getUserTasks);
router.get('/:date', getTasksByDate);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.put('/:id/move', moveTask);
router.put('/:id/reorder', reorderTask);

export default router;