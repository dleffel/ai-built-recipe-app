export interface Recipe {
  id: string;
  title: string;
  description?: string;
  ingredients: string[];
  instructions: string[];
  servings?: number;
  prepTime?: number;
  cookTime?: number;
  imageUrl?: string;
  sourceUrl?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

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

export interface RecipeListResponse {
  recipes: Recipe[];
  pagination: {
    skip: number;
    take: number;
    total: number;
    search?: string;
  };
}