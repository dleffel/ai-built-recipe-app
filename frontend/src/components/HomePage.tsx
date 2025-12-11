import React from 'react';
import styles from './HomePage.module.css';
import { useAuth } from '../context/AuthContext';
import Layout from './layout/Layout';
import { ActivityFeed } from './activity';

const HomePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <Layout>
      <div className={styles.homeContainer}>
        <h1 className={styles.welcomeHeading}>
          {user ? `Welcome, ${user.displayName || 'Chef'}!` : 'Welcome to Organizer'}
        </h1>
        
        {user && (
          <div className={styles.activitySection}>
            <ActivityFeed limit={15} />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default HomePage;