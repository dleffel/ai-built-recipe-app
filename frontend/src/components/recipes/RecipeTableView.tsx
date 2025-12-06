import React from 'react';
import { Recipe } from '../../types/recipe';
import { SortField, SortOrder } from './SortDropdown';
import styles from './RecipeTableView.module.css';

interface RecipeTableViewProps {
  recipes: Recipe[];
  sortField: SortField;
  sortOrder: SortOrder;
  onSortChange: (field: SortField, order: SortOrder) => void;
  onRecipeClick: (recipe: Recipe) => void;
  onRecipeEdit: (recipe: Recipe) => void;
  onRecipeDelete: (recipe: Recipe) => void;
}

const formatTime = (minutes: number | undefined): string => {
  if (!minutes) return '-';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

interface SortableHeaderProps {
  field: SortField;
  label: string;
  currentField: SortField;
  currentOrder: SortOrder;
  onSort: (field: SortField, order: SortOrder) => void;
  className?: string;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({
  field,
  label,
  currentField,
  currentOrder,
  onSort,
  className,
}) => {
  const isActive = currentField === field;
  
  const handleClick = () => {
    if (isActive) {
      onSort(field, currentOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(field, field === 'title' ? 'asc' : 'desc');
    }
  };

  return (
    <th
      className={`${styles.th} ${className || ''} ${isActive ? styles.thActive : ''}`}
      onClick={handleClick}
      role="columnheader"
      aria-sort={isActive ? (currentOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span className={styles.thContent}>
        {label}
        {isActive && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`${styles.sortIcon} ${currentOrder === 'asc' ? styles.sortAsc : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </span>
    </th>
  );
};

export const RecipeTableView: React.FC<RecipeTableViewProps> = ({
  recipes,
  sortField,
  sortOrder,
  onSortChange,
  onRecipeClick,
  onRecipeEdit,
  onRecipeDelete,
}) => {
  const handleDelete = (e: React.MouseEvent, recipe: Recipe) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      onRecipeDelete(recipe);
    }
  };

  const handleEdit = (e: React.MouseEvent, recipe: Recipe) => {
    e.stopPropagation();
    onRecipeEdit(recipe);
  };

  return (
    <div className={styles.container}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th className={`${styles.th} ${styles.thThumbnail}`}></th>
            <SortableHeader
              field="title"
              label="Recipe"
              currentField={sortField}
              currentOrder={sortOrder}
              onSort={onSortChange}
              className={styles.thTitle}
            />
            <SortableHeader
              field="prepTime"
              label="Prep"
              currentField={sortField}
              currentOrder={sortOrder}
              onSort={onSortChange}
              className={styles.thTime}
            />
            <SortableHeader
              field="cookTime"
              label="Cook"
              currentField={sortField}
              currentOrder={sortOrder}
              onSort={onSortChange}
              className={styles.thTime}
            />
            <th className={`${styles.th} ${styles.thServings}`}>Servings</th>
            <SortableHeader
              field="updatedAt"
              label="Updated"
              currentField={sortField}
              currentOrder={sortOrder}
              onSort={onSortChange}
              className={styles.thDate}
            />
            <th className={`${styles.th} ${styles.thActions}`}></th>
          </tr>
        </thead>
        <tbody className={styles.tbody}>
          {recipes.map((recipe) => (
            <tr
              key={recipe.id}
              className={styles.row}
              onClick={() => onRecipeClick(recipe)}
              tabIndex={0}
              role="button"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRecipeClick(recipe);
                }
              }}
            >
              <td className={styles.tdThumbnail}>
                {recipe.imageUrl ? (
                  <img
                    src={recipe.imageUrl}
                    alt=""
                    className={styles.thumbnail}
                    loading="lazy"
                  />
                ) : (
                  <div className={styles.thumbnailPlaceholder}>
                    {recipe.title.charAt(0).toUpperCase()}
                  </div>
                )}
              </td>
              <td className={styles.tdTitle}>
                <div className={styles.titleWrapper}>
                  <span className={styles.title}>{recipe.title}</span>
                  {recipe.description && (
                    <span className={styles.description}>{recipe.description}</span>
                  )}
                </div>
              </td>
              <td className={styles.tdTime}>{formatTime(recipe.prepTime)}</td>
              <td className={styles.tdTime}>{formatTime(recipe.cookTime)}</td>
              <td className={styles.tdServings}>
                {recipe.servings ? recipe.servings : '-'}
              </td>
              <td className={styles.tdDate}>{formatDate(recipe.updatedAt)}</td>
              <td className={styles.tdActions}>
                <div className={styles.actions}>
                  <button
                    className={styles.actionButton}
                    onClick={(e) => handleEdit(e, recipe)}
                    aria-label="Edit recipe"
                    title="Edit"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    onClick={(e) => handleDelete(e, recipe)}
                    aria-label="Delete recipe"
                    title="Delete"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};