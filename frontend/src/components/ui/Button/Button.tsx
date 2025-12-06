import React, { forwardRef } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant;
  
  /** Size of the button */
  size?: ButtonSize;
  
  /** Icon-only button (square) */
  iconOnly?: boolean;
  
  /** Full width button */
  fullWidth?: boolean;
  
  /** Loading state */
  loading?: boolean;
  
  /** Left icon */
  leftIcon?: React.ReactNode;
  
  /** Right icon */
  rightIcon?: React.ReactNode;
  
  /** Pill shape (rounded ends) */
  pill?: boolean;
  
  /** Children content */
  children?: React.ReactNode;
}

/**
 * Button component with standardized variants, sizes, and states.
 * 
 * @example
 * // Primary button
 * <Button variant="primary" size="md">Create Recipe</Button>
 * 
 * @example
 * // Secondary button with icon
 * <Button variant="secondary" leftIcon={<ArrowLeft />}>Back</Button>
 * 
 * @example
 * // Danger button
 * <Button variant="danger" size="sm">Delete</Button>
 * 
 * @example
 * // Icon-only button
 * <Button variant="ghost" iconOnly size="md" aria-label="Edit">
 *   <EditIcon />
 * </Button>
 * 
 * @example
 * // Loading state
 * <Button variant="primary" loading>Saving...</Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      iconOnly = false,
      fullWidth = false,
      loading = false,
      leftIcon,
      rightIcon,
      pill = false,
      children,
      className,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const classNames = [
      styles.button,
      styles[variant],
      styles[size],
      iconOnly && styles.iconOnly,
      fullWidth && styles.fullWidth,
      loading && styles.loading,
      pill && styles.pill,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        type={type}
        className={classNames}
        disabled={disabled || loading}
        {...props}
      >
        {leftIcon && !iconOnly && <span className={styles.leftIcon}>{leftIcon}</span>}
        {children}
        {rightIcon && !iconOnly && <span className={styles.rightIcon}>{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;