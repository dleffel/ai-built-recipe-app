import React, { useEffect, useState } from 'react';
import { Recipe } from '../types/recipe';
import { recipeApi } from '../services/api';
import { RecipeCard } from './RecipeCard';
import styles from './RecipeList.module.css';

interface RecipeListProps {
  onRecipeClick: (recipe: Recipe) => void;
  onRecipeEdit: (recipe: Recipe) => void;
  onRecipeDelete: (recipe: Recipe) => void;
}

export const RecipeList: React.FC<RecipeListProps> = ({
  onRecipeClick,
  onRecipeEdit,
  onRecipeDelete
}) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 12;

  const loadRecipes = async (pageNumber: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await recipeApi.list({
        skip: pageNumber * PAGE_SIZE,
        take: PAGE_SIZE
      });
      
      if (pageNumber === 0) {
        setRecipes(response.recipes);
      } else {
        setRecipes(prev => [...prev, ...response.recipes]);
      }
      
      setHasMore(response.recipes.length === PAGE_SIZE);
    } catch (err) {
      setError('Failed to load recipes. Please try again.');
      console.error('Error loading recipes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecipes(0);
  }, []);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadRecipes(nextPage);
  };

  if (error) {
    return (
      <div className={styles.error}>
        <p>{error}</p>
        <button onClick={() => loadRecipes(0)} className={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {recipes.map(recipe => (
          <div key={recipe.id} className={styles.gridItem}>
            <RecipeCard
              recipe={recipe}
              onEdit={() => onRecipeEdit(recipe)}
              onDelete={() => onRecipeDelete(recipe)}
              onClick={() => onRecipeClick(recipe)}
            />
          </div>
        ))}
      </div>
      
      {loading && (
        <div className={styles.loading}>
          Loading...
        </div>
      )}
      
      {!loading && hasMore && (
        <button
          onClick={handleLoadMore}
          className={styles.loadMoreButton}
        >
          Load More
        </button>
      )}
      
      {!loading && recipes.length === 0 && (
        <div className={styles.empty}>
          <p>No recipes found. Create your first recipe!</p>
        </div>
      )}
    </div>
  );
};