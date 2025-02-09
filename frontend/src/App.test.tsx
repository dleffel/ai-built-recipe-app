import React from 'react';
import { render, screen, RenderResult } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from '@jest/globals';
import App from './App';

describe('App Component', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Recipe App' })).toBeInTheDocument();
    expect(screen.getByText('Welcome to your recipe collection!')).toBeInTheDocument();
  });

  it('has correct header styling', () => {
    render(<App />);
    const header = screen.getByRole('banner');
    
    expect(header).toHaveClass('App-header');
    expect(header).toBeVisible();
  });

  it('matches snapshot', () => {
    const { container }: RenderResult = render(<App />);
    expect(container).toMatchSnapshot();
  });
});