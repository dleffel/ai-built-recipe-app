import '@testing-library/jest-dom';

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveTextContent(text: string): R;
    }
  }
}

// Create a simple mock API object
type MockFn = jest.Mock & {
  mockResolvedValueOnce: (value: any) => jest.Mock;
  mockRejectedValueOnce: (value: any) => jest.Mock;
  mockImplementationOnce: (fn: (...args: any[]) => any) => jest.Mock;
};

export const mockApi = {
  get: jest.fn() as MockFn,
  post: jest.fn() as MockFn,
  put: jest.fn() as MockFn,
  delete: jest.fn() as MockFn,
  defaults: {
    baseURL: 'http://localhost:5001',
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json'
    }
  }
};

// Mock the api module
jest.mock('./services/api', () => ({
  __esModule: true,
  default: mockApi
}));

// Mock window.location
Object.defineProperty(window, 'location', {
  value: { href: '' },
  writable: true
});