import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import styles from './Navigation.module.css';

const Navigation: React.FC = () => {
  const location = useLocation();
  const isMobile = window.innerWidth <= 768;
  
  // Function to determine if a link is active
  const isActive = (path: string): boolean => {
    if (path === '/' && location.pathname === '/') {
      return true;
    }
    if (path !== '/' && location.pathname.startsWith(path)) {
      return true;
    }
    return false;
  };

  // Desktop navigation
  const desktopNav = (
    <nav className={styles.navigation} aria-label="Main Navigation">
      <ul className={styles.navList}>
        <li className={styles.navItem}>
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink
            }
            end
          >
            Home
          </NavLink>
        </li>
        <li className={styles.navItem}>
          <NavLink
            to="/recipes"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink
            }
          >
            Recipes
          </NavLink>
        </li>
        <li className={styles.navItem}>
          <NavLink
            to="/todos"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink
            }
          >
            To-Do
          </NavLink>
        </li>
      </ul>
    </nav>
  );

  // Mobile navigation (shown at bottom of screen on small devices)
  const mobileNav = (
    <nav className={styles.mobileNavigation} aria-label="Mobile Navigation">
      <ul className={styles.mobileNavList}>
        <li className={styles.mobileNavItem}>
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? `${styles.mobileNavLink} ${styles.mobileActiveLink}` : styles.mobileNavLink
            }
            end
          >
            Home
          </NavLink>
        </li>
        <li className={styles.mobileNavItem}>
          <NavLink
            to="/recipes"
            className={({ isActive }) =>
              isActive ? `${styles.mobileNavLink} ${styles.mobileActiveLink}` : styles.mobileNavLink
            }
          >
            Recipes
          </NavLink>
        </li>
        <li className={styles.mobileNavItem}>
          <NavLink
            to="/todos"
            className={({ isActive }) =>
              isActive ? `${styles.mobileNavLink} ${styles.mobileActiveLink}` : styles.mobileNavLink
            }
          >
            To-Do
          </NavLink>
        </li>
      </ul>
    </nav>
  );

  // For now, we'll just return the desktop navigation
  // In a more complete implementation, we would use a media query hook
  // to determine which navigation to show based on screen size
  return desktopNav;
};

export default Navigation;