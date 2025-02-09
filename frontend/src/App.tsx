import React from 'react';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import Login from './components/Login';
import { useAuth } from './context/AuthContext';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="App">
      <header className="App-header" role="banner">
        <h1>Recipe App</h1>
        <div className="auth-section">
          <Login />
        </div>
      </header>
      <main>
        {user ? (
          <div className="welcome-message">
            <p>Welcome to your recipe collection, {user.displayName}!</p>
            {/* Recipe components will be added here */}
          </div>
        ) : (
          <div className="login-message">
            <p>Please sign in to access your recipes</p>
          </div>
        )}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;