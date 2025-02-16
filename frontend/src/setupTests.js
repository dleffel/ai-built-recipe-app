// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Create mock API
export const mockApi = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: {
      use: jest.fn(),
      eject: jest.fn(),
      clear: jest.fn()
    },
    response: {
      use: jest.fn(),
      eject: jest.fn(),
      clear: jest.fn(),
      handlers: []
    }
  }
};

// Mock the entire api module
jest.mock('./services/api', () => ({
  __esModule: true,
  default: mockApi,
  recipeApi: {
    create: jest.fn(),
    list: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}));
