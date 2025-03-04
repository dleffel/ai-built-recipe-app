import React from 'react';
import { render, fireEvent, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, beforeEach, jest, expect } from '@jest/globals';
import { RecipeCard } from '../components/RecipeCard';
import { Recipe } from '../types/recipe';

describe('RecipeCard', () => {
  const mockRecipe: Recipe = {
    id: '1',
    title: 'Test Recipe',
    description: 'Test description',
    ingredients: ['ingredient 1', 'ingredient 2'],
    instructions: ['Test instructions'],
    servings: 4,
    prepTime: 30,
    cookTime: 45,
    imageUrl: 'https://example.com/image.jpg',
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: 'user-1'
  };

  const mockHandlers = {
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onClick: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders recipe information correctly', () => {
    render(<RecipeCard recipe={mockRecipe} />);

    expect(screen.getByText(mockRecipe.title)).toBeInTheDocument();
    expect(screen.getByText(mockRecipe.description!)).toBeInTheDocument();
    expect(screen.getByText(`Prep: ${mockRecipe.prepTime} min`)).toBeInTheDocument();
    expect(screen.getByText(`Cook: ${mockRecipe.cookTime} min`)).toBeInTheDocument();
    expect(screen.getByText(`Serves: ${mockRecipe.servings}`)).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', mockRecipe.imageUrl);
  });

  it('shows placeholder with first letter when no image URL is provided', () => {
    const minimalRecipe: Recipe = {
      id: '1',
      title: 'Minimal Recipe',
      ingredients: ['ingredient'],
      instructions: ['instructions'],
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: 'user-1'
    };

    render(<RecipeCard recipe={minimalRecipe} />);

    const placeholder = screen.getByText('M');
    expect(placeholder).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders without optional fields', () => {
    const minimalRecipe: Recipe = {
      id: '1',
      title: 'Minimal Recipe',
      ingredients: ['ingredient'],
      instructions: ['instructions'],
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: 'user-1'
    };

    render(<RecipeCard recipe={minimalRecipe} />);

    expect(screen.getByText(minimalRecipe.title)).toBeInTheDocument();
    expect(screen.queryByText(/Prep:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cook:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Serves:/)).not.toBeInTheDocument();
    // Should show placeholder with first letter of recipe title
    const placeholder = screen.getByText('M');
    expect(placeholder).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    render(<RecipeCard recipe={mockRecipe} onClick={mockHandlers.onClick} />);
    fireEvent.click(screen.getByText(mockRecipe.title));
    expect(mockHandlers.onClick).toHaveBeenCalledWith(mockRecipe);
  });

  it('calls onEdit when edit button is clicked', () => {
    render(<RecipeCard recipe={mockRecipe} onEdit={mockHandlers.onEdit} />);
    fireEvent.click(screen.getByText('Edit'));
    expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockRecipe);
  });

  it('calls onDelete when delete button is clicked and confirmed', () => {
    const mockConfirm = jest.spyOn(window, 'confirm');
    mockConfirm.mockImplementation(() => true);

    render(<RecipeCard recipe={mockRecipe} onDelete={mockHandlers.onDelete} />);
    fireEvent.click(screen.getByText('Delete'));

    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this recipe?');
    expect(mockHandlers.onDelete).toHaveBeenCalledWith(mockRecipe);

    mockConfirm.mockRestore();
  });

  it('does not call onDelete when delete is cancelled', () => {
    const mockConfirm = jest.spyOn(window, 'confirm');
    mockConfirm.mockImplementation(() => false);

    render(<RecipeCard recipe={mockRecipe} onDelete={mockHandlers.onDelete} />);
    fireEvent.click(screen.getByText('Delete'));

    expect(mockConfirm).toHaveBeenCalled();
    expect(mockHandlers.onDelete).not.toHaveBeenCalled();

    mockConfirm.mockRestore();
  });

  it('does not show action buttons when handlers are not provided', () => {
    render(<RecipeCard recipe={mockRecipe} />);
    
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('prevents event propagation when clicking action buttons', () => {
    render(
      <RecipeCard
        recipe={mockRecipe}
        onClick={mockHandlers.onClick}
        onEdit={mockHandlers.onEdit}
        onDelete={mockHandlers.onDelete}
      />
    );

    fireEvent.click(screen.getByText('Edit'));
    expect(mockHandlers.onClick).not.toHaveBeenCalled();
    expect(mockHandlers.onEdit).toHaveBeenCalled();

    const mockConfirm = jest.spyOn(window, 'confirm');
    mockConfirm.mockImplementation(() => true);

    fireEvent.click(screen.getByText('Delete'));
    expect(mockHandlers.onClick).not.toHaveBeenCalled();
    expect(mockHandlers.onDelete).toHaveBeenCalled();

    mockConfirm.mockRestore();
  });
});