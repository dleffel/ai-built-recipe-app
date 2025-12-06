import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import './Login.css';

interface LoginProps {
  onLogin?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { user, handleGoogleLogin, handleDevLogin } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogin = async () => {
    // handleGoogleLogin will now handle storing the return path
    await handleGoogleLogin();
    onLogin?.();
  };

  // Helper to check if dev login should be enabled (dev mode OR REACT_APP_ENABLE_DEV_LOGIN)
  const isDevLoginEnabled = process.env.NODE_ENV === 'development' ||
    process.env.REACT_APP_ENABLE_DEV_LOGIN === 'true';

  /* istanbul ignore next */
  const handleDevelopmentLogin = async () => {
    if (isDevLoginEnabled) {
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
          aria-label="User menu"
          className={`profile-button ${isDropdownOpen ? 'active' : ''}`}
        >
          {user.displayName} ▾
        </Button>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleGoogleLogin()}
                role="menuitem"
                fullWidth
              >
                Sign out
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-button-container">
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
          aria-label="Sign in menu"
          className={`login-button ${isDropdownOpen ? 'active' : ''}`}
        >
          Sign in ▾
        </Button>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogin}
                role="menuitem"
                fullWidth
              >
                Sign in with Google
              </Button>
              {/* istanbul ignore next */}
              {isDevLoginEnabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDevelopmentLogin}
                  role="menuitem"
                  fullWidth
                >
                  Dev Login
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;