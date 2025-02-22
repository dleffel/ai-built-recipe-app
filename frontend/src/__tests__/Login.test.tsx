import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import Login from '../components/Login';
import { useAuth } from '../context/AuthContext';

// Mock the auth context
jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn()
}));

describe('Login', () => {
  const mockHandleGoogleLogin = jest.fn();
  const mockHandleDevLogin = jest.fn();
  const mockOnLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to logged out state
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      handleGoogleLogin: mockHandleGoogleLogin,
      handleDevLogin: mockHandleDevLogin
    });
  });

  it('renders login button when not logged in', () => {
    render(<Login />);
    const loginButton = screen.getByText('Sign in ▾');
    expect(loginButton).toBeInTheDocument();

    // Open dropdown
    fireEvent.click(loginButton);

    // Check Google sign in option
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
  });

  it('calls handleGoogleLogin and onLogin callback when clicking login', async () => {
    mockHandleGoogleLogin.mockImplementation(async () => Promise.resolve());
    render(<Login onLogin={mockOnLogin} />);
    
    // Open dropdown
    const loginButton = screen.getByText('Sign in ▾');
    fireEvent.click(loginButton);

    // Click Google sign in option
    const googleSignIn = screen.getByText('Sign in with Google');
    fireEvent.click(googleSignIn);

    await waitFor(() => {
      expect(mockHandleGoogleLogin).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalled();
    });
  });

  it('renders user profile when logged in', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        displayName: 'Test User',
        email: 'test@example.com',
        photo: 'https://example.com/photo.jpg'
      },
      handleGoogleLogin: mockHandleGoogleLogin,
      handleDevLogin: mockHandleDevLogin
    });

    render(<Login />);

    // Check user name with dropdown arrow
    expect(screen.getByText('Test User ▾')).toBeInTheDocument();
    
    // Check avatar
    expect(screen.getByAltText("Test User's avatar")).toHaveAttribute('src', 'https://example.com/photo.jpg');

    // Open dropdown menu
    const profileButton = screen.getByText('Test User ▾');
    fireEvent.click(profileButton);

    // Check sign out option
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });

  it('handles image load errors', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        displayName: 'Test User',
        email: 'test@example.com',
        photo: 'invalid-url'
      },
      handleGoogleLogin: mockHandleGoogleLogin,
      handleDevLogin: mockHandleDevLogin
    });

    render(<Login />);
    const img = screen.getByAltText("Test User's avatar");
    fireEvent.error(img);

    expect(consoleSpy).toHaveBeenCalledWith('Image failed to load:', 'http://localhost/invalid-url');
    expect(img).toHaveAttribute('src', 'https://via.placeholder.com/150');

    consoleSpy.mockRestore();
  });

  it('calls handleGoogleLogin when clicking sign out', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        displayName: 'Test User',
        email: 'test@example.com',
        photo: 'https://example.com/photo.jpg'
      },
      handleGoogleLogin: mockHandleGoogleLogin,
      handleDevLogin: mockHandleDevLogin
    });

    render(<Login />);
    
    // Open dropdown menu
    const profileButton = screen.getByText('Test User ▾');
    fireEvent.click(profileButton);

    // Click sign out
    const signOutButton = screen.getByText('Sign out');
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(mockHandleGoogleLogin).toHaveBeenCalled();
    });
  });
});