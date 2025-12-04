import React from 'react';
import { Link } from 'react-router-dom';
import styles from './HomePage.module.css';
import { useAuth } from '../context/AuthContext';
import Layout from './layout/Layout';

const HomePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <Layout>
      <div className={styles.homeContainer}>
        <h1 className={styles.welcomeHeading}>
          {user ? `Welcome, ${user.displayName || 'Chef'}!` : 'Welcome to Organizer'}
        </h1>
        <nav className={styles.navList}>
          <Link to="/recipes" className={styles.navLink}>Recipes</Link>
          <Link to="/todos" className={styles.navLink}>To-Do List</Link>
        </nav>
      </div>
    </Layout>
  );
};

export default HomePage;