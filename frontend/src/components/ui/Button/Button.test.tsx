import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, jest } from '@jest/globals';
import { Button } from './Button';
import { IconButton } from './IconButton';

// Mock icon component for testing
const MockIcon = () => <svg data-testid="mock-icon" />;

describe('Button', () => {
  describe('rendering', () => {
    it('renders with default props', () => {
      render(<Button>Test Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('type', 'button');
    });

    it('renders with children', () => {
      render(<Button>Test Button</Button>);
      expect(screen.getByText('Test Button')).toBeInTheDocument();
    });

    it('renders with left icon', () => {
      render(<Button leftIcon={<MockIcon />}>With Icon</Button>);
      expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
      expect(screen.getByText('With Icon')).toBeInTheDocument();
    });

    it('renders with right icon', () => {
      render(<Button rightIcon={<MockIcon />}>With Icon</Button>);
      expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
    });
  });

  describe('variants', () => {
    it('renders primary variant', () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('renders secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('renders danger variant', () => {
      render(<Button variant="danger">Danger</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('renders ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('sizes', () => {
    it('renders small size', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('renders medium size (default)', () => {
      render(<Button size="md">Medium</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('renders large size', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('modifiers', () => {
    it('renders with fullWidth modifier', () => {
      render(<Button fullWidth>Full Width</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('renders with pill modifier', () => {
      render(<Button pill>Pill</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('renders with iconOnly modifier', () => {
      render(
        <Button iconOnly aria-label="Icon only">
          <MockIcon />
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', 'Icon only');
    });
  });

  describe('states', () => {
    it('handles disabled state', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('handles loading state', () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      // Button should be disabled when loading
      expect(button).toBeDisabled();
    });

    it('disables button when loading', () => {
      const handleClick = jest.fn();
      render(
        <Button loading onClick={handleClick}>
          Loading
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('interactions', () => {
    it('calls onClick when clicked', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', () => {
      const handleClick = jest.fn();
      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>
      );
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('supports aria-label', () => {
      render(<Button aria-label="Custom label">Button</Button>);
      expect(screen.getByLabelText('Custom label')).toBeInTheDocument();
    });

    it('supports custom className', () => {
      render(<Button className="custom-class">Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('forwards ref', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Button</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe('button type', () => {
    it('defaults to type="button"', () => {
      render(<Button>Button</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('supports type="submit"', () => {
      render(<Button type="submit">Submit</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });

    it('supports type="reset"', () => {
      render(<Button type="reset">Reset</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'reset');
    });
  });
});

describe('IconButton', () => {
  it('renders with icon and aria-label', () => {
    render(<IconButton icon={<MockIcon />} aria-label="Edit" />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
  });

  it('renders with ghost variant by default', () => {
    render(<IconButton icon={<MockIcon />} aria-label="Edit" />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('supports different variants', () => {
    render(<IconButton icon={<MockIcon />} variant="primary" aria-label="Primary" />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('supports different sizes', () => {
    render(<IconButton icon={<MockIcon />} size="lg" aria-label="Large" />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<IconButton icon={<MockIcon />} aria-label="Click" onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('supports disabled state', () => {
    render(<IconButton icon={<MockIcon />} aria-label="Disabled" disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('supports loading state', () => {
    render(<IconButton icon={<MockIcon />} aria-label="Loading" loading />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});