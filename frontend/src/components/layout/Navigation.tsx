import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import styles from './Navigation.module.css';
import useMediaQuery from '../../hooks/useMediaQuery';
import { FaHome, FaUtensils, FaListUl, FaBars, FaTimes } from 'react-icons/fa';

const Navigation: React.FC = () => {
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Close menu when switching from mobile to desktop
  useEffect(() => {
    if (!isMobile) {
      setIsMenuOpen(false);
    }
  }, [isMobile]);

  // Handle escape key to close menu
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && isMenuOpen) {
      setIsMenuOpen(false);
    }
  }, [isMenuOpen]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
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

  // Mobile navigation (side menu)
  const mobileNav = (
    <>
      {/* Hamburger button */}
      <button
        className={styles.hamburgerButton}
        onClick={toggleMenu}
        aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isMenuOpen}
        aria-controls="mobile-side-menu"
      >
        {isMenuOpen ? (
          FaTimes({ 'aria-hidden': 'true' })
        ) : (
          FaBars({ 'aria-hidden': 'true' })
        )}
      </button>

      {/* Overlay */}
      <div
        className={`${styles.overlay} ${isMenuOpen ? styles.overlayVisible : ''}`}
        onClick={closeMenu}
        aria-hidden="true"
        data-testid="side-menu-overlay"
      />

      {/* Side menu */}
      <nav
        id="mobile-side-menu"
        className={`${styles.sideMenu} ${isMenuOpen ? styles.sideMenuOpen : ''}`}
        aria-label="Mobile Navigation"
        aria-hidden={!isMenuOpen}
        data-testid="mobile-side-menu"
      >
        <div className={styles.sideMenuHeader}>
          <span className={styles.sideMenuTitle}>Menu</span>
          <button
            className={styles.closeButton}
            onClick={closeMenu}
            aria-label="Close menu"
          >
            {FaTimes({ 'aria-hidden': 'true' })}
          </button>
        </div>
        <ul className={styles.sideMenuList}>
          <li className={styles.sideMenuItem}>
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? `${styles.sideMenuLink} ${styles.sideMenuActiveLink}` : styles.sideMenuLink
              }
              onClick={closeMenu}
              end
            >
              <span className={styles.sideMenuIcon}>
                {FaHome({ 'aria-hidden': 'true' })}
              </span>
              <span className={styles.sideMenuText}>Home</span>
            </NavLink>
          </li>
          <li className={styles.sideMenuItem}>
            <NavLink
              to="/recipes"
              className={({ isActive }) =>
                isActive ? `${styles.sideMenuLink} ${styles.sideMenuActiveLink}` : styles.sideMenuLink
              }
              onClick={closeMenu}
            >
              <span className={styles.sideMenuIcon}>
                {FaUtensils({ 'aria-hidden': 'true' })}
              </span>
              <span className={styles.sideMenuText}>Recipes</span>
            </NavLink>
          </li>
          <li className={styles.sideMenuItem}>
            <NavLink
              to="/todos"
              className={({ isActive }) =>
                isActive ? `${styles.sideMenuLink} ${styles.sideMenuActiveLink}` : styles.sideMenuLink
              }
              onClick={closeMenu}
            >
              <span className={styles.sideMenuIcon}>
                {FaListUl({ 'aria-hidden': 'true' })}
              </span>
              <span className={styles.sideMenuText}>To-Do</span>
            </NavLink>
          </li>
        </ul>
      </nav>
    </>
  );

  // Return the appropriate navigation based on screen size
  return isMobile ? mobileNav : desktopNav;
};

export default Navigation;