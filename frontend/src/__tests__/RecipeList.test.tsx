/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, fireEvent, screen, waitFor, cleanup } from '@testing-library/react';
import { RecipeList } from '../components/recipes/RecipeList';
import { mockApi, createMockResponse } from '../setupTests';
import { Recipe } from '../types/recipe';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AxiosResponse } from 'axios';

interface RecipeListResponse {
  recipes: Recipe[];
  pagination: {
    skip: number;
    take: number;
    total: number;
  };
}

const mockRecipes: Recipe[] = [
  {
    id: '1',
    title: 'Recipe 1',
    ingredients: ['ingredient 1'],
    instructions: ['instructions 1'],
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: 'user-1'
  },
  {
    id: '2',
    title: 'Recipe 2',
    ingredients: ['ingredient 2'],
    instructions: ['instructions 2'],
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: 'user-1'
  }
];

type MockFn = jest.Mock & {
  mockResolvedValue: (value: any) => MockFn;
  mockResolvedValueOnce: (value: any) => MockFn;
  mockRejectedValue: (error: any) => MockFn;
  mockRejectedValueOnce: (error: any) => MockFn;
  mockReset: () => MockFn;
};

describe('RecipeList', () => {
  const mockHandlers = {
    onRecipeClick: jest.fn(),
    onRecipeEdit: jest.fn(),
    onRecipeDelete: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (mockApi.get as MockFn).mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('loads and displays recipes', async () => {
    const mockResponse: RecipeListResponse = {
      recipes: mockRecipes,
      pagination: {
        skip: 0,
        take: 12,
        total: 2
      }
    };

    (mockApi.get as MockFn).mockResolvedValueOnce(createMockResponse(mockResponse));

    render(
      <RecipeList
        onRecipeClick={mockHandlers.onRecipeClick}
        onRecipeEdit={mockHandlers.onRecipeEdit}
        onRecipeDelete={mockHandlers.onRecipeDelete}
      />
    );

    // Should show loading state initially
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Wait for recipes to load
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Should display recipes
    expect(screen.getByText('Recipe 1')).toBeInTheDocument();
    expect(screen.getByText('Recipe 2')).toBeInTheDocument();

    // Should have called the API
    expect(mockApi.get).toHaveBeenCalledWith('/api/recipes', {
      params: {
        search: '',
        skip: 0,
        take: 12
      }
    });
  });

  it('handles recipe click', async () => {
    const mockResponse: RecipeListResponse = {
      recipes: mockRecipes,
      pagination: {
        skip: 0,
        take: 12,
        total: 2
      }
    };

    (mockApi.get as MockFn).mockResolvedValueOnce(createMockResponse(mockResponse));

    render(
      <RecipeList
        onRecipeClick={mockHandlers.onRecipeClick}
        onRecipeEdit={mockHandlers.onRecipeEdit}
        onRecipeDelete={mockHandlers.onRecipeDelete}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Recipe 1'));
    expect(mockHandlers.onRecipeClick).toHaveBeenCalledWith(mockRecipes[0]);
  });

  it('handles recipe edit', async () => {
    const mockResponse: RecipeListResponse = {
      recipes: mockRecipes,
      pagination: {
        skip: 0,
        take: 12,
        total: 2
      }
    };

    (mockApi.get as MockFn).mockResolvedValueOnce(createMockResponse(mockResponse));

    render(
      <RecipeList
        onRecipeClick={mockHandlers.onRecipeClick}
        onRecipeEdit={mockHandlers.onRecipeEdit}
        onRecipeDelete={mockHandlers.onRecipeDelete}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);
    expect(mockHandlers.onRecipeEdit).toHaveBeenCalledWith(mockRecipes[0]);
  });

  it('handles recipe delete', async () => {
    window.confirm = jest.fn(() => true);

    const mockResponse: RecipeListResponse = {
      recipes: mockRecipes,
      pagination: {
        skip: 0,
        take: 12,
        total: 2
      }
    };

    (mockApi.get as MockFn).mockResolvedValueOnce(createMockResponse(mockResponse));

    render(
      <RecipeList
        onRecipeClick={mockHandlers.onRecipeClick}
        onRecipeEdit={mockHandlers.onRecipeEdit}
        onRecipeDelete={mockHandlers.onRecipeDelete}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);
    expect(window.confirm).toHaveBeenCalled();
    expect(mockHandlers.onRecipeDelete).toHaveBeenCalledWith(mockRecipes[0]);
  });

  it('handles pagination', async () => {
    // First page has exactly PAGE_SIZE items to trigger hasMore
    const firstPageRecipes = Array(12).fill(null).map((_, index) => ({
      ...mockRecipes[0],
      id: `page1-${index + 1}`
    }));
    const secondPageRecipes = [mockRecipes[1]];

    const firstResponse: RecipeListResponse = {
      recipes: firstPageRecipes,
      pagination: { skip: 0, take: 12, total: 13 }
    };

    const secondResponse: RecipeListResponse = {
      recipes: secondPageRecipes,
      pagination: { skip: 12, take: 12, total: 13 }
    };

    (mockApi.get as MockFn)
      .mockResolvedValueOnce(createMockResponse(firstResponse))
      .mockResolvedValueOnce(createMockResponse(secondResponse));

    render(
      <RecipeList
        onRecipeClick={mockHandlers.onRecipeClick}
        onRecipeEdit={mockHandlers.onRecipeEdit}
        onRecipeDelete={mockHandlers.onRecipeDelete}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Should only show first page initially
    expect(screen.getAllByText('Recipe 1')).toHaveLength(12);
    expect(screen.queryByText('Recipe 2')).not.toBeInTheDocument();

    // Click load more button
    fireEvent.click(screen.getByText('Load More'));

    // Should show loading state
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Wait for second page to load
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Should show both pages
    expect(screen.getAllByText('Recipe 1')).toHaveLength(12);
    expect(screen.getByText('Recipe 2')).toBeInTheDocument();

    // Should have called API twice with correct pagination
    expect(mockApi.get).toHaveBeenCalledTimes(2);
    expect(mockApi.get).toHaveBeenNthCalledWith(1, '/api/recipes', {
      params: { search: '', skip: 0, take: 12 }
    });
    expect(mockApi.get).toHaveBeenNthCalledWith(2, '/api/recipes', {
      params: { search: '', skip: 12, take: 12 }
    });
  });

  it('handles API error', async () => {
    const mockError = new Error('API Error');
    (mockApi.get as MockFn).mockRejectedValueOnce(mockError);

    render(
      <RecipeList
        onRecipeClick={mockHandlers.onRecipeClick}
        onRecipeEdit={mockHandlers.onRecipeEdit}
        onRecipeDelete={mockHandlers.onRecipeDelete}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Should show error message
    expect(screen.getByText('Failed to load recipes. Please try again.')).toBeInTheDocument();

    // Click retry button
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    // Should show loading state again
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // API should have been called twice (initial + retry)
    expect(mockApi.get).toHaveBeenCalledTimes(2);
  });

  it('shows empty state when no recipes', async () => {
    const mockResponse: RecipeListResponse = {
      recipes: [],
      pagination: { skip: 0, take: 12, total: 0 }
    };

    (mockApi.get as MockFn).mockResolvedValueOnce(createMockResponse(mockResponse));

    render(
      <RecipeList
        onRecipeClick={mockHandlers.onRecipeClick}
        onRecipeEdit={mockHandlers.onRecipeEdit}
        onRecipeDelete={mockHandlers.onRecipeDelete}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('No recipes found. Create your first recipe!')).toBeInTheDocument();
  });

  it('handles search functionality', async () => {
    const searchTerm = 'pasta';
    const searchResults: Recipe[] = [
      {
        id: 'recipe-3',
        title: 'Pasta Recipe',
        ingredients: ['pasta', 'sauce'],
        instructions: ['Cook pasta', 'Add sauce'],
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: 'user-1'
      }
    ];

    const initialResponse: RecipeListResponse = {
      recipes: mockRecipes,
      pagination: { skip: 0, take: 12, total: 2 }
    };

    const searchResponse: RecipeListResponse = {
      recipes: searchResults,
      pagination: { skip: 0, take: 12, total: 1 }
    };

    (mockApi.get as MockFn)
      .mockResolvedValueOnce(createMockResponse(initialResponse))
      .mockResolvedValueOnce(createMockResponse(searchResponse));

    render(
      <RecipeList
        onRecipeClick={mockHandlers.onRecipeClick}
        onRecipeEdit={mockHandlers.onRecipeEdit}
        onRecipeDelete={mockHandlers.onRecipeDelete}
      />
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Type in search input
    const searchInput = screen.getByPlaceholderText('Search recipes by title, description, or ingredients...');
    fireEvent.change(searchInput, { target: { value: searchTerm } });

    // Wait for debounced search
    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/api/recipes', {
        params: { search: searchTerm, skip: 0, take: 12 }
      });
    }, { timeout: 1000 });

    // Wait for loading state to disappear
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Verify search results
    await waitFor(() => {
      expect(screen.getByText('Pasta Recipe')).toBeInTheDocument();
    });
    expect(screen.queryByText('Recipe 1')).not.toBeInTheDocument();

  });

  it('shows empty state for no search results', async () => {
    const searchTerm = 'nonexistent recipe';
    const initialResponse: RecipeListResponse = {
      recipes: mockRecipes,
      pagination: { skip: 0, take: 12, total: 2 }
    };

    const emptySearchResponse: RecipeListResponse = {
      recipes: [],
      pagination: { skip: 0, take: 12, total: 0 }
    };

    (mockApi.get as MockFn)
      .mockResolvedValueOnce(createMockResponse(initialResponse))
      .mockResolvedValueOnce(createMockResponse(emptySearchResponse));

    render(
      <RecipeList
        onRecipeClick={mockHandlers.onRecipeClick}
        onRecipeEdit={mockHandlers.onRecipeEdit}
        onRecipeDelete={mockHandlers.onRecipeDelete}
      />
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Type in search input
    const searchInput = screen.getByPlaceholderText('Search recipes by title, description, or ingredients...');
    fireEvent.change(searchInput, { target: { value: searchTerm } });

    // Wait for debounced search
    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/api/recipes', {
        params: { search: searchTerm, skip: 0, take: 12 }
      });
    }, { timeout: 1000 });

    // Wait for loading state to disappear
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    
    // Wait for empty state to appear
    await waitFor(() => {
      expect(screen.getByText('No recipes found. Create your first recipe!')).toBeInTheDocument();
    });
  });
});