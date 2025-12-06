# Button Component Standards

## Overview

This project uses a standardized Button component system located at `frontend/src/components/ui/Button/`. All interactive button elements should use these components instead of native `<button>` elements with custom styles.

## Components

### Button

The main button component with support for variants, sizes, icons, and states.

```tsx
import { Button } from '@/components/ui/Button';

<Button variant="primary" size="md">Click me</Button>
```

### IconButton

A wrapper for icon-only buttons that requires an `icon` prop and `aria-label`.

```tsx
import { IconButton } from '@/components/ui/Button';

<IconButton 
  icon={<EditIcon />} 
  aria-label="Edit item"
  variant="ghost"
  size="sm"
/>
```

## When to Use Each Variant

| Variant | Use Case | Examples |
|---------|----------|----------|
| primary | Main CTA, form submit, important actions | Save, Create, Confirm, Import |
| secondary | Cancel, dismiss, back navigation | Cancel, Close, Back |
| danger | Destructive actions requiring attention | Delete, Remove |
| ghost | Tertiary actions, subtle interactions | Edit, Add task, navigation links |

## Size Guidelines

| Size | Use Case |
|------|----------|
| sm | Inline actions, compact UI, table rows |
| md | Default for most buttons |
| lg | Primary CTAs, mobile touch targets |

## Props Reference

### Button Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | 'primary' \| 'secondary' \| 'danger' \| 'ghost' | 'primary' | Visual style variant |
| size | 'sm' \| 'md' \| 'lg' | 'md' | Size of the button |
| iconOnly | boolean | false | Icon-only button (square) |
| fullWidth | boolean | false | Full width button |
| loading | boolean | false | Loading state with spinner |
| leftIcon | ReactNode | - | Icon on the left side |
| rightIcon | ReactNode | - | Icon on the right side |
| pill | boolean | false | Pill shape (rounded ends) |

### IconButton Props

Extends Button props with:

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| icon | ReactNode | Yes | The icon to display |
| aria-label | string | Yes | Accessibility label (required for icon-only buttons) |

## Accessibility Requirements

1. Always provide `aria-label` for icon-only buttons
2. Use semantic button elements, not divs with onClick
3. Ensure sufficient color contrast (WCAG AA)
4. Support keyboard navigation (focus states)
5. Use `type="button"` for non-submit buttons (default in our component)

## Do's and Don'ts

### Do
- Use the Button component for all interactive button elements
- Match button size to context (sm for compact, lg for mobile)
- Use loading state for async operations
- Provide clear, action-oriented labels
- Use IconButton for icon-only buttons with proper aria-label

### Don't
- Create custom button styles in component CSS modules
- Use anchor tags styled as buttons (use Link component instead)
- Mix button variants in the same action group
- Use danger variant for non-destructive actions
- Use native `<button>` elements with custom className

## Migration Guide

When migrating existing buttons:

1. Import Button or IconButton from `@/components/ui/Button`
2. Replace native `<button>` with `<Button>` or `<IconButton>`
3. Map existing className to appropriate variant/size
4. Remove deprecated CSS classes from module
5. Test all button states (hover, focus, disabled, loading)
6. Verify mobile responsiveness

### Example Migration

Before:
```tsx
<button 
  className={styles.submitButton}
  onClick={handleSubmit}
  disabled={isLoading}
>
  {isLoading ? 'Saving...' : 'Save'}
</button>
```

After:
```tsx
<Button
  variant="primary"
  size="md"
  onClick={handleSubmit}
  disabled={isLoading}
  loading={isLoading}
>
  {isLoading ? 'Saving...' : 'Save'}
</Button>
```

## Design Tokens

Button design tokens are defined in `frontend/src/styles/buttons.css`:

- `--btn-height-sm`: 28px
- `--btn-height-md`: 36px
- `--btn-height-lg`: 44px
- `--btn-padding-sm`: 4px 10px
- `--btn-padding-md`: 6px 16px
- `--btn-padding-lg`: 10px 24px
- `--btn-radius`: 6px
- `--btn-radius-pill`: 9999px
- `--btn-transition`: all 150ms ease
- `--btn-disabled-opacity`: 0.6