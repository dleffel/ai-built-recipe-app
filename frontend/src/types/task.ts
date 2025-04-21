export interface DragTask {
  id: string;
  dayKey: string;
  originalIndex: number;
}

export interface TaskMoveResult {
  taskId: string;
  newDayKey: string;
  newIndex: number;
}