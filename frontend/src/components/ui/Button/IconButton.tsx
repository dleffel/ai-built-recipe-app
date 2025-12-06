import React, { forwardRef } from 'react';
import { Button, ButtonProps, ButtonSize, ButtonVariant } from './Button';

export interface IconButtonProps extends Omit<ButtonProps, 'iconOnly' | 'leftIcon' | 'rightIcon' | 'children'> {
  /** The icon to display */
  icon: React.ReactNode;
  
  /** Accessible label for the button (required for icon-only buttons) */
  'aria-label': string;
  
  /** Visual style variant */
  variant?: ButtonVariant;
  
  /** Size of the button */
  size?: ButtonSize;
}

/**
 * IconButton component for icon-only actions.
 * Wraps the Button component with iconOnly prop set to true.
 * 
 * @example
 * // Ghost icon button
 * <IconButton icon={<EditIcon />} aria-label="Edit" variant="ghost" />
 * 
 * @example
 * // Danger icon button
 * <IconButton icon={<TrashIcon />} aria-label="Delete" variant="danger" size="sm" />
 * 
 * @example
 * // Primary icon button
 * <IconButton icon={<PlusIcon />} aria-label="Add" variant="primary" />
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, variant = 'ghost', size = 'md', ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        iconOnly
        {...props}
      >
        {icon}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

export default IconButton;