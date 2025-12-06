import React, { useEffect, useState, useCallback } from 'react';
import { Recipe } from '../../types/recipe';
import { recipeApi } from '../../services/api';
import { RecipeCard } from './RecipeCard';
import { RecipeTableView } from './RecipeTableView';
import { ViewToggle, ViewMode } from './ViewToggle';
import { SortDropdown, SortField, SortOrder } from './SortDropdown';
import styles from './RecipeList.module.css';

const VIEW_MODE_KEY = 'recipeViewMode';
const SORT_FIELD_KEY = 'recipeSortField';
const SORT_ORDER_KEY = 'recipeSortOrder';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // View and sort state with localStorage persistence
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    return (saved === 'list' || saved === 'grid') ? saved : 'list';
  });
  
  const [sortField, setSortField] = useState<SortField>(() => {
    const saved = localStorage.getItem(SORT_FIELD_KEY);
    return (saved as SortField) || 'updatedAt';
  });
  
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    const saved = localStorage.getItem(SORT_ORDER_KEY);
    return (saved === 'asc' || saved === 'desc') ? saved : 'desc';
  });
  
  const PAGE_SIZE = 12;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadRecipes = useCallback(async (
    pageNumber: number, 
    search?: string,
    sort?: { field: SortField; order: SortOrder }
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await recipeApi.list({
        skip: pageNumber * PAGE_SIZE,
        take: PAGE_SIZE,
        search,
        sortBy: sort?.field || sortField,
        sortOrder: sort?.order || sortOrder
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
  }, [sortField, sortOrder]);

  // Reset and load recipes when search or sort changes
  useEffect(() => {
    setPage(0);
    loadRecipes(0, debouncedSearch, { field: sortField, order: sortOrder });
  }, [debouncedSearch, sortField, sortOrder, loadRecipes]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadRecipes(nextPage, debouncedSearch, { field: sortField, order: sortOrder });
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  };

  const handleSortChange = (field: SortField, order: SortOrder) => {
    setSortField(field);
    setSortOrder(order);
    localStorage.setItem(SORT_FIELD_KEY, field);
    localStorage.setItem(SORT_ORDER_KEY, order);
  };

  const handleDelete = async (recipe: Recipe) => {
    try {
      await onRecipeDelete(recipe);
      // Remove the deleted recipe from the local state
      setRecipes(prev => prev.filter(r => r.id !== recipe.id));
    } catch (err) {
      console.error('Error deleting recipe:', err);
    }
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
      <div className={styles.toolbar}>
        <div className={styles.searchContainer}>
          <svg
            className={styles.searchIcon}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={handleSearchChange}
            aria-label="Search recipes"
          />
        </div>
        <div className={styles.toolbarActions}>
          <SortDropdown
            sortField={sortField}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
          />
          <ViewToggle
            viewMode={viewMode}
            onViewChange={handleViewChange}
          />
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className={styles.tableContainer}>
          <RecipeTableView
            recipes={recipes}
            sortField={sortField}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
            onRecipeClick={onRecipeClick}
            onRecipeEdit={onRecipeEdit}
            onRecipeDelete={handleDelete}
          />
        </div>
      ) : (
        <div className={styles.grid}>
          {recipes.map(recipe => (
            <div key={recipe.id} className={styles.gridItem}>
              <RecipeCard
                recipe={recipe}
                onEdit={() => onRecipeEdit(recipe)}
                onDelete={() => handleDelete(recipe)}
                onClick={() => onRecipeClick(recipe)}
              />
            </div>
          ))}
        </div>
      )}
      
      {loading && (
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          Loading recipes...
        </div>
      )}
      
      {!loading && hasMore && recipes.length > 0 && (
        <button
          onClick={handleLoadMore}
          className={styles.loadMoreButton}
        >
          Load More
        </button>
      )}
      
      {!loading && recipes.length === 0 && (
        <div className={styles.empty}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={styles.emptyIcon}
          >
            <path d="M3 3h18v18H3zM12 8v8M8 12h8" />
          </svg>
          <p>No recipes found</p>
          <span className={styles.emptyHint}>
            {searchQuery ? 'Try a different search term' : 'Create your first recipe to get started'}
          </span>
        </div>
      )}
    </div>
  );
};