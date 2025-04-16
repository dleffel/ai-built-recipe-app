import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './HomePage.module.css';
import { useAuth } from '../context/AuthContext';
import Layout from './layout/Layout';

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Layout>
      <div className={styles.homeContainer}>
        <h1 className={styles.welcomeHeading}>
          {user ? `Welcome, ${user.displayName || 'Chef'}!` : 'Welcome to Recipe App'}
        </h1>
        <p className={styles.welcomeSubheading}>
          Your modular platform for organizing recipes and more. Choose a module below to get started.
        </p>

        <div className={styles.modulesGrid}>
          {/* Recipes Module Card */}
          <Link to="/recipes" className={`${styles.moduleCard} ${styles.activeModule}`}>
            <div className={styles.moduleIcon}>📖</div>
            <h2 className={styles.moduleTitle}>Recipes</h2>
            <p className={styles.moduleDescription}>
              Store, organize, and discover your favorite recipes. Import recipes from URLs or create your own.
            </p>
            <button 
              className={styles.moduleButton}
              onClick={(e) => {
                e.preventDefault();
                navigate('/recipes');
              }}
            >
              Open Recipes
            </button>
          </Link>

          {/* To-Do Module Card (Coming Soon) */}
          <div className={`${styles.moduleCard} ${styles.comingSoonModule}`}>
            <div className={styles.moduleIcon}>✓</div>
            <h2 className={styles.moduleTitle}>To-Do List</h2>
            <p className={styles.moduleDescription}>
              Create shopping lists, meal plans, and organize your cooking tasks in one place.
            </p>
            <button 
              className={styles.moduleButton}
              disabled
            >
              Coming Soon
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;