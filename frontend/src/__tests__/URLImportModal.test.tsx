import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { URLImportModal } from '../components/recipes/URLImportModal';
import { CreateRecipeDTO } from '../types/recipe';

describe('URLImportModal Tests', () => {
  const mockOnImport = jest.fn() as jest.MockedFunction<(url: string) => Promise<CreateRecipeDTO>>;
  const mockOnClose = jest.fn() as jest.MockedFunction<() => void>;
  const mockOnSuccess = jest.fn() as jest.MockedFunction<(recipe: CreateRecipeDTO) => void>;

  const mockRecipe: CreateRecipeDTO = {
    title: 'Test Recipe',
    description: 'Test Description',
    ingredients: ['Ingredient 1', 'Ingredient 2'],
    instructions: ['Test Instructions'],
    servings: 4,
    prepTime: 30,
    cookTime: 45
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(
      <URLImportModal
        onImport={mockOnImport}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Verify all required elements are present
    const titleElement = screen.getByText('Import Recipe from URL');
    const urlInput = screen.getByLabelText('Recipe URL');
    const importButton = screen.getByRole('button', { name: 'Import Recipe' });
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });

    expect(titleElement).toBeInTheDocument();
    expect(urlInput).toBeInTheDocument();
    expect(importButton).toBeInTheDocument();
    expect(cancelButton).toBeInTheDocument();
  });

  it('handles URL input correctly', async () => {
    render(
      <URLImportModal
        onImport={mockOnImport}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const testUrl = 'https://example.com/recipe';
    const input = screen.getByLabelText('Recipe URL');
    await userEvent.type(input, testUrl);

    expect(input).toHaveValue(testUrl);
  });

  it('validates empty URL submission', async () => {
    render(
      <URLImportModal
        onImport={mockOnImport}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const submitButton = screen.getByRole('button', { name: 'Import Recipe' });
    await userEvent.click(submitButton);

    // Check for HTML5 validation message
    const urlInput = screen.getByLabelText('Recipe URL');
    expect(urlInput).toBeInvalid();
    expect(mockOnImport).not.toHaveBeenCalled();
  });

  it('handles successful recipe import', async () => {
    mockOnImport.mockResolvedValueOnce(mockRecipe);

    render(
      <URLImportModal
        onImport={mockOnImport}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const input = screen.getByLabelText('Recipe URL');
    const submitButton = screen.getByRole('button', { name: 'Import Recipe' });
    
    await userEvent.type(input, 'https://example.com/recipe');
    await userEvent.click(submitButton);

    // Verify onImport was called with correct URL
    await waitFor(() => {
      expect(mockOnImport).toHaveBeenCalledWith('https://example.com/recipe');
    });

    // Verify onSuccess was called with recipe data
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(mockRecipe);
    });
  });

  it('handles import failure', async () => {
    const errorMessage = 'Failed to import recipe';
    mockOnImport.mockRejectedValueOnce(new Error(errorMessage));

    render(
      <URLImportModal
        onImport={mockOnImport}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const input = screen.getByLabelText('Recipe URL');
    const submitButton = screen.getByRole('button', { name: 'Import Recipe' });
    
    await userEvent.type(input, 'https://example.com/recipe');
    await userEvent.click(submitButton);

    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    // Verify success callback was not called
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('displays loading state during import', async () => {
    mockOnImport.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <URLImportModal
        onImport={mockOnImport}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const input = screen.getByLabelText('Recipe URL');
    const submitButton = screen.getByRole('button', { name: 'Import Recipe' });
    
    await userEvent.type(input, 'https://example.com/recipe');
    await userEvent.click(submitButton);

    // Verify loading state
    const loadingButton = screen.getByRole('button', { name: 'Importing...' });
    expect(loadingButton).toBeInTheDocument();
    expect(loadingButton).toBeDisabled();
  });

  it('handles modal close', async () => {
    render(
      <URLImportModal
        onImport={mockOnImport}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const closeButton = screen.getByRole('button', { name: 'Cancel' });
    await userEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('disables all controls during import', async () => {
    mockOnImport.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <URLImportModal
        onImport={mockOnImport}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const input = screen.getByLabelText('Recipe URL');
    const submitButton = screen.getByRole('button', { name: 'Import Recipe' });
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });

    await userEvent.type(input, 'https://example.com/recipe');
    await userEvent.click(submitButton);

    // Verify all controls are disabled during import
    await waitFor(() => {
      expect(input).toBeDisabled();
    });
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
    await waitFor(() => {
      expect(cancelButton).toBeDisabled();
    });
  });
});