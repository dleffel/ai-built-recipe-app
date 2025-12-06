import type { Recipe, Prisma } from '@prisma/client';
import { BaseService } from './BaseService';

export interface CreateRecipeDTO {
  title: string;
  description?: string;
  ingredients: string[];
  instructions: string[];
  servings?: number;
  prepTime?: number;
  cookTime?: number;
  imageUrl?: string;
  sourceUrl?: string;
}

export interface UpdateRecipeDTO extends Partial<CreateRecipeDTO> {}

export class RecipeService extends BaseService {
  /**
   * Create a new recipe
   */
  static async createRecipe(userId: string, data: CreateRecipeDTO): Promise<Recipe> {
    return this.prisma.recipe.create({
      data: {
        ...data,  // Spread data first
        userId: userId    // Then add userId to override any userId in data
      }
    });
  }

  /**
   * Find a recipe by ID (excluding soft-deleted recipes)
   */
  static async findById(id: string): Promise<Recipe | null> {
    return this.prisma.recipe.findFirst({
      where: {
        id,
        isDeleted: false
      }
    });
  }

  /**
   * Find recipes by user ID with pagination, search, and sorting
   */
  static async findByUser(userId: string, options?: {
    skip?: number;
    take?: number;
    includeDeleted?: boolean;
    search?: string;
    sortBy?: 'title' | 'prepTime' | 'cookTime' | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Recipe[]> {
    const searchCondition: Prisma.RecipeWhereInput = options?.search
      ? {
          OR: [
            {
              title: {
                contains: options.search,
                mode: 'insensitive'
              }
            },
            {
              description: {
                contains: options.search,
                mode: 'insensitive'
              }
            },
            {
              ingredients: {
                hasSome: [options.search]
              }
            }
          ]
        }
      : {};

    // Build orderBy based on sortBy and sortOrder
    const sortField = options?.sortBy || 'updatedAt';
    const sortDirection = options?.sortOrder || 'desc';
    
    // Handle null values for optional fields by using nulls last
    const orderBy: Prisma.RecipeOrderByWithRelationInput = {
      [sortField]: sortDirection
    };

    console.log('[DEBUG] Recipe search query:', {
      searchTerm: options?.search,
      searchCondition: JSON.stringify(searchCondition, null, 2),
      sortBy: sortField,
      sortOrder: sortDirection,
      userId
    });

    return this.prisma.recipe.findMany({
      where: {
        userId,
        isDeleted: options?.includeDeleted ? undefined : false,
        ...searchCondition
      },
      skip: options?.skip,
      take: options?.take,
      orderBy
    });
  }

  /**
   * Update a recipe (verifying ownership)
   */
  static async updateRecipe(id: string, userId: string, data: UpdateRecipeDTO): Promise<Recipe> {
    // First verify ownership
    const recipe = await RecipeService.findById(id);
    if (!recipe || recipe.userId !== userId) {
      throw new Error('Recipe not found or unauthorized');
    }

    return this.prisma.recipe.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      }
    });
  }

  /**
   * Soft delete a recipe (verifying ownership)
   */
  static async softDeleteRecipe(id: string, userId: string): Promise<Recipe> {
    // First verify ownership
    const recipe = await RecipeService.findById(id);
    if (!recipe || recipe.userId !== userId) {
      throw new Error('Recipe not found or unauthorized');
    }

    return this.prisma.recipe.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Count total recipes for a user with search (excluding soft-deleted)
   */
  static async countUserRecipes(userId: string, search?: string): Promise<number> {
    const searchCondition: Prisma.RecipeWhereInput = search
      ? {
          OR: [
            {
              title: {
                contains: search,
                mode: 'insensitive'
              }
            },
            {
              description: {
                contains: search,
                mode: 'insensitive'
              }
            },
            {
              ingredients: {
                hasSome: [search]
              }
            }
          ]
        }
      : {};

    return this.prisma.recipe.count({
      where: {
        userId,
        isDeleted: false,
        ...searchCondition
      }
    });
  }
}