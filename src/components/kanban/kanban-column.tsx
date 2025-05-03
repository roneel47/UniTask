import React from 'react';
import { Droppable } from '@hello-pangea/dnd'; // Only Droppable needed here
import { TaskCard } from './task-card';
import { Task, TaskStatus } from '@/types/task';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  isAdmin: boolean;
  isDroppable: boolean; // Can items be dropped INTO this column?
  isDraggableFrom: boolean; // Can items be dragged FROM this column?
}

export function KanbanColumn({ status, tasks, isAdmin, isDroppable, isDraggableFrom }: KanbanColumnProps) {
  return (
    <div className="flex flex-col bg-secondary rounded-lg shadow-sm h-full min-h-[200px]">
      <h2 className="text-lg font-semibold p-4 border-b text-foreground sticky top-0 bg-secondary rounded-t-lg z-10">
        {status} ({tasks.length})
      </h2>
      <Droppable droppableId={status} isDropDisabled={!isDroppable}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "p-4 space-y-4 overflow-y-auto flex-grow min-h-[150px]",
              snapshot.isDraggingOver ? 'bg-accent/20' : 'bg-secondary',
              !isDroppable ? 'opacity-70' : '' // Visual cue if column is not droppable (e.g., 'Done' for students)
            )}
            style={{ minHeight: 'calc(100vh - 250px)' }} // Adjust height as needed
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                isAdmin={isAdmin}
                // Pass the isDraggableFrom flag down to the card
                // The card itself might have further logic, but this controls if it's draggable *at all* from this column
                isDraggable={isDraggableFrom}
              />
            ))}
            {provided.placeholder}
             {tasks.length === 0 && !snapshot.isDraggingOver && (
               <div className="text-center text-muted-foreground text-sm pt-4">
                 No tasks here.
              </div>
             )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
