import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { BrowserRouter } from 'react-router-dom';
import Navigation from '../components/layout/Navigation';
import * as useMediaQueryModule from '../hooks/useMediaQuery';

describe('Navigation Component', () => {
  // Mock the useMediaQuery hook
  beforeEach(() => {
    jest.spyOn(useMediaQueryModule, 'default');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render desktop navigation for large screens', () => {
    // Mock the hook to return false (not mobile)
    (useMediaQueryModule.default as jest.Mock).mockReturnValue(false);

    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    // Check for desktop navigation
    const desktopNav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(desktopNav).toBeInTheDocument();
    expect(desktopNav).not.toHaveClass('mobileNavigation');
    // We can't check for exact class names due to CSS modules
  });

  it('should render mobile navigation for small screens', () => {
    // Mock the hook to return true (mobile)
    (useMediaQueryModule.default as jest.Mock).mockReturnValue(true);

    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    // Check for mobile navigation
    const mobileNav = screen.getByRole('navigation', { name: /mobile navigation/i });
    expect(mobileNav).toBeInTheDocument();
    // We can't check for exact class names due to CSS modules
  });

  it('should have the same navigation links in both views', () => {
    // First test desktop view
    (useMediaQueryModule.default as jest.Mock).mockReturnValue(false);

    const { unmount } = render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    // Check desktop links
    const desktopHomeLink = screen.getByRole('link', { name: /home/i });
    const desktopRecipesLink = screen.getByRole('link', { name: /recipes/i });
    const desktopTodoLink = screen.getByRole('link', { name: /to-do/i });

    expect(desktopHomeLink).toBeInTheDocument();
    expect(desktopRecipesLink).toBeInTheDocument();
    expect(desktopTodoLink).toBeInTheDocument();

    // Unmount and test mobile view
    unmount();

    // Mock the hook to return true (mobile)
    (useMediaQueryModule.default as jest.Mock).mockReturnValue(true);

    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    // Check mobile links
    const mobileHomeLink = screen.getByRole('link', { name: /home/i });
    const mobileRecipesLink = screen.getByRole('link', { name: /recipes/i });
    const mobileTodoLink = screen.getByRole('link', { name: /to-do/i });

    expect(mobileHomeLink).toBeInTheDocument();
    expect(mobileRecipesLink).toBeInTheDocument();
    expect(mobileTodoLink).toBeInTheDocument();
  });
});