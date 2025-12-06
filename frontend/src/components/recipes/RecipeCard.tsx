import React from 'react';
import { Recipe } from '../../types/recipe';
import { IconButton } from '../ui/Button';
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
      </div>
      {(onEdit || onDelete) && (
        <div className={styles.actions}>
          {onEdit && (
            <IconButton
              icon={<span>✎</span>}
              onClick={handleEdit}
              variant="ghost"
              size="sm"
              aria-label="Edit recipe"
            />
          )}
          {onDelete && (
            <IconButton
              icon={<span>✕</span>}
              onClick={handleDelete}
              variant="danger"
              size="sm"
              aria-label="Delete recipe"
            />
          )}
        </div>
      )}
    </div>
  );
};