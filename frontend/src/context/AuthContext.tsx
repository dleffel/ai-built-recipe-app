import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { AxiosError } from 'axios';

interface User {
  id: string;
  displayName: string;
  email: string;
  photo?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const response = await api.get('/auth/current-user');
      setUser(response.data);
    } catch (err) {
      const error = err as AxiosError;
      // It's normal to get 401 when not logged in
      if (error.response?.status !== 401) {
        console.error('Error checking user:', error);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.get('/auth/logout');
      setUser(null);
    } catch (err) {
      const error = err as AxiosError;
      console.error('Logout error:', error);
      setError('Failed to logout');
      throw error; // Propagate error to component for handling
    }
  };

  const value = {
    user,
    loading,
    error,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}