import '@testing-library/jest-dom';
import { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { jest, beforeAll, afterAll } from '@jest/globals';

type MockFn = jest.Mock & {
  mockResolvedValue: (value: any) => MockFn;
  mockResolvedValueOnce: (value: any) => MockFn;
  mockRejectedValue: (error: any) => MockFn;
  mockRejectedValueOnce: (error: any) => MockFn;
  mockReset: () => MockFn;
};

// Mock API
export const mockApi = {
  get: jest.fn() as MockFn,
  post: jest.fn() as MockFn,
  put: jest.fn() as MockFn,
  delete: jest.fn() as MockFn,
  interceptors: {
    request: {
      use: jest.fn() as MockFn,
      eject: jest.fn() as MockFn,
      clear: jest.fn() as MockFn
    },
    response: {
      use: jest.fn() as MockFn,
      eject: jest.fn() as MockFn,
      clear: jest.fn() as MockFn,
      handlers: undefined as [(response: AxiosResponse) => AxiosResponse, (error: any) => Promise<never>] | undefined
    }
  },
  defaults: {
    baseURL: 'http://localhost:5001',
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json'
    }
  }
};

// Create mock response helper
export const createMockResponse = <T>(data: T): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {
    headers: {
      'Content-Type': 'application/json'
    }
  } as InternalAxiosRequestConfig
});

// Mock axios
jest.mock('axios', () => ({
  create: () => mockApi,
  defaults: {
    baseURL: 'http://localhost:5001',
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json'
    }
  }
}));

// Mock console.error to reduce noise in test output
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});