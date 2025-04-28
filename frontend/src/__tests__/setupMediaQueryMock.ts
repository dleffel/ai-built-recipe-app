// This file provides a mock implementation of window.matchMedia for tests
// Import this file in any test that needs to use components with useMediaQuery

import { jest } from '@jest/globals';

// Define a function to set up the matchMedia mock
export function setupMatchMediaMock(matches = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: matches,
      media: query,
      onchange: null,
      addListener: jest.fn(), // Deprecated
      removeListener: jest.fn(), // Deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// Export a function to toggle between mobile and desktop views
export function setMobileView(isMobile = true) {
  setupMatchMediaMock(isMobile);
}

// Add a dummy test to satisfy Jest's requirement for at least one test
if (process.env.NODE_ENV === 'test') {
  describe('setupMediaQueryMock', () => {
    it('should provide a working matchMedia mock', () => {
      setupMatchMediaMock();
      expect(window.matchMedia).toBeDefined();
      
      const mediaQuery = window.matchMedia('(max-width: 768px)');
      expect(mediaQuery.matches).toBe(false);
      
      // Test the mobile view function
      setMobileView(true);
      const mobileMediaQuery = window.matchMedia('(max-width: 768px)');
      expect(mobileMediaQuery.matches).toBe(true);
    });
  });
}