import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { RecipeService, CreateRecipeDTO, UpdateRecipeDTO } from '../services/recipeService';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { RecipeExtractionService, URLFetchError, RecipeExtractionError } from '../services/recipeExtractionService';

const router = Router();

// Middleware to ensure user is authenticated
const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  next();
};

// Extract recipe from URL
const extractRecipeFromUrl: RequestHandler = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    console.log('[DEBUG] Extracting recipe from URL:', url);
    const recipeData = await RecipeExtractionService.extractRecipeFromUrl(url);
    console.log('[DEBUG] Extracted recipe data:', {
      title: recipeData.title,
      sourceUrl: recipeData.sourceUrl,
      hasIngredients: recipeData.ingredients.length > 0,
      hasInstructions: recipeData.instructions.length > 0
    });
    res.json(recipeData);
  } catch (error: unknown) {
    console.error('Recipe extraction error:', error);
    if (error instanceof URLFetchError) {
      res.status(400).json({ error: error.message });
    } else if (error instanceof RecipeExtractionError) {
      res.status(422).json({
        error: error.message,
        details: error.details
      });
    } else {
      res.status(500).json({
        error: 'Failed to extract recipe from URL',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};

// Create recipe
const createRecipe: RequestHandler = async (req, res) => {
  try {
    // Add validation
    const { title, ingredients, instructions, sourceUrl } = req.body;
    if (!title || !ingredients || !instructions) {
      res.status(400).json({ error: 'Missing required fields: title, ingredients, and instructions are required' });
      return;
    }

    console.log('[DEBUG] Creating recipe with data:', {
      title,
      sourceUrl,
      hasIngredients: ingredients.length > 0,
      hasInstructions: instructions.length > 0
    });

    const recipe = await RecipeService.createRecipe(req.user!.id, req.body);
    console.log('[DEBUG] Created recipe:', {
      id: recipe.id,
      title: recipe.title,
      sourceUrl: recipe.sourceUrl
    });
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
    console.log('[DEBUG] Retrieved recipe:', {
      id: recipe.id,
      title: recipe.title,
      sourceUrl: recipe.sourceUrl
    });
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
router.post('/extract-url', extractRecipeFromUrl);
router.post('/', createRecipe);
router.get('/', getUserRecipes);
router.get('/:id', getRecipe);
router.put('/:id', updateRecipe);
router.delete('/:id', deleteRecipe);

export default router;