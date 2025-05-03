import React from 'react';
import { Droppable } from '@hello-pangea/dnd'; // Only Droppable needed here
import { TaskCard } from './task-card';
import { Task, TaskStatus } from '@/types/task';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea

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
          <ScrollArea
            className={cn(
              "flex-grow", // Use flex-grow to take available space
              snapshot.isDraggingOver ? 'bg-accent/20' : 'bg-secondary',
              !isDroppable ? 'opacity-70' : '' // Visual cue if column is not droppable
            )}
             // Set a max height and let ScrollArea handle overflow
            style={{ maxHeight: 'calc(100vh - 280px)' }} // Adjust 280px based on surrounding elements
          >
             <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  "p-4 space-y-4 min-h-[150px] h-full", // Ensure div takes full height of ScrollArea content area
                )}
             >
                {tasks.map((task, index) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    index={index}
                    isAdmin={isAdmin}
                    // Pass the isDraggableFrom flag down to the card
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
           </ScrollArea>
        )}
      </Droppable>
    </div>
  );
}
