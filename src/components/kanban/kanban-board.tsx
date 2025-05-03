"use client"

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { KanbanColumn } from './kanban-column';
import { Task, TaskStatus } from '@/types/task';
import { groupTasksByStatus } from '@/lib/task-utils';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskMove: (taskId: string, newStatus: TaskStatus) => void;
  isAdmin: boolean;
}

const columnOrder: TaskStatus[] = [
  TaskStatus.ToBeStarted,
  TaskStatus.InProgress,
  TaskStatus.Completed,
  TaskStatus.Submitted,
  TaskStatus.Done,
];

export function KanbanBoard({ tasks, onTaskMove, isAdmin }: KanbanBoardProps) {
  const [groupedTasks, setGroupedTasks] = useState(groupTasksByStatus(tasks));

  useEffect(() => {
    setGroupedTasks(groupTasksByStatus(tasks));
  }, [tasks]);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Dropped outside a droppable area
    if (!destination) {
      return;
    }

    // Dropped in the same place
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const startColumnStatus = source.droppableId as TaskStatus;
    const endColumnStatus = destination.droppableId as TaskStatus;
    const taskId = draggableId;

    // Student restriction: Cannot move *to* 'Done'
    if (!isAdmin && endColumnStatus === TaskStatus.Done) {
      console.log("Student cannot move task to Done column.");
      // Optionally show a toast message here
      return;
    }

     // Student restriction: Cannot move *from* 'Done' (already handled by admin only move to Done)
     // Admin can move freely


    // Call the handler passed from the parent (DashboardPage)
    onTaskMove(taskId, endColumnStatus);

     // Optimistic update (commented out - handled by parent state update via useEffect)
    /*
    const startColumnTasks = Array.from(groupedTasks[startColumnStatus] || []);
    const [movedTask] = startColumnTasks.splice(source.index, 1);

    const endColumnTasks = Array.from(groupedTasks[endColumnStatus] || []);
    endColumnTasks.splice(destination.index, 0, { ...movedTask, status: endColumnStatus });

    setGroupedTasks(prev => ({
      ...prev,
      [startColumnStatus]: startColumnTasks,
      [endColumnStatus]: endColumnTasks,
    }));
    */
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {columnOrder.map((status) => {
          const columnTasks = groupedTasks[status] || [];
          // Determine if the column is droppable based on role
          const isDroppable = isAdmin || (status !== TaskStatus.Done);

          return (
            <KanbanColumn
              key={status}
              status={status}
              tasks={columnTasks}
              isAdmin={isAdmin}
              isDroppable={isDroppable}
            />
          );
        })}
      </div>
    </DragDropContext>
  );
}
