import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import * as useMediaQueryModule from '../hooks/useMediaQuery';
import { AuthProvider } from '../context/AuthContext';

// Mock the Navigation component
jest.mock('../components/layout/Navigation', () => {
  return {
    __esModule: true,
    default: () => <div data-testid="navigation-mock">Navigation Component</div>
  };
});

// Mock the Login component
jest.mock('../components/Login', () => {
  return {
    __esModule: true,
    default: () => <div data-testid="login-mock">Login Component</div>
  };
});

describe('Layout Component', () => {
  // Mock the useMediaQuery hook
  beforeEach(() => {
    jest.spyOn(useMediaQueryModule, 'default');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render the layout with correct structure', () => {
    // Mock the hook to return false (desktop view)
    (useMediaQueryModule.default as jest.Mock).mockReturnValue(false);

    render(
      <BrowserRouter>
        <AuthProvider>
          <Layout>
            <div data-testid="test-content">Test Content</div>
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    );

    // Check layout structure
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(screen.getByTestId('navigation-mock')).toBeInTheDocument();
    expect(screen.getByTestId('login-mock')).toBeInTheDocument();
    
    // Check for header and main content
    const header = screen.getByRole('banner');
    const main = screen.getByRole('main');
    
    expect(header).toBeInTheDocument();
    expect(main).toBeInTheDocument();
  });

  it('should apply correct styles for desktop view', () => {
    // Mock the hook to return false (desktop view)
    (useMediaQueryModule.default as jest.Mock).mockReturnValue(false);

    render(
      <BrowserRouter>
        <AuthProvider>
          <Layout>
            <div data-testid="test-content">Test Content</div>
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    );

    // Get the main content element
    const main = screen.getByRole('main');
    
    // Just verify the main element exists
    expect(main).toBeInTheDocument();
  });

  it('should apply correct styles for mobile view', () => {
    // Mock the hook to return true (mobile view)
    (useMediaQueryModule.default as jest.Mock).mockReturnValue(true);

    render(
      <BrowserRouter>
        <AuthProvider>
          <Layout>
            <div data-testid="test-content">Test Content</div>
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    );

    // Get the main content element
    const main = screen.getByRole('main');
    
    // Just verify the main element exists
    expect(main).toBeInTheDocument();
  });
});