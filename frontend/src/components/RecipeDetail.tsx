import React from 'react';
import { Recipe } from '../types/recipe';
import styles from './RecipeDetail.module.css';

interface RecipeDetailProps {
  recipe: Recipe;
  onEdit?: () => void;
  onDelete?: () => void;
  onBack: () => void;
}

export const RecipeDetail: React.FC<RecipeDetailProps> = ({
  recipe,
  onEdit,
  onDelete,
  onBack
}) => {
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      onDelete?.();
    }
  };

  return (
    <div className={styles.container}>
      <button onClick={onBack} className={styles.backButton}>
        ← Back to Recipes
      </button>

      <div className={styles.header}>
        <h1 className={styles.title}>{recipe.title}</h1>
        <div className={styles.actions}>
          {onEdit && (
            <button onClick={onEdit} className={styles.editButton}>
              Edit Recipe
            </button>
          )}
          {onDelete && (
            <button onClick={handleDelete} className={styles.deleteButton}>
              Delete Recipe
            </button>
          )}
        </div>
      </div>

      {recipe.imageUrl && (
        <div className={styles.imageContainer}>
          <img src={recipe.imageUrl} alt={recipe.title} className={styles.image} />
        </div>
      )}

      {recipe.description && (
        <div className={styles.section}>
          <p className={styles.description}>{recipe.description}</p>
        </div>
      )}

      <div className={styles.metadata}>
        {recipe.servings && (
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Servings:</span>
            <span>{recipe.servings}</span>
          </div>
        )}
        {recipe.prepTime && (
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Prep Time:</span>
            <span>{recipe.prepTime} minutes</span>
          </div>
        )}
        {recipe.cookTime && (
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Cook Time:</span>
            <span>{recipe.cookTime} minutes</span>
          </div>
        )}
        {(recipe.prepTime || recipe.cookTime) && (
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Total Time:</span>
            <span>{(recipe.prepTime || 0) + (recipe.cookTime || 0)} minutes</span>
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h2>Ingredients</h2>
        <ul className={styles.ingredients}>
          {recipe.ingredients.map((ingredient, index) => (
            <li key={index} className={styles.ingredient}>
              {ingredient}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.section}>
        <h2>Instructions</h2>
        <ol className={styles.instructions}>
          {recipe.instructions.map((instruction, index) => (
            <li key={index} className={styles.instruction}>
              {instruction}
            </li>
          ))}
        </ol>
      </div>

      <div className={styles.footer}>
        <div className={styles.dates}>
          <span>Created: {new Date(recipe.createdAt).toLocaleDateString()}</span>
          {recipe.updatedAt !== recipe.createdAt && (
            <span>Updated: {new Date(recipe.updatedAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  );
};