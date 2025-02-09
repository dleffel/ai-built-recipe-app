/**
 * @jest-environment jsdom
 */

import { initializeApp } from '../index';

// Mock modules at a high level
jest.mock('react-dom/client', () => ({
  createRoot: jest.fn()
}));

jest.mock('../App', () => () => null);
jest.mock('../reportWebVitals', () => () => {});

describe('Index', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('should export initialization function', () => {
    expect(typeof initializeApp).toBe('function');
  });

  it('should handle missing root element gracefully', () => {
    expect(() => {
      initializeApp();
    }).not.toThrow();
  });
});