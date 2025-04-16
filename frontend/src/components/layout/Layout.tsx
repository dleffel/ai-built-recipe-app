import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Layout.module.css';
import Navigation from './Navigation';
import { useAuth } from '../../context/AuthContext';
import Login from '../Login';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <h1 
              className={styles.title} 
              onClick={() => navigate('/')}
            >
              Recipe App
            </h1>
            <Navigation />
          </div>
          <Login />
        </div>
      </header>
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
};

export default Layout;