import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider } from '../context/AuthContext';
import { mockApi, createMockResponse } from '../setupTests';
import App from '../App';
import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Mock console.error to reduce noise in test output
const originalError = console.error;
const originalLocation = window.location;

beforeAll(() => {
  console.error = jest.fn();
  // Mock window.location
  delete (window as any).location;
  window.location = {
    ...originalLocation,
    href: '',
    assign: jest.fn(),
  } as any;
});

afterAll(() => {
  console.error = originalError;
  window.location = originalLocation;
});

interface User {
  displayName: string;
  email: string;
  id: string;
  photo: string;
}

interface LogoutResponse {
  message: string;
}

type AxiosGet = <T = any>(url: string, config?: any) => Promise<AxiosResponse<T>>;
type AxiosPost = <T = any>(url: string, data?: any, config?: any) => Promise<AxiosResponse<T>>;

describe('Authentication Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.location.href = '';
    jest.spyOn(mockApi, 'get').mockReset();
    jest.spyOn(mockApi, 'post').mockReset();
  });

  it('shows loading state while checking authentication', async () => {
    // Delay auth check response to show loading state
    jest.spyOn(mockApi, 'get').mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve(createMockResponse<User | null>(null)), 100))
    );

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Should show loading state initially
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Should show login button after loading
    const loginButton = await screen.findByText('Sign in ▾');
    expect(loginButton).toBeInTheDocument();

    // Click to open dropdown
    fireEvent.click(loginButton);

    // Should show Google sign in option
    const googleSignIn = screen.getByText('Sign in with Google');
    expect(googleSignIn).toBeInTheDocument();
  });

  it('shows login page for unauthenticated users', async () => {
    // Mock initial auth check to return 401
    const error: AxiosError = {
      response: { status: 401, data: { error: 'Not authenticated' } } as any,
      isAxiosError: true,
      name: 'AxiosError',
      message: 'Unauthorized',
      config: {
        headers: {}
      } as InternalAxiosRequestConfig,
      toJSON: () => ({})
    };
    jest.spyOn(mockApi, 'get').mockImplementationOnce(() => Promise.reject(error));

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Should show login button after loading
    const loginButton = await screen.findByText('Sign in ▾');
    expect(loginButton).toBeInTheDocument();

    // Click to open dropdown
    fireEvent.click(loginButton);

    // Should show Google sign in option
    const googleSignIn = screen.getByText('Sign in with Google');
    expect(googleSignIn).toBeInTheDocument();
  });

  it('redirects to Google login when clicking sign in', async () => {
    // Mock initial auth check to return 401
    const error: AxiosError = {
      response: { status: 401, data: { error: 'Not authenticated' } } as any,
      isAxiosError: true,
      name: 'AxiosError',
      message: 'Unauthorized',
      config: {
        headers: {}
      } as InternalAxiosRequestConfig,
      toJSON: () => ({})
    };
    jest.spyOn(mockApi, 'get').mockImplementationOnce(() => Promise.reject(error));

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Open dropdown menu
    const loginButton = await screen.findByText('Sign in ▾');
    fireEvent.click(loginButton);

    // Click Google sign in option
    const googleSignIn = screen.getByText('Sign in with Google');
    fireEvent.click(googleSignIn);

    // Should redirect to Google auth
    await waitFor(() => {
      expect(window.location.href).toBe('http://localhost:5001/auth/google');
    });
  });

  it('shows user profile when authenticated', async () => {
    // Mock authenticated user
    const mockUser: User = {
      displayName: 'Test User',
      email: 'test@example.com',
      id: '123',
      photo: 'test.jpg'
    };

    // Mock successful auth check
    jest.spyOn(mockApi, 'get').mockImplementationOnce(() => 
      Promise.resolve(createMockResponse<User>(mockUser))
    );

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Should show user name with dropdown arrow in profile
    const userName = await screen.findByText(`${mockUser.displayName} ▾`);
    expect(userName).toBeInTheDocument();

    // Should show user avatar
    expect(screen.getByAltText(`${mockUser.displayName}'s avatar`)).toHaveAttribute('src', mockUser.photo);

    // Open user menu
    fireEvent.click(userName);

    // Should show sign out option
    const signOutButton = screen.getByText('Sign out');
    expect(signOutButton).toBeInTheDocument();
  });

  it('handles logout', async () => {
    // Mock authenticated user
    const mockUser: User = {
      displayName: 'Test User',
      email: 'test@example.com',
      id: '123',
      photo: 'test.jpg'
    };

    // Mock API responses
    const getMock = jest.spyOn(mockApi, 'get');
    getMock
      .mockImplementationOnce(() => Promise.resolve(createMockResponse<User>(mockUser))) // Initial check
      .mockImplementationOnce(() => Promise.resolve(createMockResponse<LogoutResponse>({ message: 'Logged out successfully' }))); // Logout

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Wait for user profile to load and open menu
    const profileButton = await screen.findByText(`${mockUser.displayName} ▾`);
    fireEvent.click(profileButton);

    // Click sign out button in dropdown
    const signOutButton = screen.getByText('Sign out');
    fireEvent.click(signOutButton);

    // Wait for state to update and verify login button appears
    await waitFor(() => {
      expect(screen.getByText('Sign in ▾')).toBeInTheDocument();
    });
  });

  it('handles server errors gracefully', async () => {
    // Mock failed auth check
    const mockError = new Error('Network error');
    jest.spyOn(mockApi, 'get').mockImplementationOnce(() => Promise.reject(mockError));

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Should still show login button when auth check fails
    const loginButton = await screen.findByText('Sign in ▾');
    expect(loginButton).toBeInTheDocument();

    // Console error should have been called with the error
    expect(console.error).toHaveBeenCalledWith(
      'Error checking user:',
      expect.any(Error)
    );
  });
});