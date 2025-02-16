import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
  });

  it('calls handleGoogleLogin and onLogin callback when clicking login', async () => {
    mockHandleGoogleLogin.mockResolvedValueOnce(undefined);
    render(<Login onLogin={mockOnLogin} />);
    
    const loginButton = screen.getByText('Sign in with Google');
    fireEvent.click(loginButton);

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

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByAltText('Test User')).toHaveAttribute('src', 'https://example.com/photo.jpg');
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('handles image load errors', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
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
    const img = screen.getByAltText('Test User');
    fireEvent.error(img);

    expect(consoleSpy).toHaveBeenCalledWith('Image failed to load:', 'http://localhost/invalid-url');
    expect(img).toHaveAttribute('src', 'https://via.placeholder.com/150');

    consoleSpy.mockRestore();
  });

  it('calls handleGoogleLogin when clicking logout', async () => {
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
    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockHandleGoogleLogin).toHaveBeenCalled();
    });
  });

  it('sets proper image attributes for security', () => {
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
    const img = screen.getByAltText('Test User');

    expect(img).toHaveAttribute('referrerPolicy', 'no-referrer');
    expect(img).toHaveAttribute('crossOrigin', 'anonymous');
  });
});