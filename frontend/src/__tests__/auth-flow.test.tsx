import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider } from '../context/AuthContext';
import { mockApi } from '../setupTests';
import App from '../App';

// Mock console.error to reduce noise in test output
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('Authentication Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.location.href = '';
    mockApi.get.mockReset();
    mockApi.post.mockReset();
  });

  it('shows loading state while checking authentication', async () => {
    // Delay auth check response to show loading state
    mockApi.get.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({ data: null }), 100))
    );

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Should show loading state initially
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Should show login button after loading
    const loginButton = await screen.findByText('Sign in with Google');
    expect(loginButton).toBeInTheDocument();
  });

  it('shows login page for unauthenticated users', async () => {
    // Mock initial auth check to return 401
    mockApi.get.mockRejectedValueOnce({
      response: { status: 401, data: { error: 'Not authenticated' } }
    });

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Should show login button after loading
    const loginButton = await screen.findByText('Sign in with Google');
    expect(loginButton).toBeInTheDocument();
  });

  it('redirects to Google login when clicking sign in', async () => {
    // Mock initial auth check to return 401
    mockApi.get.mockRejectedValueOnce({
      response: { status: 401, data: { error: 'Not authenticated' } }
    });

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Click login button
    const loginButton = await screen.findByText('Sign in with Google');
    fireEvent.click(loginButton);

    // Should redirect to Google auth
    expect(window.location.href).toBe('http://localhost:5001/auth/google');
  });

  it('shows user profile when authenticated', async () => {
    // Mock authenticated user
    const mockUser = {
      displayName: 'Test User',
      email: 'test@example.com',
      id: '123',
      photo: 'test.jpg'
    };

    // Mock successful auth check
    mockApi.get.mockResolvedValueOnce({ data: mockUser });

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Should show user name in profile
    const userName = await screen.findByText(mockUser.displayName);
    expect(userName).toBeInTheDocument();

    // Should show user info
    expect(screen.getByText(mockUser.email)).toBeInTheDocument();
    expect(screen.getByAltText(mockUser.displayName)).toHaveAttribute('src', mockUser.photo);
  });

  it('handles logout', async () => {
    // Mock authenticated user
    const mockUser = {
      displayName: 'Test User',
      email: 'test@example.com',
      id: '123',
      photo: 'test.jpg'
    };

    // Mock API responses
    mockApi.get
      .mockResolvedValueOnce({ data: mockUser }) // Initial check
      .mockResolvedValueOnce({ data: { message: 'Logged out successfully' } }); // Logout

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Wait for user to be loaded and click logout
    const logoutButton = await screen.findByText('Logout');
    fireEvent.click(logoutButton);

    // Wait for state to update and verify login button appears
    await waitFor(() => {
      expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    });
  });

  it('handles server errors gracefully', async () => {
    // Mock failed auth check
    mockApi.get.mockRejectedValueOnce(new Error('Network error'));

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Should still show login button when auth check fails
    const loginButton = await screen.findByText('Sign in with Google');
    expect(loginButton).toBeInTheDocument();

    // Console error should have been called with the error
    expect(console.error).toHaveBeenCalledWith(
      'Error checking user:',
      expect.any(Error)
    );
  });
});