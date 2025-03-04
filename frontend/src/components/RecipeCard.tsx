import React from 'react';
import { Recipe } from '../types/recipe';
import styles from './RecipeCard.module.css';

interface RecipeCardProps {
  recipe: Recipe;
  onEdit?: (recipe: Recipe) => void;
  onDelete?: (recipe: Recipe) => void;
  onClick?: (recipe: Recipe) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  onEdit,
  onDelete,
  onClick,
}) => {
  const handleClick = () => {
    onClick?.(recipe);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(recipe);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      onDelete?.(recipe);
    }
  };

  return (
    <div className={styles.card} onClick={handleClick}>
      <div className={styles.imageContainer}>
        {recipe.imageUrl ? (
          <img src={recipe.imageUrl} alt={recipe.title} className={styles.image} />
        ) : (
          <div className={styles.placeholder}>
            {recipe.title.charAt(0)}
          </div>
        )}
      </div>
      <div className={styles.content}>
        <h3 className={styles.title}>{recipe.title}</h3>
        {recipe.description && (
          <p className={styles.description}>{recipe.description}</p>
        )}
        <div className={styles.details}>
          {recipe.prepTime && (
            <span className={styles.time}>
              Prep: {recipe.prepTime} min
            </span>
          )}
          {recipe.cookTime && (
            <span className={styles.time}>
              Cook: {recipe.cookTime} min
            </span>
          )}
          {recipe.servings && (
            <span className={styles.servings}>
              Serves: {recipe.servings}
            </span>
          )}
        </div>
      </div>
      {(onEdit || onDelete) && (
        <div className={styles.actions}>
          {onEdit && (
            <button
              onClick={handleEdit}
              className={`${styles.button} ${styles.editButton}`}
              aria-label="Edit recipe"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              className={`${styles.button} ${styles.deleteButton}`}
              aria-label="Delete recipe"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};