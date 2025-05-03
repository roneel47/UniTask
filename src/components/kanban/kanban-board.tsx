"use client"

import React, { useState, useEffect } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd'; // No need for Droppable, Draggable here
import { KanbanColumn } from './kanban-column';
import { Task, TaskStatus } from '@/types/task';
import { groupTasksByStatus } from '@/lib/task-utils';
import { useAuth } from '@/hooks/use-auth'; // Import useAuth
import { useToast } from '@/hooks/use-toast'; // Import useToast


interface KanbanBoardProps {
  tasks: Task[]; // Tasks are passed down, likely already filtered
  // onTaskMove is now handled internally via context
  // onTaskMove: (taskId: string, newStatus: TaskStatus) => void;
  isAdmin: boolean;
}

const columnOrder: TaskStatus[] = [
  TaskStatus.ToBeStarted,
  TaskStatus.InProgress,
  TaskStatus.Completed,
  TaskStatus.Submitted,
  TaskStatus.Done,
];

export function KanbanBoard({ tasks, isAdmin }: KanbanBoardProps) {
  const { updateTask } = useAuth(); // Get updateTask from context
  const { toast } = useToast(); // Get toast function
  const [groupedTasks, setGroupedTasks] = useState(groupTasksByStatus(tasks));


  // Update grouped tasks whenever the tasks prop changes (from context update)
  useEffect(() => {
    setGroupedTasks(groupTasksByStatus(tasks));
  }, [tasks]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const startColumnStatus = source.droppableId as TaskStatus; // Status before drag
    const endColumnStatus = destination.droppableId as TaskStatus; // Target status
    const taskId = draggableId;

    // Find the task being moved to check its current state if needed
    // const movedTask = tasks.find(task => task.id === taskId);
    // if (!movedTask) return; // Should not happen

    // --- Role-Based Restrictions ---
    // Student cannot move TO 'Done'
    if (!isAdmin && endColumnStatus === TaskStatus.Done) {
       toast({
            variant: "destructive",
            title: "Action Denied",
            description: "Only administrators can mark tasks as 'Done'.",
       });
      return;
    }

     // Student cannot move FROM 'Done'
    if (!isAdmin && startColumnStatus === TaskStatus.Done) {
       toast({
            variant: "destructive",
            title: "Action Denied",
            description: "Tasks marked as 'Done' cannot be moved back.",
       });
       return;
    }

     // Student cannot move FROM 'Submitted' (unless admin allows edits maybe?)
     // Let's enforce this for now. Admin can move from Submitted.
     if (!isAdmin && startColumnStatus === TaskStatus.Submitted && endColumnStatus !== TaskStatus.Submitted) {
        toast({
            variant: "destructive",
            title: "Action Denied",
            description: "Submitted tasks cannot be moved back without admin review.",
        });
        return;
     }

     // --- Call Context Update ---
     // No optimistic update needed here, useEffect will refresh columns when context state changes
    console.log(`Attempting move: Task ${taskId} from ${startColumnStatus} to ${endColumnStatus}`);
    try {
      await updateTask(taskId, { status: endColumnStatus });
       toast({
        title: "Task Moved",
        description: `Task successfully moved to ${endColumnStatus}.`,
      });
    } catch (error: any) {
      console.error("Failed to update task status via context:", error);
      toast({
        variant: "destructive",
        title: "Move Failed",
        description: error.message || `Could not move the task to ${endColumnStatus}.`,
      });
      // State reverts automatically because context wasn't updated successfully
    }

    // Optimistic update logic removed - useEffect handles updates based on context changes.
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {columnOrder.map((status) => {
          const columnTasks = groupedTasks[status] || [];
          // Determine if the column is droppable based on role and target status
          // Students cannot drop INTO 'Done'
          const isDroppable = isAdmin || (status !== TaskStatus.Done);
           // Determine if tasks IN this column are draggable based on role and current status
           // Students cannot drag FROM 'Done' or 'Submitted'
           const isDraggableFrom = isAdmin || (status !== TaskStatus.Done && status !== TaskStatus.Submitted);


          return (
            <KanbanColumn
              key={status}
              status={status}
              tasks={columnTasks}
              isAdmin={isAdmin}
              isDroppable={isDroppable}
              isDraggableFrom={isDraggableFrom} // Pass down if tasks in this column can be dragged
            />
          );
        })}
      </div>
    </DragDropContext>
  );
}
