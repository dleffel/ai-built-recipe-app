import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../../services/todoApi';
import { TaskItem } from './TaskItem';
import styles from './TaskItem.module.css';

interface SortableTaskItemProps {
  task: Task;
  onToggleComplete: () => void;
  onEdit: () => void;
  isMoving?: boolean;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onSelectionToggle?: () => void;
}

export const SortableTaskItem: React.FC<SortableTaskItemProps> = ({
  task,
  onToggleComplete,
  onEdit,
  isMoving = false,
  isSelectMode = false,
  isSelected = false,
  onSelectionToggle
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: isSelectMode,
    data: {
      task,
      type: 'task',
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    touchAction: isSelectMode ? 'auto' : 'none', // Important for touch devices
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? styles.dragging : ''}`}
      data-id={task.id}
    >
      <TaskItem
        task={task}
        onToggleComplete={onToggleComplete}
        onEdit={onEdit}
        // Pass empty handlers since drag is handled by dnd-kit
        onDragStart={() => {}}
        onDragOver={() => {}}
        onDrop={() => {}}
        isMoving={isMoving || isDragging}
        isSelectMode={isSelectMode}
        isSelected={isSelected}
        onSelectionToggle={onSelectionToggle}
        // Pass dnd-kit listeners and attributes for the drag handle
        dragHandleProps={{ ...listeners, ...attributes }}
      />
    </div>
  );
};