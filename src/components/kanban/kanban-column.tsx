import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { TaskCard } from './task-card';
import { Task, TaskStatus } from '@/types/task';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  isAdmin: boolean;
   isDroppable: boolean; // New prop to control if dropping is allowed
}

export function KanbanColumn({ status, tasks, isAdmin, isDroppable }: KanbanColumnProps) {
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
               !isDroppable && !isAdmin ? 'opacity-70 cursor-not-allowed' : '' // Visual cue for non-droppable for students
            )}
            style={{ minHeight: 'calc(100vh - 250px)' }} // Adjust height as needed
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                isAdmin={isAdmin}
                 // Prevent dragging from 'Done' unless admin
                isDraggable={isAdmin || task.status !== TaskStatus.Done}
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
