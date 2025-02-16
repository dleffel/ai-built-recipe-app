import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { RecipeService, CreateRecipeDTO, UpdateRecipeDTO } from '../services/recipeService';
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

// Create recipe
const createRecipe: RequestHandler = async (req, res) => {
  try {
    // Add validation
    const { title, ingredients, instructions } = req.body;
    if (!title || !ingredients || !instructions) {
      res.status(400).json({ error: 'Missing required fields: title, ingredients, and instructions are required' });
      return;
    }


    const recipe = await RecipeService.createRecipe(req.user!.id, req.body);
    res.json(recipe);
  } catch (error: unknown) {
    console.error('Create recipe error:', error);
    if (error instanceof PrismaClientKnownRequestError) {
      res.status(400).json({ error: 'Invalid recipe data' });
    } else {
      res.status(500).json({ error: 'Failed to create recipe' });
    }
  }
};

// Get user's recipes with pagination
const getUserRecipes: RequestHandler = async (req, res) => {
  try {
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 10;
    
    const [recipes, total] = await Promise.all([
      RecipeService.findByUser(req.user!.id, { skip, take }),
      RecipeService.countUserRecipes(req.user!.id)
    ]);

    res.json({
      recipes,
      pagination: {
        skip,
        take,
        total
      }
    });
  } catch (error: unknown) {
    console.error('Get recipes error:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
};

// Get single recipe
const getRecipe: RequestHandler = async (req, res) => {
  try {
    const recipe = await RecipeService.findById(req.params.id);
    if (!recipe) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }
    res.json(recipe);
  } catch (error: unknown) {
    console.error('Get recipe error:', error);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
};

// Update recipe
const updateRecipe: RequestHandler = async (req, res) => {
  try {
    const recipe = await RecipeService.updateRecipe(
      req.params.id,
      req.user!.id,
      req.body
    );
    res.json(recipe);
  } catch (error: unknown) {
    console.error('Update recipe error:', error);
    if (error instanceof Error && error.message === 'Recipe not found or unauthorized') {
      res.status(404).json({ error: error.message });
    } else if (error instanceof PrismaClientKnownRequestError) {
      res.status(400).json({ error: 'Invalid recipe data' });
    } else {
      res.status(500).json({ error: 'Failed to update recipe' });
    }
  }
};

// Delete recipe
const deleteRecipe: RequestHandler = async (req, res) => {
  try {
    await RecipeService.softDeleteRecipe(req.params.id, req.user!.id);
    res.json({ message: 'Recipe deleted successfully' });
  } catch (error: unknown) {
    console.error('Delete recipe error:', error);
    if (error instanceof Error && error.message === 'Recipe not found or unauthorized') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete recipe' });
    }
  }
};

// Apply routes with auth middleware
router.use(requireAuth);
router.post('/', createRecipe);
router.get('/', getUserRecipes);
router.get('/:id', getRecipe);
router.put('/:id', updateRecipe);
router.delete('/:id', deleteRecipe);

export default router;