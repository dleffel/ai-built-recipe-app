# Task Date Picker Implementation Plan

## Overview

Currently, the task management system allows users to move tasks between days using drag-and-drop functionality. The user wants to add the ability to set an arbitrary date for a task directly through the UI, making it easier to schedule tasks for future dates without having to drag them.

## Current Implementation

From analyzing the codebase, I've found:

1. Tasks have a `dueDate` field (DateTime type) in the database model.
2. The frontend represents tasks with a `Task` interface that includes a `dueDate` string.
3. Tasks can be created through the `TaskCreation` component, which currently doesn't allow date selection.
4. Tasks can be edited through the `TaskEdit` component, which also doesn't have date selection.
5. Tasks can be moved between days using drag-and-drop in the `TaskListContainer` component.
6. The application uses timezone-aware date handling with PT (Pacific Time) as the reference.

## Implementation Plan

### 1. Update TaskEdit Component

Add a date picker to the `TaskEdit` component to allow users to change a task's date:

1. Import a date picker component (we can use a library like react-datepicker or build a custom one).
2. Add the date picker to the form in `TaskEdit.tsx`.
3. Add state to manage the selected date.
4. Update the `handleSubmit` function to include the selected date in the task update.
5. Update the `TaskEditProps` interface to include the `dueDate` property.

### 2. Update TaskCreation Component

Similarly, add a date picker to the `TaskCreation` component:

1. Import the same date picker component.
2. Add the date picker to the form in `TaskCreation.tsx`.
3. Add state to manage the selected date (defaulting to the day for which the task is being created).
4. Update the `handleSubmit` function to include the selected date.

### 3. Update TodoContext and API Calls

Ensure the context and API calls properly handle the date updates:

1. The existing `updateTask` and `moveTask` functions in `TodoContext.tsx` already handle date changes.
2. The `todoApi.ts` service already has methods for updating task dates with proper timezone handling.

### 4. UI/UX Considerations

1. Add a calendar icon button next to each task that opens the date picker.
2. Ensure the date picker is accessible and works well on mobile devices.
3. Add visual feedback when a task's date is changed.
4. Consider adding a "quick date" selection for common options (today, tomorrow, next week).

### 5. Testing

1. Test that the date picker correctly displays the current task date.
2. Test that selecting a new date updates the task correctly.
3. Test timezone handling to ensure dates are consistent.
4. Test edge cases like selecting dates in the past or far future.

## Technical Details

### Component Changes

#### TaskEdit.tsx

```tsx
// Add to imports
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { createPTDate } from '../../utils/timezoneUtils';

// Update TaskEditProps interface
interface TaskEditProps {
  id: string;
  title: string;
  category: TaskCategory;
  isPriority: boolean;
  dueDate: string; // Add this line
  onCancel?: () => void;
  onSave?: (taskData: {
    id: string;
    title: string;
    category: string;
    isPriority: boolean;
    dueDate?: string; // Add this line
  }) => void;
  onDelete?: (id: string) => void;
}

// Add to component state
const [selectedDate, setSelectedDate] = useState<Date>(new Date(dueDate));

// Add to form JSX
<div className={styles.datePickerContainer}>
  <label>Due Date</label>
  <DatePicker
    selected={selectedDate}
    onChange={(date: Date) => setSelectedDate(date)}
    dateFormat="yyyy-MM-dd"
    className={styles.datePicker}
  />
</div>

// Update in handleSubmit
await onSave({
  id,
  title: title.trim(),
  category,
  isPriority,
  dueDate: selectedDate.toISOString(), // Add this line
});
```

#### TaskCreation.tsx

Similar changes to TaskEdit.tsx, but defaulting the date to the day for which the task is being created.

### CSS Changes

Add styles for the date picker in the respective CSS modules:

```css
.datePickerContainer {
  margin-bottom: 10px;
}

.datePicker {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}
```

## Implementation Steps

1. Install a date picker library if needed (e.g., `npm install react-datepicker @types/react-datepicker`).
2. Update the TaskEdit component to include the date picker.
3. Update the TaskCreation component to include the date picker.
4. Add necessary CSS styles for the date picker.
5. Test the implementation thoroughly.

This implementation will allow users to easily set arbitrary dates for tasks without having to drag them, making the task management system more flexible and user-friendly.