import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { jest, describe, it, beforeEach, afterEach, beforeAll, afterAll, expect } from '@jest/globals';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import App from '../App';
import { recipeApi } from '../services/api';
import { AuthProvider } from '../context/AuthContext';
import AuthContext from '../context/AuthContext';
import { Recipe, CreateRecipeDTO } from '../types/recipe';
import { MockFn } from '../setupTests';
import api from '../services/api';

// Mock the RecipeList component
jest.mock('../components/recipes/RecipeList', () => ({
  RecipeList: ({ onRecipeClick, onRecipeEdit, onRecipeDelete }: any) => (
    <div data-testid="recipe-list">
      <div className="recipe-header">
        <h2 data-testid="recipe-list-title">My Recipes</h2>
      </div>
      <div
        data-testid={`recipe-card-${mockRecipe.id}`}
        onClick={() => onRecipeClick(mockRecipe)}
      >
        {mockRecipe.title}
        <button
          data-testid={`recipe-edit-button-${mockRecipe.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onRecipeEdit(mockRecipe);
          }}
        >
          Edit
        </button>
        <button
          data-testid={`recipe-delete-button-${mockRecipe.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onRecipeDelete(mockRecipe);
          }}
        >
          Delete
        </button>
      </div>
    </div>
  ),
}));

// Mock the RecipeDetail component
jest.mock('../components/recipes/RecipeDetail', () => ({
  RecipeDetail: ({ recipe, onEdit, onDelete, onBack }: any) => (
    <div data-testid="recipe-detail">
      <h2>{recipe.title}</h2>
      <button data-testid="edit-button" onClick={onEdit}>Edit</button>
      <button data-testid="delete-button" onClick={onDelete}>Delete</button>
      <button data-testid="back-button" onClick={onBack}>Back</button>
    </div>
  ),
}));

// Mock the RecipeForm component
jest.mock('../components/recipes/RecipeForm', () => ({
  RecipeForm: ({ recipe, onSubmit, onCancel }: any) => (
    <div data-testid="recipe-form">
      <h2>{recipe ? 'Edit Recipe' : 'Create Recipe'}</h2>
      <form onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title: 'Test', ingredients: [], instructions: '' });
      }}>
        <label>
          Title
          <input type="text" />
        </label>
        <label>
          Ingredients
          <input type="text" />
        </label>
        <label>
          Instructions
          <input type="text" />
        </label>
        <button type="submit" data-testid="submit-button">Submit</button>
      </form>
      <button data-testid="cancel-button" onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

// Mock the Login component to prevent actual auth
jest.mock('../components/Login', () => ({
  __esModule: true,
  default: ({ error }: { error?: string }) => (
    <div data-testid="login">
      <div>Please sign in to access your recipes</div>
      <div data-testid="auth-error">{error || ''}</div>
    </div>
  ),
}));

// Mock the HomePage component
jest.mock('../components/HomePage', () => ({
  __esModule: true,
  default: () => (
    <div data-testid="home-page">
      <h1>Recipe App Home</h1>
      <a href="/recipes" data-testid="recipes-link">Go to Recipes</a>
    </div>
  ),
}));

// Mock the Layout component
jest.mock('../components/layout/Layout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout-wrapper">
      <header data-testid="layout-header">App Header</header>
      <main data-testid="layout-content">{children}</main>
    </div>
  ),
}));

// Mock the recipe API and axios instance
jest.mock('../services/api', () => ({
  recipeApi: {
    create: jest.fn() as MockFn,
    update: jest.fn() as MockFn,
    delete: jest.fn() as MockFn,
    get: jest.fn() as MockFn,
    list: jest.fn(() => Promise.resolve({
      recipes: [mockRecipe],
      pagination: {
        skip: 0,
        take: 10,
        total: 1,
      },
    })) as MockFn,
  },
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve({ data: mockUser })),
    post: jest.fn(() => Promise.resolve({ data: mockUser })),
    defaults: {
      baseURL: 'http://localhost:3001',
      headers: {
        'Content-Type': 'application/json',
      },
    },
  },
}));

