import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { RecipeForm } from '../components/RecipeForm';
import { recipeApi } from '../services/api';
import { Recipe, CreateRecipeDTO } from '../types/recipe';

// Define prop types from RecipeForm component
type SubmitHandler = (data: CreateRecipeDTO) => Promise<void>;
type CancelHandler = () => void;

// Mock the API
jest.mock('../services/api', () => ({
  recipeApi: {
    extractFromUrl: jest.fn() as jest.MockedFunction<typeof recipeApi.extractFromUrl>,
  }
}));

describe('RecipeForm URL Import Tests', () => {
  const mockSubmit = jest.fn() as jest.MockedFunction<SubmitHandler>;
  const mockCancel = jest.fn() as jest.MockedFunction<CancelHandler>;

  const mockImportedRecipe: CreateRecipeDTO = {
    title: 'Imported Recipe',
    description: 'Imported description',
    ingredients: ['Imported ingredient 1', 'Imported ingredient 2'],
    instructions: 'Imported instructions',
    servings: 4,
    prepTime: 30,
    cookTime: 45,
    imageUrl: 'https://example.com/image.jpg'
  };

  const mockExistingRecipe: Recipe = {
    ...mockImportedRecipe,
    id: 'recipe-1',
    userId: 'user-1',
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows import button only in create mode', () => {
    // Render in create mode
    const { rerender } = render(
      <RecipeForm
        onSubmit={mockSubmit}
        onCancel={mockCancel}
      />
    );

    // Import button should be visible in create mode
    expect(screen.getByRole('button', { name: /import from url/i })).toBeInTheDocument();

    // Render in edit mode
    rerender(
      <RecipeForm
        recipe={mockExistingRecipe}
        onSubmit={mockSubmit}
        onCancel={mockCancel}
      />
    );

    // Import button should not be visible in edit mode
    expect(screen.queryByRole('button', { name: /import from url/i })).not.toBeInTheDocument();
  });

  it('opens URL import modal when import button is clicked', async () => {
    render(
      <RecipeForm
        onSubmit={mockSubmit}
        onCancel={mockCancel}
      />
    );

    // Click import button
    const importButton = screen.getByRole('button', { name: /import from url/i });
    await userEvent.click(importButton);

    // Verify modal is shown
    expect(screen.getByText('Import Recipe from URL')).toBeInTheDocument();
    expect(screen.getByLabelText('Recipe URL')).toBeInTheDocument();
  });

  it('populates form with imported recipe data', async () => {
    // Mock successful recipe extraction
    (recipeApi.extractFromUrl as jest.MockedFunction<typeof recipeApi.extractFromUrl>)
      .mockResolvedValueOnce(mockImportedRecipe);

    render(
      <RecipeForm
        onSubmit={mockSubmit}
        onCancel={mockCancel}
      />
    );

    // Open import modal
    await userEvent.click(screen.getByRole('button', { name: /import from url/i }));

    // Enter URL and submit
    const urlInput = screen.getByLabelText('Recipe URL');
    await userEvent.type(urlInput, 'https://example.com/recipe');
    await userEvent.click(screen.getByRole('button', { name: 'Import Recipe' }));

    // Verify form is populated with imported data
    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toHaveValue(mockImportedRecipe.title);
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/description/i)).toHaveValue(mockImportedRecipe.description);
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/instructions/i)).toHaveValue(mockImportedRecipe.instructions);
    });

    // Verify numeric fields - convert to numbers since input type="number"
    const servingsInput = screen.getByLabelText(/servings/i);
    const prepTimeInput = screen.getByLabelText(/prep time/i);
    const cookTimeInput = screen.getByLabelText(/cook time/i);

    expect(Number(servingsInput.getAttribute('value'))).toBe(mockImportedRecipe.servings);
    expect(Number(prepTimeInput.getAttribute('value'))).toBe(mockImportedRecipe.prepTime);
    expect(Number(cookTimeInput.getAttribute('value'))).toBe(mockImportedRecipe.cookTime);

    // Verify ingredients
    mockImportedRecipe.ingredients.forEach(ingredient => {
      expect(screen.getByDisplayValue(ingredient)).toBeInTheDocument();
    });

    // Verify image URL
    expect(screen.getByLabelText(/image url/i)).toHaveValue(mockImportedRecipe.imageUrl);
  });

  it('handles import errors', async () => {
    const errorMessage = 'Failed to import recipe';
    (recipeApi.extractFromUrl as jest.MockedFunction<typeof recipeApi.extractFromUrl>)
      .mockRejectedValueOnce(new Error(errorMessage));

    render(
      <RecipeForm
        onSubmit={mockSubmit}
        onCancel={mockCancel}
      />
    );

    // Open import modal
    await userEvent.click(screen.getByRole('button', { name: /import from url/i }));

    // Enter URL and submit
    const urlInput = screen.getByLabelText('Recipe URL');
    await userEvent.type(urlInput, 'https://example.com/recipe');
    await userEvent.click(screen.getByRole('button', { name: 'Import Recipe' }));

    // Verify error message is shown
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('preserves form data when import is cancelled', async () => {
    render(
      <RecipeForm
        onSubmit={mockSubmit}
        onCancel={mockCancel}
      />
    );

    // Fill form with initial data
    const titleInput = screen.getByLabelText(/title/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    await userEvent.type(titleInput, 'Initial Title');
    await userEvent.type(descriptionInput, 'Initial Description');

    // Open import modal
    await userEvent.click(screen.getByRole('button', { name: /import from url/i }));

    // Find the modal's cancel button - it's the one next to the Import Recipe button
    const importButton = screen.getByRole('button', { name: 'Import Recipe' });
    const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' });
    const modalCancelButton = cancelButtons.find(button => 
      button.compareDocumentPosition(importButton) & Node.DOCUMENT_POSITION_FOLLOWING
    );
    if (!modalCancelButton) {
      throw new Error('Modal cancel button not found');
    }
    await userEvent.click(modalCancelButton);

    // Verify form data is preserved
    expect(titleInput).toHaveValue('Initial Title');
    expect(descriptionInput).toHaveValue('Initial Description');
  });
});