import React from 'react';
import { TaskListContainer } from './TaskListContainer';
import { TodoProvider } from '../../context/TodoContext';

export const TodoPlaceholder: React.FC = () => {
  return (
    <TodoProvider>
      <TaskListContainer />
    </TodoProvider>
  );
};