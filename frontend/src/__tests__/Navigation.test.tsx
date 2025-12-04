import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
    // Reset body overflow style
    document.body.style.overflow = '';
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

  it('should render mobile navigation with hamburger button for small screens', () => {
    // Mock the hook to return true (mobile)
    (useMediaQueryModule.default as jest.Mock).mockReturnValue(true);

    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    // Check for hamburger button
    const hamburgerButton = screen.getByRole('button', { name: /open menu/i });
    expect(hamburgerButton).toBeInTheDocument();

    // Side menu should exist but be closed initially
    const sideMenu = screen.getByRole('navigation', { name: /mobile navigation/i });
    expect(sideMenu).toBeInTheDocument();
  });

  it('should open side menu when hamburger button is clicked', () => {
    // Mock the hook to return true (mobile)
    (useMediaQueryModule.default as jest.Mock).mockReturnValue(true);

    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    // Click hamburger button
    const hamburgerButton = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(hamburgerButton);

    // There should be close menu buttons (hamburger becomes close, plus close button in menu header)
    const closeButtons = screen.getAllByRole('button', { name: /close menu/i });
    expect(closeButtons.length).toBeGreaterThanOrEqual(1);

    // Body overflow should be hidden
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('should close side menu when close button is clicked', () => {
    // Mock the hook to return true (mobile)
    (useMediaQueryModule.default as jest.Mock).mockReturnValue(true);

    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    // Open menu
    const hamburgerButton = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(hamburgerButton);

    // Click close button inside the menu
    const closeButtons = screen.getAllByRole('button', { name: /close menu/i });
    // There are two close buttons - one in hamburger position and one in menu header
    fireEvent.click(closeButtons[1]); // Click the one in the menu header

    // Button should now show open menu again
    expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument();

    // Body overflow should be reset
    expect(document.body.style.overflow).toBe('');
  });

  it('should close side menu when overlay is clicked', () => {
    // Mock the hook to return true (mobile)
    (useMediaQueryModule.default as jest.Mock).mockReturnValue(true);

    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    // Open menu
    const hamburgerButton = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(hamburgerButton);

    // Find and click overlay using testid
    const overlay = screen.getByTestId('side-menu-overlay');
    fireEvent.click(overlay);

    // Button should now show open menu again
    expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument();
  });

  it('should close side menu when escape key is pressed', () => {
    // Mock the hook to return true (mobile)
    (useMediaQueryModule.default as jest.Mock).mockReturnValue(true);

    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    // Open menu
    const hamburgerButton = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(hamburgerButton);

    // Press escape key
    fireEvent.keyDown(document, { key: 'Escape' });

    // Button should now show open menu again
    expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument();
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

    // Check mobile links (in side menu)
    const mobileHomeLink = screen.getByRole('link', { name: /home/i });
    const mobileRecipesLink = screen.getByRole('link', { name: /recipes/i });
    const mobileTodoLink = screen.getByRole('link', { name: /to-do/i });

    expect(mobileHomeLink).toBeInTheDocument();
    expect(mobileRecipesLink).toBeInTheDocument();
    expect(mobileTodoLink).toBeInTheDocument();
  });

  it('should have correct aria attributes on hamburger button', () => {
    // Mock the hook to return true (mobile)
    (useMediaQueryModule.default as jest.Mock).mockReturnValue(true);

    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    const hamburgerButton = screen.getByRole('button', { name: /open menu/i });
    
    // Check initial aria attributes
    expect(hamburgerButton).toHaveAttribute('aria-expanded', 'false');
    expect(hamburgerButton).toHaveAttribute('aria-controls', 'mobile-side-menu');

    // Open menu
    fireEvent.click(hamburgerButton);

    // Check updated aria attributes
    const closeButton = screen.getAllByRole('button', { name: /close menu/i })[0];
    expect(closeButton).toHaveAttribute('aria-expanded', 'true');
  });
});