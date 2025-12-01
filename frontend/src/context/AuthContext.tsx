import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

interface User {
  id: string;
  displayName: string;
  email: string;
  photo: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  handleGoogleLogin: () => Promise<void>;
  handleDevLogin: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  error: null,
  handleGoogleLogin: async () => {},
  handleDevLogin: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/auth/current-user');
      setUser(response.data);
    } catch (error) {
      if ((error as any).response?.status === 401) {
        // Not authenticated is a normal state
        setUser(null);
      } else {
        console.error('Error checking user:', error);
        setError('Failed to check authentication status');
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAndRedirect = async () => {
      await checkUser();
      // Check if we need to redirect after login
      const returnPath = localStorage.getItem('auth_return_path');
      if (user && returnPath) {
        localStorage.removeItem('auth_return_path');
        window.location.href = returnPath;
      }
    };
    
    checkAndRedirect();
  }, []);

  const handleGoogleLogin = async () => {
    if (user) {
      await logout();
    } else {
      // If no user, this is a login request
      // Store the current path to redirect back after login
      const returnPath = window.location.pathname.startsWith('/recipes') ?
        window.location.pathname : '/recipes';
      localStorage.setItem('auth_return_path', returnPath);
      window.location.href = `${api.defaults.baseURL}/auth/google`;
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      await api.get('/auth/logout');
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
      setError('Failed to logout');
    } finally {
      setLoading(false);
    }
  };

  // Helper to check if dev login should be enabled (dev mode OR REACT_APP_ENABLE_DEV_LOGIN)
  const isDevLoginEnabled = process.env.NODE_ENV === 'development' ||
    process.env.REACT_APP_ENABLE_DEV_LOGIN === 'true';

  /* istanbul ignore next */
  const handleDevLogin = async () => {
    if (!isDevLoginEnabled) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/auth/dev-login');
      setUser(response.data);
    } catch (error) {
      console.error('Error during dev login:', error);
      setError('Failed to perform dev login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading, 
        error,
        handleGoogleLogin, 
        handleDevLogin,
        logout 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;