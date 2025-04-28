import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import styles from './Navigation.module.css';
import useMediaQuery from '../../hooks/useMediaQuery';
import { FaHome, FaUtensils, FaListUl } from 'react-icons/fa';

const Navigation: React.FC = () => {
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 768px)');
  
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
            <span className={styles.mobileNavIcon}>
              {FaHome({ 'aria-hidden': 'true' })}
            </span>
            <span className={styles.mobileNavText}>Home</span>
          </NavLink>
        </li>
        <li className={styles.mobileNavItem}>
          <NavLink
            to="/recipes"
            className={({ isActive }) =>
              isActive ? `${styles.mobileNavLink} ${styles.mobileActiveLink}` : styles.mobileNavLink
            }
          >
            <span className={styles.mobileNavIcon}>
              {FaUtensils({ 'aria-hidden': 'true' })}
            </span>
            <span className={styles.mobileNavText}>Recipes</span>
          </NavLink>
        </li>
        <li className={styles.mobileNavItem}>
          <NavLink
            to="/todos"
            className={({ isActive }) =>
              isActive ? `${styles.mobileNavLink} ${styles.mobileActiveLink}` : styles.mobileNavLink
            }
          >
            <span className={styles.mobileNavIcon}>
              {FaListUl({ 'aria-hidden': 'true' })}
            </span>
            <span className={styles.mobileNavText}>To-Do</span>
          </NavLink>
        </li>
      </ul>
    </nav>
  );

  // Return the appropriate navigation based on screen size
  return isMobile ? mobileNav : desktopNav;
};

export default Navigation;