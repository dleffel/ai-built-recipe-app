import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import useMediaQuery from '../hooks/useMediaQuery';

// Create a simple test component that uses the hook
function TestComponent({ query }: { query: string }) {
  const matches = useMediaQuery(query);
  return <div data-testid="test-element">{matches ? 'matches' : 'no-match'}</div>;
}

describe('useMediaQuery hook', () => {
  // Save original matchMedia
  const originalMatchMedia = window.matchMedia;

  beforeAll(() => {
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(max-width: 768px)', // Match only for mobile query
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  afterAll(() => {
    // Restore original
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: originalMatchMedia,
    });
  });

  it('should detect mobile screens correctly', () => {
    render(<TestComponent query="(max-width: 768px)" />);
    expect(screen.getByTestId('test-element')).toHaveTextContent('matches');
  });

  it('should detect desktop screens correctly', () => {
    render(<TestComponent query="(min-width: 769px)" />);
    expect(screen.getByTestId('test-element')).toHaveTextContent('no-match');
  });
});