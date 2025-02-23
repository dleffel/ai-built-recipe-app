import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { RecipeForm } from '../components/RecipeForm';
import { Recipe, CreateRecipeDTO } from '../types/recipe';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockRecipe: Recipe = {
  id: '1',
  title: 'Test Recipe',
  description: 'Test description',
  ingredients: ['ingredient 1', 'ingredient 2'],
  instructions: ['Step 1', 'Step 2'],
  servings: 4,
  prepTime: 30,
  cookTime: 45,
  imageUrl: 'https://example.com/image.jpg',
  isDeleted: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date(Date.now() + 1000).toISOString(),
  userId: 'user-1'
};

type SubmitFn = (data: CreateRecipeDTO) => Promise<void>;

describe('RecipeForm', () => {
  const mockSubmit = jest.fn(() => Promise.resolve());
  const mockCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form fields correctly', () => {
    render(
      <RecipeForm
        onSubmit={mockSubmit}
        onCancel={mockCancel}
      />
    );

    // Check for required fields
    expect(screen.getByLabelText(/title \*/i)).toBeInTheDocument();
    expect(screen.getByText(/ingredients \*/i)).toBeInTheDocument();
    expect(screen.getByText(/instructions \*/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/step 1/i)).toBeInTheDocument();

    // Check for optional fields
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/servings/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/prep time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cook time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/image url/i)).toBeInTheDocument();
  });

  it('validates required fields using HTML5 validation', async () => {
    render(
      <RecipeForm
        onSubmit={mockSubmit}
        onCancel={mockCancel}
      />
    );

    // Verify required fields have required attribute
    expect(screen.getByLabelText(/title \*/i)).toHaveAttribute('required');
    expect(screen.getByPlaceholderText(/step 1/i)).toHaveAttribute('required');
    expect(screen.getByPlaceholderText(/enter an ingredient/i)).toHaveAttribute('required');

    // Submit empty form - mockSubmit should not be called due to HTML5 validation
    fireEvent.click(screen.getByRole('button', { name: /create recipe/i }));
    expect(mockSubmit).not.toHaveBeenCalled();

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/title \*/i), { target: { value: 'Test Recipe' } });
    await waitFor(() => {
      expect(screen.getByLabelText(/title \*/i)).toHaveValue('Test Recipe');
    });

    fireEvent.change(screen.getByPlaceholderText(/step 1/i), { target: { value: 'Test Instructions' } });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/step 1/i)).toHaveValue('Test Instructions');
    });

    fireEvent.change(screen.getByPlaceholderText(/enter an ingredient/i), { target: { value: 'Test Ingredient' } });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/enter an ingredient/i)).toHaveValue('Test Ingredient');
    });

    // Submit form with required fields filled
    fireEvent.click(screen.getByRole('button', { name: /create recipe/i }));

    // Verify form submits with correct data
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Test Recipe',
        instructions: ['Test Instructions'],
        ingredients: ['Test Ingredient']
      }));
    });
  });

  it('handles ingredient management', async () => {
    render(
      <RecipeForm
        onSubmit={mockSubmit}
        onCancel={mockCancel}
      />
    );

    // Initial state should have one empty ingredient field
    const ingredientInputs = screen.getAllByPlaceholderText(/enter an ingredient/i);
    expect(ingredientInputs).toHaveLength(1);

    // Remove button should be disabled when only one ingredient
    const initialRemoveButtons = screen.getAllByRole('button', { name: /remove/i });
    expect(initialRemoveButtons[0]).toHaveAttribute('disabled');

    // Add another ingredient
    fireEvent.click(screen.getByRole('button', { name: /add ingredient/i }));
    
    // Verify new ingredient field is added
    await waitFor(() => {
      expect(screen.getAllByPlaceholderText(/enter an ingredient/i)).toHaveLength(2);
    });
    
    // Verify remove button is enabled
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /remove/i })[0]).not.toHaveAttribute('disabled');
    });

    // Remove an ingredient
    fireEvent.click(screen.getAllByRole('button', { name: /remove/i })[0]);
    
    // Verify ingredient field is removed
    await waitFor(() => {
      expect(screen.getAllByPlaceholderText(/enter an ingredient/i)).toHaveLength(1);
    });
    
    // Verify remove button is disabled
    const allRemoveButtons = screen.getAllByRole('button', { name: /remove/i });
    expect(allRemoveButtons).toHaveLength(2); // One for ingredients, one for instructions
    expect(allRemoveButtons[0]).toHaveAttribute('disabled');
    expect(allRemoveButtons[1]).toHaveAttribute('disabled');
  });

  it('handles form submission with trimmed values', async () => {
    render(
      <RecipeForm
        onSubmit={mockSubmit}
        onCancel={mockCancel}
      />
    );

    // Fill out form with whitespace - values should be preserved in inputs
    const titleInput = screen.getByLabelText(/title/i);
    const ingredientInput = screen.getByPlaceholderText(/enter an ingredient/i);
    const instructionsInput = screen.getByPlaceholderText(/step 1/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const imageUrlInput = screen.getByLabelText(/image url/i);

    // Set and verify text input values with whitespace
    fireEvent.change(titleInput, { target: { value: '  Test Recipe  ' } });
    fireEvent.change(ingredientInput, { target: { value: '  Test Ingredient  ' } });
    fireEvent.change(instructionsInput, { target: { value: '  Test Instructions  ' } });
    fireEvent.change(descriptionInput, { target: { value: '  Test Description  ' } });

    // Verify text input values preserve whitespace
    expect(titleInput).toHaveValue('  Test Recipe  ');
    expect(ingredientInput).toHaveValue('  Test Ingredient  ');
    expect(instructionsInput).toHaveValue('  Test Instructions  ');
    expect(descriptionInput).toHaveValue('  Test Description  ');

    // Set and verify URL input - browser may normalize the URL
    fireEvent.change(imageUrlInput, { target: { value: '  https://example.com/image.jpg  ' } });
    expect(imageUrlInput).toHaveValue('https://example.com/image.jpg');

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /create recipe/i }));

    // Verify submission with trimmed values
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        title: 'Test Recipe',
        ingredients: ['Test Ingredient'], // Component trims ingredients
        instructions: ['Test Instructions'], // Component trims instructions
        description: 'Test Description',
        servings: undefined,
        prepTime: undefined,
        cookTime: undefined,
        imageUrl: 'https://example.com/image.jpg'
      });
    });
  });

  it('handles numeric field validation', async () => {
    render(
      <RecipeForm
        onSubmit={mockSubmit}
        onCancel={mockCancel}
      />
    );

    // Get all form inputs
    const titleInput = screen.getByLabelText(/title/i);
    const ingredientInput = screen.getByPlaceholderText(/enter an ingredient/i);
    const instructionsInput = screen.getByPlaceholderText(/step 1/i);
    const servingsInput = screen.getByLabelText(/servings/i);
    const prepTimeInput = screen.getByLabelText(/prep time/i);
    const cookTimeInput = screen.getByLabelText(/cook time/i);

    // Fill text fields
    fireEvent.change(titleInput, { target: { value: 'Test Recipe' } });
    await waitFor(() => {
      expect(titleInput).toHaveValue('Test Recipe');
    });

    fireEvent.change(ingredientInput, { target: { value: 'Test Ingredient' } });
    await waitFor(() => {
      expect(ingredientInput).toHaveValue('Test Ingredient');
    });

    fireEvent.change(instructionsInput, { target: { value: 'Test Instructions' } });
    await waitFor(() => {
      expect(instructionsInput).toHaveValue('Test Instructions');
    });

    // Fill numeric fields - browser converts string values to numbers for type="number" inputs
    fireEvent.change(servingsInput, { target: { value: '2' } });
    expect(servingsInput).toHaveValue(2); // Browser converts to number

    fireEvent.change(prepTimeInput, { target: { value: '30' } });
    expect(prepTimeInput).toHaveValue(30); // Browser converts to number

    fireEvent.change(cookTimeInput, { target: { value: '45' } });
    expect(cookTimeInput).toHaveValue(45); // Browser converts to number

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /create recipe/i }));

    // Verify form submission
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        title: 'Test Recipe',
        ingredients: ['Test Ingredient'],
        instructions: ['Test Instructions'],
        description: undefined,
        servings: 2,
        prepTime: 30,
        cookTime: 45,
        imageUrl: undefined
      });
    });
  });

  it('disables submit and cancel buttons during submission', async () => {
    // Create a mock that doesn't resolve immediately
    const mockDelayedSubmit = jest.fn(
      () => new Promise(resolve => setTimeout(resolve, 100))
    ) as unknown as SubmitFn;

    render(
      <RecipeForm
        onSubmit={mockDelayedSubmit}
        onCancel={mockCancel}
      />
    );

    // Fill out form
    const titleInput = screen.getByLabelText(/title/i);
    const ingredientInput = screen.getByPlaceholderText(/enter an ingredient/i);
    const instructionsInput = screen.getByPlaceholderText(/step 1/i);

    // Fill required fields
    fireEvent.change(titleInput, { target: { value: 'Test Recipe' } });
    await waitFor(() => {
      expect(titleInput).toHaveValue('Test Recipe');
    });

    fireEvent.change(ingredientInput, { target: { value: 'Test Ingredient' } });
    await waitFor(() => {
      expect(ingredientInput).toHaveValue('Test Ingredient');
    });

    fireEvent.change(instructionsInput, { target: { value: 'Test Instructions' } });
    await waitFor(() => {
      expect(instructionsInput).toHaveValue('Test Instructions');
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /create recipe/i }));

    // Verify submit button is disabled during submission
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    });

    // Verify cancel button is disabled during submission
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    // Wait for submit button to be enabled after completion
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create recipe/i })).not.toBeDisabled();
    });

    // Wait for cancel button to be enabled after completion
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).not.toBeDisabled();
    });
  });

  it('handles edit mode', async () => {
    render(
      <RecipeForm
        recipe={mockRecipe}
        onSubmit={mockSubmit}
        onCancel={mockCancel}
      />
    );

    // Wait for and verify form is populated with recipe data
    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toHaveValue(mockRecipe.title);
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/description/i)).toHaveValue(mockRecipe.description);
    });

    await waitFor(() => {
      const instructionInputs = screen.getAllByPlaceholderText(/step \d+/i);
      mockRecipe.instructions.forEach((instruction, index) => {
        expect(instructionInputs[index]).toHaveValue(instruction);
      });
    });

    // Verify numeric fields - browser converts values to numbers for type="number" inputs
    const servingsInput = screen.getByLabelText(/servings/i);
    const prepTimeInput = screen.getByLabelText(/prep time/i);
    const cookTimeInput = screen.getByLabelText(/cook time/i);

    // Browser automatically converts numeric input values to numbers
    expect(servingsInput).toHaveValue(mockRecipe.servings);
    expect(prepTimeInput).toHaveValue(mockRecipe.prepTime);
    expect(cookTimeInput).toHaveValue(mockRecipe.cookTime);

    await waitFor(() => {
      expect(screen.getByLabelText(/image url/i)).toHaveValue(mockRecipe.imageUrl);
    });

    // Verify submit button text
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /update recipe/i })).toBeInTheDocument();
    });
  });

  it('handles cancellation', async () => {
    render(
      <RecipeForm
        onSubmit={mockSubmit}
        onCancel={mockCancel}
      />
    );

    // Click cancel button
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    // Verify cancel callback was called
    expect(mockCancel).toHaveBeenCalled();
  });
});