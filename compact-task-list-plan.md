# Compact Task List Implementation Plan

## Goal
Make the to-do list more compact and dense like Asana, especially on mobile. Currently tasks are too tall and take up too much vertical space.

## Design Inspiration (Asana)
Looking at Asana's list view:
- Tasks appear as thin horizontal rows (~28-32px on desktop)
- No individual card styling per task
- Simple border-bottom separation between tasks
- Checkbox is minimal (~16px)
- Category/project badges are compact inline pills
- Actions (edit, etc.) appear only on hover
- High information density - can see many tasks at once

## Current Problems

### 1. Task Item Height Contributors
| Element | Current Value | Contribution |
|---------|--------------|--------------|
| Task padding | 8px 16px | +16px vertical |
| Margin between tasks | 8px | +8px per task |
| Checkbox | 22px × 22px | Sets min height |
| Action button | 32px visible always | Forces min height |
| Task title padding | 8px vertical | +16px |
| **Total estimated row height** | ~50-60px | **Too tall** |

### 2. Visual Bulk
- Box shadows on each task
- Full border with radius (card appearance)
- Background color differentiation

## Implementation Plan

### Phase 1: TaskItem Compactness (Primary Focus)

#### 1.1 Reduce Padding & Margins
**File: `frontend/src/components/todos/TaskItem.module.css`**

```css
/* Before */
.taskItem {
  padding: var(--spacing-1) var(--spacing-2); /* 8px 16px */
  margin-bottom: var(--spacing-1); /* 8px */
}

/* After */
.taskItem {
  padding: 4px 8px; /* Reduced padding */
  margin-bottom: 0; /* Remove margin, use border instead */
  border-bottom: 1px solid var(--todo-border-color);
  border-radius: 0; /* Remove card radius */
  box-shadow: none; /* Remove shadow */
}
```

#### 1.2 Smaller Checkbox
```css
/* Before */
.checkbox {
  width: 22px;
  height: 22px;
  margin-right: var(--spacing-2); /* 16px */
}

/* After */
.checkbox {
  width: 16px;
  height: 16px;
  margin-right: 8px;
}
```

#### 1.3 Compact Category Indicator
```css
/* Before */
.categoryIndicator {
  padding: 3px 8px;
  border-radius: 12px;
  min-width: 70px;
}

/* After */
.categoryIndicator {
  padding: 2px 6px;
  border-radius: 4px;
  min-width: auto;
  font-size: 10px;
}
```

#### 1.4 Reduce Task Title Padding
```css
/* Before */
.taskTitle {
  padding: var(--spacing-1) 0; /* 8px 0 */
}

/* After */
.taskTitle {
  padding: 2px 0;
}
```

#### 1.5 Hide Actions Until Hover (Desktop)
```css
.actionButton {
  opacity: 0;
  transition: opacity 150ms ease;
  height: 24px;
  min-width: 24px;
}

.taskItem:hover .actionButton {
  opacity: 1;
}

/* Mobile: Always show */
@media (max-width: 768px) {
  .actionButton {
    opacity: 1;
  }
}
```

#### 1.6 Smaller Drag Handle (or hide by default)
```css
.dragHandle {
  width: 20px;
  height: 20px;
  margin-right: 4px;
  opacity: 0;
}

.taskItem:hover .dragHandle {
  opacity: 1;
}
```

### Phase 2: Day Container Adjustments

#### 2.1 Tighter Day Header
**File: `frontend/src/components/todos/TaskListContainer.module.css`**

```css
/* Before */
.dayHeader {
  margin-bottom: var(--spacing-2); /* 16px */
  padding-bottom: var(--spacing-1); /* 8px */
}

/* After */
.dayHeader {
  margin-bottom: 8px;
  padding-bottom: 4px;
}

/* Before */
.taskList {
  margin: var(--spacing-2) 0; /* 16px */
}

/* After */
.taskList {
  margin: 4px 0;
}
```

#### 2.2 Reduce Container Padding
```css
/* Before */
.dayContainer {
  padding: var(--spacing-2); /* 16px */
}

/* After */
.dayContainer {
  padding: 8px 12px;
}
```

### Phase 3: Mobile-Specific Optimizations

Mobile needs slightly larger touch targets but can still be more compact:

```css
@media (max-width: 768px) {
  .taskItem {
    padding: 6px 8px; /* Slightly more for touch */
    min-height: 36px; /* Touch target */
  }
  
  .checkbox {
    width: 18px;
    height: 18px;
  }
  
  .categoryIndicator {
    padding: 2px 4px;
    font-size: 9px;
  }
  
  .actionButton {
    height: 32px;
    width: 32px;
    /* Keep visible on mobile since no hover */
  }
}
```

### Phase 4: Optional - Remove Rolled Over Indicator Badge

The "rolled over" indicator adds width and complexity. Consider:
- Making it a subtle icon instead of text
- Showing it only on hover
- Using a small dot indicator

```css
.rolledOverIndicator {
  /* Consider hiding or making smaller */
  display: none; /* Or show on hover */
}

.rolledOver {
  /* Add subtle visual cue instead */
  border-left: 2px solid var(--priority-color);
}
```

## Expected Results

### Before
- Estimated task row height: ~50-60px
- Tasks visible in viewport: ~8-10

### After  
- Target task row height: ~32-36px (desktop), ~40px (mobile)
- Tasks visible in viewport: ~15-20 (nearly 2x more)

## Component Changes Summary

| File | Changes |
|------|---------|
| `TaskItem.module.css` | Padding, margins, checkbox size, action visibility, shadows |
| `TaskListContainer.module.css` | Day header spacing, container padding |
| `TodoVariables.css` | Optionally add compact spacing variables |
| `TaskItem.tsx` | No structural changes needed |

## Implementation Order

1. **Start with TaskItem.module.css** - biggest impact
2. **Test on both desktop and mobile**
3. **Adjust TaskListContainer.module.css** for container spacing
4. **Fine-tune mobile breakpoints**
5. **Consider user preference toggle** (optional, future)

## Accessibility Considerations

- Maintain minimum touch target of 36px on mobile (currently we go down to 32px)
- Ensure focus states remain visible
- Keep sufficient contrast for text/indicators
- Consider adding a "comfortable" vs "compact" view toggle in the future

## Testing Checklist

- [ ] Desktop Chrome: Tasks compact and readable
- [ ] Mobile Safari: Touch targets adequate
- [ ] Mobile Chrome: Touch targets adequate  
- [ ] Drag and drop still works
- [ ] Hover states work on desktop
- [ ] Actions accessible on mobile
- [ ] Completed tasks still visually distinct
- [ ] Priority indicator still visible
- [ ] Category badges readable
- [ ] "Rolled over" indicator still works