import React from 'react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

interface LoginProps {
  onLogin?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { user, handleGoogleLogin, handleDevLogin } = useAuth();

  const handleLogin = async () => {
    await handleGoogleLogin();
    onLogin?.();
  };

  /* istanbul ignore next */
  const handleDevelopmentLogin = async () => {
    if (process.env.NODE_ENV === 'development') {
      await handleDevLogin();
      onLogin?.();
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.log('Image failed to load:', e.currentTarget.src);
    e.currentTarget.src = 'https://via.placeholder.com/150';
  };

  if (user) {
    return (
      <div className="user-profile">
        <img
          src={user.photo}
          alt={user.displayName}
          className="profile-photo"
          onError={handleImageError}
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
        />
        <div className="user-info">
          <h3>{user.displayName}</h3>
          <p>{user.email}</p>
          <button className="logout-button" onClick={() => handleGoogleLogin()}>
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-buttons">
        <button className="google-login-button" onClick={handleLogin}>
          Sign in with Google
        </button>
        {/* istanbul ignore next */}
        {process.env.NODE_ENV === 'development' && (
          <button className="dev-login-button" onClick={handleDevelopmentLogin}>
            Dev Login
          </button>
        )}
      </div>
    </div>
  );
};

export default Login;