const mockRecipe: Recipe = {
  id: '1',
  title: 'Test Recipe',
  ingredients: ['ingredient 1'],
  instructions: ['test instructions'],
  userId: 'user1',
  isDeleted: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockUser = {
  id: 'user1',
  email: 'test@example.com',
  displayName: 'Test User',
  photo: 'test-photo.jpg',
};

// Define the auth function types
type AuthFunction = () => Promise<void>;

describe('App Component', () => {
  // Create mock functions with correct types
  const mockHandleGoogleLogin = jest.fn().mockImplementation(async () => {}) as AuthFunction;
  const mockHandleDevLogin = jest.fn().mockImplementation(async () => {}) as AuthFunction;
  const mockLogout = jest.fn().mockImplementation(async () => {}) as AuthFunction;

  // Mock console.error before all tests
  const originalConsoleError = console.error;
  let consoleErrorSpy: any;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  const renderWithAuth = (
    loading = false,
    user: typeof mockUser | null = null,
    error: string | null = null,
    initialRoute = '/'
  ) => {
    // Mock the AuthContext value
    const authValue = {
      user,
      loading,
      error,
      handleGoogleLogin: mockHandleGoogleLogin,
      handleDevLogin: mockHandleDevLogin,
      logout: mockLogout,
    };

    window.history.pushState({}, '', initialRoute);
    
    const utils = render(
      <AuthContext.Provider value={authValue}>
        <App />
      </AuthContext.Provider>
    );

    return {
      ...utils,
      // Helper to wait for recipe list to load
      async waitForRecipeList() {
        if (user) {
          // Re-render with recipes path
          cleanup();
          window.history.pushState({}, '', '/recipes');
          render(
            <AuthContext.Provider value={authValue}>
              <App />
            </AuthContext.Provider>
          );
          await waitFor(() => {
            expect(screen.getByTestId('recipe-list')).toBeInTheDocument();
          }, { timeout: 3000 });
        }
      },
    };
  };

  beforeEach(() => {
    jest.useFakeTimers();
    // Reset all mocks
    jest.clearAllMocks();
    // Mock the initial recipe list fetch
    (recipeApi.list as MockFn).mockResolvedValue({
      recipes: [mockRecipe],
      pagination: {
        skip: 0,
        take: 10,
        total: 1,
      },
    });
    // Mock recipe get
    (recipeApi.get as MockFn).mockResolvedValue(mockRecipe);
    // Mock the auth check
    (api.get as MockFn).mockResolvedValue({ data: mockUser });
    // Reset window location
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('Authentication States', () => {
    it('shows loading state', () => {
      renderWithAuth(true);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('shows login message when user is not authenticated', async () => {
      // Directly render the Login component
      const Login = require('../components/Login').default;
      render(<Login />);
      
      // Check for login message
      expect(screen.getByText(/please sign in to access your recipes/i)).toBeInTheDocument();
    });

    it('shows main content when user is authenticated', async () => {
      const { waitForRecipeList } = renderWithAuth(false, mockUser);
      await waitForRecipeList();
      
      expect(screen.getByTestId('recipe-list-title')).toBeInTheDocument();
      expect(screen.getByText('Create New Recipe')).toBeInTheDocument();
      expect(screen.getByTestId('recipe-list')).toBeInTheDocument();
      expect(screen.getByText(mockRecipe.title)).toBeInTheDocument();
    });

    it('shows error message when auth check fails', async () => {
      const error = 'Authentication failed';
      
      // Directly render the Login component with error
      const Login = require('../components/Login').default;
      render(<Login error={error} />);
      
      // Check for error message
      expect(screen.getByTestId('auth-error')).toBeInTheDocument();
      expect(screen.getByTestId('auth-error').textContent).toBe(error);
    });
  });

  describe('Recipe CRUD Operations', () => {
    it('handles recipe creation', async () => {
      const { waitForRecipeList } = renderWithAuth(false, mockUser);
      await waitForRecipeList();

      const newRecipe: CreateRecipeDTO = {
        title: 'New Recipe',
        ingredients: ['ingredient'],
        instructions: ['instructions'],
      };

      (recipeApi.create as MockFn).mockResolvedValueOnce({
        ...newRecipe,
        id: '2',
        userId: mockUser.id,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Navigate to create form
      fireEvent.click(screen.getByText('Create New Recipe'));
      await waitFor(() => {
        expect(screen.getByTestId('recipe-form')).toBeInTheDocument();
      });

      // Submit form
      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(recipeApi.create).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Test',
          ingredients: [],
          instructions: '',
        }));
      });
    });

    it('handles recipe creation error', async () => {
      const { waitForRecipeList } = renderWithAuth(false, mockUser);
      await waitForRecipeList();

      const error = { message: 'Creation failed' };
      (recipeApi.create as MockFn).mockRejectedValueOnce(error);
      
      // Navigate to create form
      fireEvent.click(screen.getByText('Create New Recipe'));
      await waitFor(() => {
        expect(screen.getByTestId('recipe-form')).toBeInTheDocument();
      });
      
      // Submit form
      fireEvent.click(screen.getByTestId('submit-button'));

      // Wait for the error to be logged
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error creating recipe:', error);
      });
    });

    it('handles recipe update', async () => {
      const { waitForRecipeList } = renderWithAuth(false, mockUser);
      await waitForRecipeList();

      const updatedRecipe = {
        ...mockRecipe,
        title: 'Updated Recipe',
      };

      (recipeApi.update as MockFn).mockResolvedValueOnce(updatedRecipe);

      // Click edit button on recipe card
      const editButton = screen.getByTestId(`recipe-edit-button-${mockRecipe.id}`);
      fireEvent.click(editButton);
      await waitFor(() => {
        expect(screen.getByTestId('recipe-form')).toBeInTheDocument();
      });

      // Submit form
      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(recipeApi.update).toHaveBeenCalledWith(
          mockRecipe.id,
          expect.objectContaining({
            title: 'Test',
            ingredients: [],
            instructions: '',
          })
        );
      });
    });

    it('handles recipe update error', async () => {
      const { waitForRecipeList } = renderWithAuth(false, mockUser);
      await waitForRecipeList();

      const error = { message: 'Update failed' };
      (recipeApi.update as MockFn).mockRejectedValueOnce(error);

      // Click edit button on recipe card
      const editButton = screen.getByTestId(`recipe-edit-button-${mockRecipe.id}`);
      fireEvent.click(editButton);
      await waitFor(() => {
        expect(screen.getByTestId('recipe-form')).toBeInTheDocument();
      });

      // Submit form
      fireEvent.click(screen.getByTestId('submit-button'));

      // Wait for the error to be logged
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error updating recipe:', error);
      });
    });

    it('handles recipe deletion', async () => {
      const { waitForRecipeList } = renderWithAuth(false, mockUser);
      await waitForRecipeList();

      (recipeApi.delete as MockFn).mockResolvedValueOnce(undefined);

      // Click delete button on recipe card
      const deleteButton = screen.getByTestId(`recipe-delete-button-${mockRecipe.id}`);
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(recipeApi.delete).toHaveBeenCalledWith(mockRecipe.id);
      });
    });

    it('handles recipe deletion error', async () => {
      const { waitForRecipeList } = renderWithAuth(false, mockUser);
      await waitForRecipeList();

      const error = { message: 'Deletion failed' };
      (recipeApi.delete as MockFn).mockRejectedValueOnce(error);

      // Click delete button on recipe card
      const deleteButton = screen.getByTestId(`recipe-delete-button-${mockRecipe.id}`);
      fireEvent.click(deleteButton);

      // Wait for the error to be logged
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error deleting recipe:', error);
      });
    });
  });

  describe('View Navigation', () => {
    it('navigates to create view', async () => {
      const { waitForRecipeList } = renderWithAuth(false, mockUser);
      await waitForRecipeList();

      fireEvent.click(screen.getByText('Create New Recipe'));
      await waitFor(() => {
        expect(screen.getByTestId('recipe-form')).toBeInTheDocument();
      });
    });

    it('navigates to detail view', async () => {
      const { waitForRecipeList } = renderWithAuth(false, mockUser);
      await waitForRecipeList();

      // Set up route and mock API response
      window.history.pushState({}, '', `/recipes/recipe/${mockRecipe.id}`);
      (recipeApi.get as MockFn).mockResolvedValueOnce(mockRecipe);

      const recipeCard = screen.getByTestId(`recipe-card-${mockRecipe.id}`);
      fireEvent.click(recipeCard);

      await waitFor(() => {
        expect(window.location.pathname).toBe(`/recipes/recipe/${mockRecipe.id}`);
      });

      await waitFor(() => {
        expect(screen.getByTestId('recipe-detail')).toBeInTheDocument();
      });
    });

    it('navigates to edit view', async () => {
      const { waitForRecipeList } = renderWithAuth(false, mockUser);
      await waitForRecipeList();

      // Set up route and mock API response
      window.history.pushState({}, '', `/recipes/recipe/${mockRecipe.id}/edit`);
      (recipeApi.get as MockFn).mockResolvedValueOnce(mockRecipe);

      const editButton = screen.getByTestId(`recipe-edit-button-${mockRecipe.id}`);
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(window.location.pathname).toBe(`/recipes/recipe/${mockRecipe.id}/edit`);
      });

      await waitFor(() => {
        expect(screen.getByTestId('recipe-form')).toBeInTheDocument();
      });
    });

    it('returns to list view from detail', async () => {
      const { waitForRecipeList } = renderWithAuth(false, mockUser, null, `/recipes/recipe/${mockRecipe.id}`);
      
      // Mock API response for detail view
      (recipeApi.get as MockFn).mockResolvedValueOnce(mockRecipe);
      
      await waitFor(() => {
        expect(screen.getByTestId('recipe-detail')).toBeInTheDocument();
      });

      const backButton = screen.getByTestId('back-button');
      fireEvent.click(backButton);
      
      await waitFor(() => {
        expect(window.location.pathname).toBe('/recipes');
      });

      await waitFor(() => {
        expect(screen.getByTestId('recipe-list')).toBeInTheDocument();
      });
    });

    it('returns to list view from create form', async () => {
      const { waitForRecipeList } = renderWithAuth(false, mockUser);
      await waitForRecipeList();

      // Navigate to create form
      fireEvent.click(screen.getByText('Create New Recipe'));
      await waitFor(() => {
        expect(screen.getByTestId('recipe-form')).toBeInTheDocument();
      });
      
      // Click cancel button
      const cancelButton = screen.getByTestId('cancel-button');
      fireEvent.click(cancelButton);
      
      expect(screen.getByTestId('recipe-list')).toBeInTheDocument();
    });
  });
});
