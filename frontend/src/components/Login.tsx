import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

interface LoginProps {
  onLogin?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { user, handleGoogleLogin, handleDevLogin } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
        {user.photo && (
          <img
            src={user.photo}
            alt={`${user.displayName}'s avatar`}
            className="user-avatar"
            onError={handleImageError}
          />
        )}
        <button
          className={`profile-button ${isDropdownOpen ? 'active' : ''}`}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
          aria-label="User menu"
        >
          {user.displayName} ▾
        </button>
        {isDropdownOpen && (
          <>
            <div 
              className={`dropdown-backdrop ${isDropdownOpen ? 'visible' : ''}`}
              onClick={() => setIsDropdownOpen(false)}
              aria-label="Close menu"
              role="button"
            />
            <div 
              className={`dropdown-menu ${isDropdownOpen ? 'visible' : ''}`}
              role="menu"
              aria-label="User menu"
            >
              <button 
                onClick={() => handleGoogleLogin()}
                role="menuitem"
              >
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-button-container">
        <button
          className={`login-button ${isDropdownOpen ? 'active' : ''}`}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
          aria-label="Sign in menu"
        >
          Sign in ▾
        </button>
        {isDropdownOpen && (
          <>
            <div 
              className={`dropdown-backdrop ${isDropdownOpen ? 'visible' : ''}`}
              onClick={() => setIsDropdownOpen(false)}
              aria-label="Close menu"
              role="button"
            />
            <div 
              className={`dropdown-menu ${isDropdownOpen ? 'visible' : ''}`}
              role="menu"
              aria-label="Sign in options"
            >
              <button 
                onClick={handleLogin}
                role="menuitem"
              >
                Sign in with Google
              </button>
              {/* istanbul ignore next */}
              {process.env.NODE_ENV === 'development' && (
                <button 
                  onClick={handleDevelopmentLogin}
                  role="menuitem"
                >
                  Dev Login
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;