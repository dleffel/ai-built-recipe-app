import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { jest, describe, it, beforeEach, expect } from '@jest/globals';
import { TaskListContainer } from '../components/todos/TaskListContainer';
import { TodoProvider } from '../context/TodoContext';
import { AuthProvider } from '../context/AuthContext';
import { todoApi, Task } from '../services/todoApi';
import { MockFn } from '../setupTests';

// Mock react-window and react-window-infinite-loader
jest.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount }: any) => {
    const items: React.ReactNode[] = [];
    for (let i = 0; i < itemCount; i++) {
      items.push(children({ index: i, style: {} }));
    }
    return <div data-testid="virtualized-list">{items}</div>;
  }
}));

jest.mock('react-window-infinite-loader', () => ({
  __esModule: true,
  default: ({ children, itemCount }: any) => {
    return children({
      onItemsRendered: () => {},
      ref: () => {}
    });
  }
}));

// Mock the TodoContext
jest.mock('../context/TodoContext', () => ({
  __esModule: true,
  TodoProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useTodo: jest.fn()
}));

// Mock the AuthContext
jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(() => ({ user: { id: 'test-user-id' } })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock the TaskItem component
jest.mock('../components/todos/TaskItem', () => ({
  TaskItem: ({ 
    id, 
    title, 
    completed, 
    category, 
    isPriority, 
    isRolledOver,
    onToggleComplete,
    onEdit,
    onDragStart,
    onDragEnd
  }: any) => (
    <div 
      data-testid={`task-item-${id}`}
      data-completed={completed}
      data-category={category}
      data-priority={isPriority}
      data-rolled-over={isRolledOver}
    >
      <span>{title}</span>
      <button 
        data-testid={`toggle-${id}`} 
        onClick={onToggleComplete}
      >
        {completed ? 'Mark Incomplete' : 'Mark Complete'}
      </button>
      <button 
        data-testid={`edit-${id}`} 
        onClick={onEdit}
      >
        Edit
      </button>
    </div>
  )
}));

// Mock the TaskCreation component
jest.mock('../components/todos/TaskCreation', () => ({
  TaskCreation: ({ onCancel, onSave }: any) => (
    <div data-testid="task-creation">
      <input 
        data-testid="task-title-input" 
        placeholder="Task title" 
      />
      <select data-testid="task-category-select">
        <option value="Roo Vet">Roo Vet</option>
        <option value="Roo Code">Roo Code</option>
        <option value="Personal">Personal</option>
      </select>
      <label>
        <input 
          type="checkbox" 
          data-testid="task-priority-checkbox" 
        />
        High Priority
      </label>
      <button 
        data-testid="save-task-button" 
        onClick={() => onSave({ 
          title: 'New Task', 
          category: 'Roo Code', 
          isPriority: false 
        })}
      >
        Save
      </button>
      <button 
        data-testid="cancel-task-button" 
        onClick={onCancel}
      >
        Cancel
      </button>
    </div>
  )
}));

// Mock the TaskEdit component
jest.mock('../components/todos/TaskEdit', () => ({
  TaskEdit: ({ id, title, category, isPriority, onCancel, onSave, onDelete }: any) => (
    <div data-testid={`task-edit-${id}`}>
      <input 
        data-testid={`edit-title-${id}`} 
        defaultValue={title} 
      />
      <select 
        data-testid={`edit-category-${id}`} 
        defaultValue={category}
      >
        <option value="Roo Vet">Roo Vet</option>
        <option value="Roo Code">Roo Code</option>
        <option value="Personal">Personal</option>
      </select>
      <label>
        <input 
          type="checkbox" 
          data-testid={`edit-priority-${id}`} 
          defaultChecked={isPriority} 
        />
        High Priority
      </label>
      <button 
        data-testid={`save-edit-${id}`} 
        onClick={() => onSave({ 
          id, 
          title: 'Updated Task', 
          category, 
          isPriority 
        })}
      >
        Save
      </button>
      <button 
        data-testid={`cancel-edit-${id}`} 
        onClick={onCancel}
      >
        Cancel
      </button>
      <button 
        data-testid={`delete-task-${id}`} 
        onClick={() => onDelete(id)}
      >
        Delete
      </button>
    </div>
  )
}));

// Sample tasks for testing
const mockTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Test Task 1',
    status: 'incomplete',
    dueDate: new Date().toISOString(),
    category: 'Roo Code',
    isPriority: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
    isRolledOver: false,
    displayOrder: 0,
    userId: 'test-user-id'
  },
  {
    id: 'task-2',
    title: 'Test Task 2',
    status: 'complete',
    dueDate: new Date().toISOString(),
    category: 'Roo Vet',
    isPriority: true,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    isRolledOver: false,
    displayOrder: 10,
    userId: 'test-user-id'
  }
];

