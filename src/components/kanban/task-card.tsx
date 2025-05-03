import React, { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Task } from '@/types/task';
import { Badge } from '@/components/ui/badge';
import { getDueDateColor, formatDueDate } from '@/lib/date-utils';
import { Button } from '@/components/ui/button';
import { Upload, Download, Edit, Trash2, Paperclip, CheckCircle, Clock } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface TaskCardProps {
  task: Task;
  index: number;
  isAdmin: boolean;
  isDraggable: boolean; // To control drag permission based on status/role
}

export function TaskCard({ task, index, isAdmin, isDraggable }: TaskCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const dueDateColor = getDueDateColor(task.dueDate);

    const handleUploadClick = () => {
        // Trigger file input or open upload modal
        console.log(`Upload requested for task ${task.id}`);
         // In real app, trigger input file click: document.getElementById(`file-input-${task.id}`).click();
    };

    const handleDownloadClick = (url: string | undefined) => {
        if (!url) return;
        console.log(`Download requested for ${url}`);
        window.open(url, '_blank'); // Open attachment/submission in new tab
    };

    const handleEditClick = () => {
      // Open edit modal/dialog - only for admins
      if (!isAdmin) return;
      console.log(`Edit requested for task ${task.id}`);
    };

     const handleDeleteClick = () => {
      // Show confirmation and delete task - only for admins
      if (!isAdmin) return;
       console.log(`Delete requested for task ${task.id}`);
        // Add confirmation dialog here
    };

  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={!isDraggable}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-card shadow-md hover:shadow-lg transition-shadow ${
            snapshot.isDragging ? 'ring-2 ring-primary' : ''
          } ${!isDraggable ? 'opacity-80 cursor-not-allowed' : ''}`}
        >
          <CardHeader className="p-3 pb-2">
            <CardTitle
                className="text-base font-semibold cursor-pointer hover:text-primary"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {task.title}
            </CardTitle>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>Due: {formatDueDate(task.dueDate)}</span>
              <Badge
                variant="outline"
                className={`px-2 py-0.5 text-xs ${
                  dueDateColor === 'red' ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700' :
                  dueDateColor === 'yellow' ? 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700' :
                  'bg-white text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-500'
                }`}
              >
                {
                 dueDateColor === 'red' ? <Clock className="inline-block h-3 w-3 mr-1" /> :
                 dueDateColor === 'yellow' ? <Clock className="inline-block h-3 w-3 mr-1" /> :
                 <CheckCircle className="inline-block h-3 w-3 mr-1 text-green-600 dark:text-green-400" /> // Using CheckCircle for 'white' for variety
                }

                {
                  dueDateColor === 'red' ? 'Urgent' :
                  dueDateColor === 'yellow' ? 'Soon' :
                  'On Track'
                }
              </Badge>
            </div>
          </CardHeader>
          {isExpanded && (
             <CardContent className="p-3 pt-0 text-sm text-muted-foreground">
                <p>{task.description}</p>
                <p className="text-xs mt-2">Assigned by: {task.assignedBy}</p>
                 {task.submittedAt && <p className="text-xs mt-1">Submitted: {formatDueDate(task.submittedAt, true)}</p>}
                  {task.completedAt && <p className="text-xs mt-1">Marked Done: {formatDueDate(task.completedAt, true)}</p>}
             </CardContent>
          )}
          <CardFooter className="p-3 pt-1 flex justify-between items-center">
              {/* Hidden file input for student uploads */}
            <input type="file" id={`file-input-${task.id}`} className="hidden" accept=".pdf, image/*" />
             <div className="flex space-x-1">
                 {/* Student Actions */}
                {!isAdmin && task.status !== 'Done' && task.status !== 'Submitted' && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={handleUploadClick}>
                                    <Upload className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                             <TooltipContent>
                                <p>Upload Submission</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
                 {/* View Attachments/Submissions */}
                 {task.attachmentUrl && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                               <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => handleDownloadClick(task.attachmentUrl)}>
                                    <Paperclip className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>View Assignment File</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                 )}
                 {task.submissionUrl && (
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700" onClick={() => handleDownloadClick(task.submissionUrl)}>
                                    <Download className="h-4 w-4" />
                                </Button>
                             </TooltipTrigger>
                              <TooltipContent>
                                <p>View Submission</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                 )}
            </div>

             {/* Admin Actions */}
            {isAdmin && (
                <div className="flex space-x-1">
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={handleEditClick}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                             </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit Task</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/80 hover:text-destructive" onClick={handleDeleteClick}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Delete Task</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            )}
          </CardFooter>
        </Card>
      )}
    </Draggable>
  );
}
