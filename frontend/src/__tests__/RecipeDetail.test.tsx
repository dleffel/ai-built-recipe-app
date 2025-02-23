import '@testing-library/jest-dom';
import React from 'react';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom/extend-expect';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecipeDetail } from '../components/RecipeDetail';
import { Recipe } from '../types/recipe';

const mockRecipe: Recipe = {
  id: '1',
  title: 'Test Recipe',
  description: 'Test description',
  ingredients: ['ingredient 1', 'ingredient 2'],
  instructions: ['Step 1', 'Step 2', 'Step 3'],
  servings: 4,
  prepTime: 30,
  cookTime: 45,
  imageUrl: 'https://example.com/image.jpg',
  isDeleted: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date(Date.now() + 1000).toISOString(), // Make sure updatedAt is after createdAt
  userId: 'user-1'
};

describe('RecipeDetail', () => {
  const mockHandlers = {
    onBack: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
  });

  it('renders recipe information correctly', () => {
    render(
      <RecipeDetail
        recipe={mockRecipe}
        onBack={mockHandlers.onBack}
        onEdit={mockHandlers.onEdit}
        onDelete={mockHandlers.onDelete}
      />
    );

    // Check basic info
    expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByAltText('Test Recipe')).toHaveAttribute('src', 'https://example.com/image.jpg');

    // Check metadata section
    expect(screen.getByText('Servings:')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Prep Time:')).toBeInTheDocument();
    expect(screen.getByText(/30.*minutes/)).toBeInTheDocument();
    expect(screen.getByText('Cook Time:')).toBeInTheDocument();
    expect(screen.getByText(/45.*minutes/)).toBeInTheDocument();
    expect(screen.getByText('Total Time:')).toBeInTheDocument();
    expect(screen.getByText(/75.*minutes/)).toBeInTheDocument();

    // Check ingredients
    expect(screen.getByText('Ingredients')).toBeInTheDocument();
    expect(screen.getByText('ingredient 1')).toBeInTheDocument();
    expect(screen.getByText('ingredient 2')).toBeInTheDocument();

    // Check instructions
    expect(screen.getByText('Instructions')).toBeInTheDocument();
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();

    // Check dates
    expect(screen.getByText(/Created:/)).toBeInTheDocument();
    expect(screen.getByText(/Updated:/)).toBeInTheDocument();
  });

  it('handles back button click', () => {
    render(
      <RecipeDetail
        recipe={mockRecipe}
        onBack={mockHandlers.onBack}
        onEdit={mockHandlers.onEdit}
        onDelete={mockHandlers.onDelete}
      />
    );

    fireEvent.click(screen.getByText(/back to recipes/i));
    expect(mockHandlers.onBack).toHaveBeenCalled();
  });

  it('handles edit button click', () => {
    render(
      <RecipeDetail
        recipe={mockRecipe}
        onBack={mockHandlers.onBack}
        onEdit={() => mockHandlers.onEdit(mockRecipe)}
        onDelete={mockHandlers.onDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /edit recipe/i }));
    expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockRecipe);
  });

  it('handles delete button click', () => {
    render(
      <RecipeDetail
        recipe={mockRecipe}
        onBack={mockHandlers.onBack}
        onEdit={mockHandlers.onEdit}
        onDelete={() => mockHandlers.onDelete(mockRecipe)}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /delete recipe/i }));
    expect(window.confirm).toHaveBeenCalled();
    expect(mockHandlers.onDelete).toHaveBeenCalledWith(mockRecipe);
  });

  it('shows only created date when updated date is the same', () => {
    const recipe = {
      ...mockRecipe,
      updatedAt: mockRecipe.createdAt // Same as created date
    };

    render(
      <RecipeDetail
        recipe={recipe}
        onBack={mockHandlers.onBack}
        onEdit={mockHandlers.onEdit}
        onDelete={mockHandlers.onDelete}
      />
    );

    expect(screen.getByText(/created:/i)).toBeInTheDocument();
    expect(screen.queryByText(/updated:/i)).not.toBeInTheDocument();
  });
});