// Group tasks by day for testing
const today = new Date();
const todayKey = today.toISOString().split('T')[0];
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowKey = tomorrow.toISOString().split('T')[0];

const mockTasksByDay = {
  [todayKey]: [mockTasks[0]],
  [tomorrowKey]: [mockTasks[1]]
};

// Mock useTodo hook
const mockFetchTasks = jest.fn();
const mockCreateTask = jest.fn();
const mockUpdateTask = jest.fn();
const mockDeleteTask = jest.fn();
const mockMoveTask = jest.fn();
const mockReorderTask = jest.fn();

// Default mock implementation
const mockUseTodo = (overrides = {}) => ({
  tasks: mockTasks,
  tasksByDay: mockTasksByDay,
  loading: false,
  error: null,
  fetchTasks: mockFetchTasks,
  fetchTasksByDate: jest.fn(),
  createTask: mockCreateTask,
  updateTask: mockUpdateTask,
  deleteTask: mockDeleteTask,
  moveTask: mockMoveTask,
  reorderTask: mockReorderTask,
  checkForRolloverTasks: jest.fn(),
  ...overrides
});

describe('TaskListContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up the mock implementation for useTodo
    const { useTodo } = require('../context/TodoContext');
    (useTodo as jest.Mock).mockImplementation(() => mockUseTodo());
  });

  it('renders task lists for today, tomorrow, and day after tomorrow', async () => {
    // Mock the formatDate function to return predictable values
    jest.spyOn(global.Date.prototype, 'toLocaleDateString').mockImplementation((locale, options) => {
      if (options?.weekday === 'long') {
        return 'Wednesday, April 16'; // Mock for today
      }
      return '';
    });
    
    render(<TaskListContainer />);
    
    // Check for the today container which should be rendered
    expect(screen.getByText('TODAY - Wednesday, April 16')).toBeInTheDocument();
    
    // Check for tasks
    expect(screen.getByTestId('task-item-task-1')).toBeInTheDocument();
    expect(screen.getByTestId('task-item-task-2')).toBeInTheDocument();
    
    // Restore the original implementation
    (global.Date.prototype.toLocaleDateString as jest.Mock).mockRestore();
    
    // Check task properties
    expect(screen.getByTestId('task-item-task-1')).toHaveAttribute('data-completed', 'false');
    expect(screen.getByTestId('task-item-task-2')).toHaveAttribute('data-completed', 'true');
    expect(screen.getByTestId('task-item-task-1')).toHaveAttribute('data-category', 'Roo Code');
    expect(screen.getByTestId('task-item-task-2')).toHaveAttribute('data-category', 'Roo Vet');
    expect(screen.getByTestId('task-item-task-1')).toHaveAttribute('data-priority', 'false');
    expect(screen.getByTestId('task-item-task-2')).toHaveAttribute('data-priority', 'true');
  });

  it('fetches tasks on mount', () => {
    render(<TaskListContainer />);
    expect(mockFetchTasks).toHaveBeenCalledTimes(1);
  });

  it('shows loading state when loading', async () => {
    // Clear any previous renders
    document.body.innerHTML = '';
    
    // Get the useTodo mock
    const { useTodo } = require('../context/TodoContext');
    
    // Set up the mock implementation for useTodo with loading=true
    (useTodo as jest.Mock).mockImplementation(() => ({
      ...mockUseTodo(),
      loading: true
    }));
    
    // Render with loading=true
    const { unmount } = render(<TaskListContainer />);
    expect(screen.getByText('Loading tasks...')).toBeInTheDocument();
    
    // Unmount the component
    unmount();
    
    // Update the mock to set loading to false
    (useTodo as jest.Mock).mockImplementation(() => ({
      ...mockUseTodo(),
      loading: false
    }));
    
    // Re-render with the updated mock
    render(<TaskListContainer />);
    
    // Verify the loading state is no longer displayed
    expect(screen.queryByText('Loading tasks...')).not.toBeInTheDocument();
  });

  it('shows error state when there is an error', async () => {
    // Clear any previous renders
    document.body.innerHTML = '';
    
    // Get the useTodo mock again
    const { useTodo: useTodoWithError } = require('../context/TodoContext');
    
    // Set up the mock implementation for useTodo with an error
    (useTodoWithError as jest.Mock).mockImplementation(() => ({
      ...mockUseTodo(),
      error: 'Failed to fetch tasks',
      loading: false
    }));
    
    // Render with error
    const { unmount } = render(<TaskListContainer />);
    expect(screen.getByText('Failed to fetch tasks')).toBeInTheDocument();
    
    // Unmount the component
    unmount();
    
    // Get the useTodo mock again
    const { useTodo: useTodoClearError } = require('../context/TodoContext');
    
    // Update the mock to clear the error
    (useTodoClearError as jest.Mock).mockImplementation(() => ({
      ...mockUseTodo(),
      error: null,
      loading: false
    }));
    
    // Re-render with the updated mock
    render(<TaskListContainer />);
    
    // Verify the error is no longer displayed
    expect(screen.queryByText('Failed to fetch tasks')).not.toBeInTheDocument();
  });

  it('opens task creation form when add task button is clicked', async () => {
    const { useTodo } = require('../context/TodoContext');
    (useTodo as jest.Mock).mockImplementation(() => mockUseTodo({ loading: false }));
    
    render(<TaskListContainer />);
    
    // Ensure loading is complete
    await waitFor(() => {
      expect(screen.queryByText('Loading tasks...')).not.toBeInTheDocument();
    });
    
    // Click the add task button for today
    const addTaskButtons = screen.getAllByText('Add task');
    await userEvent.click(addTaskButtons[0]);
    
    // Check if the task creation form is displayed
    expect(screen.getByTestId('task-creation')).toBeInTheDocument();
  });

  it('creates a new task when the form is submitted', async () => {
    const { useTodo } = require('../context/TodoContext');
    (useTodo as jest.Mock).mockImplementation(() => mockUseTodo({ loading: false }));
    
    render(<TaskListContainer />);
    
    // Ensure loading is complete
    await waitFor(() => {
      expect(screen.queryByText('Loading tasks...')).not.toBeInTheDocument();
    });
    
    // Click the add task button for today
    const addTaskButtons = screen.getAllByText('Add task');
    await userEvent.click(addTaskButtons[0]);
    
    // Check if the task creation form is displayed
    await waitFor(() => {
      expect(screen.getByTestId('task-creation')).toBeInTheDocument();
    });
    
    // Submit the form
    await userEvent.click(screen.getByTestId('save-task-button'));
    
    // Check if createTask was called with the correct parameters
    expect(mockCreateTask).toHaveBeenCalledWith({
      title: 'New Task',
      category: 'Roo Code',
      isPriority: false,
      status: 'incomplete',
      dueDate: expect.any(String),
      displayOrder: expect.any(Number)
    });
  });

  it('toggles task completion status when toggle button is clicked', async () => {
    const { useTodo } = require('../context/TodoContext');
    (useTodo as jest.Mock).mockImplementation(() => mockUseTodo({ loading: false }));
    
    render(<TaskListContainer />);
    
    // Ensure loading is complete
    await waitFor(() => {
      expect(screen.queryByText('Loading tasks...')).not.toBeInTheDocument();
    });
    
    // With virtualization mocked, we should be able to find the task item
    expect(screen.getByTestId('task-item-task-1')).toBeInTheDocument();
    
    // Find and click the toggle button for task 1
    const toggleButton = screen.getByTestId('toggle-task-1');
    await userEvent.click(toggleButton);
    
    // Check if updateTask was called with the correct parameters
    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', {
      status: 'complete'
    });
  });

  it('opens task edit form when edit button is clicked', async () => {
    const { useTodo } = require('../context/TodoContext');
    (useTodo as jest.Mock).mockImplementation(() => mockUseTodo({ loading: false }));
    
    render(<TaskListContainer />);
    
    // Ensure loading is complete
    await waitFor(() => {
      expect(screen.queryByText('Loading tasks...')).not.toBeInTheDocument();
    });
    
    // With virtualization mocked, we should be able to find the task item
    expect(screen.getByTestId('task-item-task-1')).toBeInTheDocument();
    
    // Find and click the edit button for task 1
    const editButton = screen.getByTestId('edit-task-1');
    await userEvent.click(editButton);
    
    // Check if the task edit form is displayed
    expect(screen.getByTestId('task-edit-task-1')).toBeInTheDocument();
  });

  it('updates a task when the edit form is submitted', async () => {
    const { useTodo } = require('../context/TodoContext');
    (useTodo as jest.Mock).mockImplementation(() => mockUseTodo({ loading: false }));
    
    render(<TaskListContainer />);
    
    // Ensure loading is complete
    await waitFor(() => {
      expect(screen.queryByText('Loading tasks...')).not.toBeInTheDocument();
    });
    
    // With virtualization mocked, we should be able to find the task item
    expect(screen.getByTestId('task-item-task-1')).toBeInTheDocument();
    
    // Find and click the edit button for task 1
    const editButton = screen.getByTestId('edit-task-1');
    await userEvent.click(editButton);
    
    // Check if the task edit form is displayed
    expect(screen.getByTestId('task-edit-task-1')).toBeInTheDocument();
    
    // Find and click the save button
    const saveButton = screen.getByTestId('save-edit-task-1');
    await userEvent.click(saveButton);
    
    // Check if updateTask was called with the correct parameters
    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', {
      title: 'Updated Task',
      category: 'Roo Code',
      isPriority: false
    });
  });

  it('deletes a task when the delete button is clicked', async () => {
    // Mock window.confirm to always return true
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => true);
    
    const { useTodo } = require('../context/TodoContext');
    (useTodo as jest.Mock).mockImplementation(() => mockUseTodo({ loading: false }));
    
    render(<TaskListContainer />);
    
    // Ensure loading is complete
    await waitFor(() => {
      expect(screen.queryByText('Loading tasks...')).not.toBeInTheDocument();
    });
    
    // With virtualization mocked, we should be able to find the task item
    expect(screen.getByTestId('task-item-task-1')).toBeInTheDocument();
    
    // Find and click the edit button for task 1
    const editButton = screen.getByTestId('edit-task-1');
    await userEvent.click(editButton);
    
    // Find and click the delete button
    const deleteButton = screen.getByTestId('delete-task-task-1');
    await userEvent.click(deleteButton);
    
    // Check if deleteTask was called with the correct parameters
    expect(mockDeleteTask).toHaveBeenCalledWith('task-1');
    
    // Restore original confirm
    window.confirm = originalConfirm;
  });
});