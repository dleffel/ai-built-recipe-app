import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { jest, describe, it, beforeEach, expect } from '@jest/globals';
import { TaskListContainer } from '../components/todos/TaskListContainer';
import { TodoProvider } from '../context/TodoContext';
import { AuthProvider } from '../context/AuthContext';
import { Task } from '../services/todoApi';
import { MockFn } from '../setupTests';

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

// Mock the DayContainer component
jest.mock('../components/todos/DayContainer', () => ({
  DayContainer: ({ 
    dayKey,
    date,
    isToday,
    tasks,
    editingTaskId,
    creatingTaskForDay,
    onToggleComplete,
    onEdit,
    onUpdate,
    onDelete,
    onAddTaskClick,
    onCreateTask,
    onDragStart,
    onDragOver,
    onDrop
  }: any) => (
    <div 
      data-testid={`day-container-${dayKey}`}
      data-is-today={isToday}
    >
      <h2>{isToday ? 'TODAY - ' : ''}{date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
      <div data-testid={`task-list-${dayKey}`}>
        {tasks.map((task: Task) => (
          <div 
            key={task.id}
            data-testid={`task-item-${task.id}`}
            data-completed={task.status === 'complete'}
            data-category={task.category}
            data-priority={task.isPriority}
            data-rolled-over={task.isRolledOver}
          >
            <span>{task.title}</span>
            <button 
              data-testid={`toggle-${task.id}`} 
              onClick={() => onToggleComplete(task)}
            >
              {task.status === 'complete' ? 'Mark Incomplete' : 'Mark Complete'}
            </button>
            <button 
              data-testid={`edit-${task.id}`} 
              onClick={() => onEdit(task.id)}
            >
              Edit
            </button>
          </div>
        ))}
        {editingTaskId && (
          <div data-testid={`task-edit-${editingTaskId}`}>
            <button 
              data-testid={`save-edit-${editingTaskId}`} 
              onClick={() => onUpdate({ 
                id: editingTaskId, 
                title: 'Updated Task', 
                category: 'Roo Code', 
                isPriority: false 
              })}
            >
              Save
            </button>
            <button 
              data-testid={`cancel-edit-${editingTaskId}`} 
              onClick={() => onEdit('')}
            >
              Cancel
            </button>
            <button 
              data-testid={`delete-task-${editingTaskId}`} 
              onClick={() => onDelete(editingTaskId)}
            >
              Delete
            </button>
          </div>
        )}
        {creatingTaskForDay === dayKey && (
          <div data-testid="task-creation">
            <button 
              data-testid="save-task-button" 
              onClick={() => onCreateTask(dayKey, { 
                title: 'New Task', 
                category: 'Roo Code', 
                isPriority: false 
              })}
            >
              Save
            </button>
            <button 
              data-testid="cancel-task-button" 
              onClick={() => onAddTaskClick(dayKey)}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      <button 
        data-testid={`add-task-button-${dayKey}`}
        onClick={() => onAddTaskClick(dayKey)}
      >
        Add task
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
const mockLoadMorePastTasks = jest.fn();
const mockLoadMoreFutureTasks = jest.fn();

// Default mock implementation
const mockUseTodo = (overrides = {}) => ({
  tasks: mockTasks,
  tasksByDay: mockTasksByDay,
  loading: false,
  error: null,
  fetchTasks: mockFetchTasks,
  createTask: mockCreateTask,
  updateTask: mockUpdateTask,
  deleteTask: mockDeleteTask,
  moveTask: mockMoveTask,
  reorderTask: mockReorderTask,
  loadMorePastTasks: mockLoadMorePastTasks,
  loadMoreFutureTasks: mockLoadMoreFutureTasks,
  hasMorePastTasks: false,
  hasMoreFutureTasks: false,
  isLoadingMore: false,
  ...overrides
});

describe('TaskListContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up the mock implementation for useTodo
    const { useTodo } = require('../context/TodoContext');
    (useTodo as jest.Mock).mockImplementation(() => mockUseTodo());
  });

  it('renders task lists for today and other days', async () => {
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
    expect(screen.getByTestId(`task-item-task-1`)).toBeInTheDocument();
    expect(screen.getByTestId(`task-item-task-2`)).toBeInTheDocument();
    
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

  // Note: We removed the test for 'fetches tasks on mount' since the component
  // no longer directly calls fetchTasks on mount. This functionality is now
  // handled by the TodoContext provider.

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
    expect(screen.getByText('Error loading tasks: Failed to fetch tasks')).toBeInTheDocument();
    
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
    expect(screen.queryByText('Error loading tasks: Failed to fetch tasks')).not.toBeInTheDocument();
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
    const addTaskButton = screen.getByTestId(`add-task-button-${todayKey}`);
    await userEvent.click(addTaskButton);
    
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
    const addTaskButton = screen.getByTestId(`add-task-button-${todayKey}`);
    await userEvent.click(addTaskButton);
    
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
    
    // Find and click the edit button for task 1
    const editButton = screen.getByTestId('edit-task-1');
    await userEvent.click(editButton);
    
    // Check if the task edit form is displayed
    const editForms = screen.getAllByTestId('task-edit-task-1');
    expect(editForms.length).toBeGreaterThan(0);
  });

  it('updates a task when the edit form is submitted', async () => {
    const { useTodo } = require('../context/TodoContext');
    (useTodo as jest.Mock).mockImplementation(() => mockUseTodo({ loading: false }));
    
    render(<TaskListContainer />);
    
    // Ensure loading is complete
    await waitFor(() => {
      expect(screen.queryByText('Loading tasks...')).not.toBeInTheDocument();
    });
    
    // Find and click the edit button for task 1
    const editButton = screen.getByTestId('edit-task-1');
    await userEvent.click(editButton);
    
    // Check if the task edit form is displayed
    const editForms = screen.getAllByTestId('task-edit-task-1');
    expect(editForms.length).toBeGreaterThan(0);
    
    // Find and click the save button
    const saveButton = screen.getAllByTestId('save-edit-task-1')[0];
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
    
    // Find and click the edit button for task 1
    const editButton = screen.getByTestId('edit-task-1');
    await userEvent.click(editButton);
    
    // Find and click the delete button
    const deleteButton = screen.getAllByTestId('delete-task-task-1')[0];
    await userEvent.click(deleteButton);
    
    // Check if deleteTask was called with the correct parameters
    expect(mockDeleteTask).toHaveBeenCalledWith('task-1');
    
    // Restore original confirm
    window.confirm = originalConfirm;
  });
  
  describe('Progressive loading functionality', () => {
    it('should render load more buttons when there are more tasks to load', async () => {
      const { useTodo } = require('../context/TodoContext');
      (useTodo as jest.Mock).mockImplementation(() => mockUseTodo({
        hasMorePastTasks: true,
        hasMoreFutureTasks: true
      }));
      
      render(<TaskListContainer />);
      
      // Check if both load more buttons are displayed
      expect(screen.getByText('Load earlier tasks')).toBeInTheDocument();
      expect(screen.getByText('Load more future tasks')).toBeInTheDocument();
    });
    
    it('should not render load more buttons when there are no more tasks to load', async () => {
      const { useTodo } = require('../context/TodoContext');
      (useTodo as jest.Mock).mockImplementation(() => mockUseTodo({
        hasMorePastTasks: false,
        hasMoreFutureTasks: false
      }));
      
      render(<TaskListContainer />);
      
      // Check that load more buttons are not displayed
      expect(screen.queryByText('Load earlier tasks')).not.toBeInTheDocument();
      expect(screen.queryByText('Load more future tasks')).not.toBeInTheDocument();
    });
    
    it('should show loading indicators when loading more tasks', async () => {
      const { useTodo } = require('../context/TodoContext');
      (useTodo as jest.Mock).mockImplementation(() => mockUseTodo({
        hasMorePastTasks: true,
        hasMoreFutureTasks: true,
        isLoadingMore: true
      }));
      
      render(<TaskListContainer />);
      
      // Check if loading indicators are displayed
      const loadingElements = screen.getAllByText('Loading...');
      expect(loadingElements.length).toBeGreaterThan(0);
    });
    
    it('should call loadMorePastTasks when past load more button is clicked', async () => {
      const { useTodo } = require('../context/TodoContext');
      (useTodo as jest.Mock).mockImplementation(() => mockUseTodo({
        hasMorePastTasks: true,
        hasMoreFutureTasks: false
      }));
      
      render(<TaskListContainer />);
      
      // Click the load more past tasks button
      const loadMorePastButton = screen.getByText('Load earlier tasks');
      await userEvent.click(loadMorePastButton);
      
      // Check if loadMorePastTasks was called
      expect(mockLoadMorePastTasks).toHaveBeenCalledTimes(1);
    });
    
    it('should call loadMoreFutureTasks when future load more button is clicked', async () => {
      const { useTodo } = require('../context/TodoContext');
      (useTodo as jest.Mock).mockImplementation(() => mockUseTodo({
        hasMorePastTasks: false,
        hasMoreFutureTasks: true
      }));
      
      render(<TaskListContainer />);
      
      // Click the load more future tasks button
      const loadMoreFutureButton = screen.getByText('Load more future tasks');
      await userEvent.click(loadMoreFutureButton);
      
      // Check if loadMoreFutureTasks was called
      expect(mockLoadMoreFutureTasks).toHaveBeenCalledTimes(1);
    });
  });
});