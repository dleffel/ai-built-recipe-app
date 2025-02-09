import React from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Login: React.FC = () => {
  const { user, loading, logout, checkUser } = useAuth();

  const handleGoogleLogin = () => {
    // Redirect to backend Google auth route with the correct callback URL
    window.location.href = `${api.defaults.baseURL}/auth/google`;
  };

  const handleDevLogin = async () => {
    try {
      const response = await api.post('/auth/dev-login', {}, { withCredentials: true });
      if (response.data) {
        await checkUser(); // Check user state after successful login
      }
    } catch (error) {
      console.error('Dev login failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      await checkUser(); // Check user state after logout
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="login-container">
      {!user ? (
        <div className="login-buttons">
          <button
            onClick={handleGoogleLogin}
            className="google-login-button"
          >
            Sign in with Google
          </button>
          {process.env.NODE_ENV === 'development' && (
            <button
              onClick={handleDevLogin}
              className="dev-login-button"
            >
              Dev Login
            </button>
          )}
        </div>
      ) : (
        <div className="user-profile">
          <img
            src={user.photo || 'default-avatar.png'}
            alt={user.displayName}
            className="profile-photo"
          />
          <div className="user-info">
            <h3>{user.displayName}</h3>
            <p>{user.email}</p>
            <button
              onClick={handleLogout}
              className="logout-button"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;