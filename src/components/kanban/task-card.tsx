
import React, { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Task, TaskStatus } from '@/types/task';
import { Badge } from '@/components/ui/badge';
import { getDueDateColor, formatDueDate } from '@/lib/date-utils';
import { Button } from '@/components/ui/button';
import { Upload, Download, Edit, Trash2, Paperclip, CheckCircle, Clock, Loader2, User, BookCopy, UserCog, Award } from 'lucide-react'; // Added Award icon
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAuth } from '@/hooks/use-auth'; // Import useAuth
import { useToast } from '@/hooks/use-toast'; // Import useToast
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"; // Import AlertDialog components
import { cn } from '@/lib/utils'; // Import the cn utility function
import { format } from 'date-fns'; // Import format for submittedAt date


interface TaskCardProps {
  task: Task;
  index: number;
  isAdmin: boolean; // True if current user is admin (regular or master)
  isDraggable: boolean; // To control drag permission based on status/role
}

export function TaskCard({ task, index, isAdmin, isDraggable }: TaskCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false); // State for delete loading
    const [isUploading, setIsUploading] = useState(false); // State for upload loading
    const dueDateColor = getDueDateColor(task.dueDate);
    const { updateTask, deleteTask, isMasterAdmin } = useAuth(); // Get context functions and master admin status
    const { toast } = useToast(); // Get toast function

    // --- Handlers using Context Functions ---

    const handleUploadClick = () => {
        // Trigger file input
        const fileInput = document.getElementById(`file-input-${task.id}`) as HTMLInputElement;
         if (fileInput) {
           fileInput.click();
         }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
         const file = event.target.files?.[0];
         if (!file) return;

         setIsUploading(true);
         console.log(`Uploading file for task ${task.id}:`, file.name);
         // Simulate upload process (replace with actual API call)
         await new Promise(resolve => setTimeout(resolve, 1500));

         // Simulate getting a submission URL
         // Ensure USN in URL is uppercase
         const mockSubmissionUrl = `https://example.com/submissions/${task.usn.toUpperCase()}/${task.id}/${file.name}`; // Replace with actual URL

         try {
            // Update task status to Submitted and add submissionUrl
            await updateTask(task.id, {
               status: TaskStatus.Submitted,
               submissionUrl: mockSubmissionUrl,
               // submittedAt will be set automatically by updateTask in context
            });
            toast({
                title: "Submission Uploaded",
                description: `File ${file.name} submitted successfully.`,
            });
         } catch (error: any) {
            console.error("Failed to update task after upload:", error);
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: error.message || "Could not update task after file upload.",
            });
         } finally {
            setIsUploading(false);
             // Reset file input value to allow re-uploading the same file if needed
            event.target.value = '';
         }
    };


    const handleDownloadClick = (url: string | undefined) => {
        if (!url) return;
        console.log(`Download requested for ${url}`);
        window.open(url, '_blank');
    };

    const handleEditClick = () => {
      // TODO: Implement Edit Task Dialog/Modal
      // This would typically involve:
      // 1. Opening a Dialog (similar to CreateTaskDialog but pre-filled).
      // 2. Calling `updateTask` from useAuth on successful save.
      if (!isAdmin) return; // Only admins can edit (even if not implemented yet)
      console.log(`Edit requested for task ${task.id}`);
      toast({
          title: "Edit Not Implemented",
          description: "Editing task details is not yet available.",
      });
    };

     const handleDeleteConfirm = async () => {
        // Only allow delete if current user is the admin who assigned the task OR the master admin
        // This check should ideally happen in the context function, but we can prevent UI trigger here too
        if (!isAdmin) return; // Should not happen if button is hidden, but good practice
        setIsDeleting(true);
        console.log(`Deleting task ${task.id}`);
        try {
            await deleteTask(task.id); // Call deleteTask from context (context should handle permission)
            toast({
                title: "Task Deleted",
                description: `Task "${task.title}" has been removed.`,
            });
            // No need to update local state, context provider handles it
        } catch (error: any) {
            console.error("Failed to delete task:", error);
            toast({
                variant: "destructive",
                title: "Deletion Failed",
                description: error.message || "Could not delete the task.",
            });
        } finally {
            setIsDeleting(false);
        }
    };

  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={!isDraggable || isDeleting || isUploading}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "bg-card shadow-md hover:shadow-lg transition-shadow",
             snapshot.isDragging ? 'ring-2 ring-primary' : '',
             !isDraggable ? 'opacity-80 cursor-not-allowed' : '',
             isDeleting ? 'opacity-50 animate-pulse' : '' // Visual feedback for deleting
          )}
          aria-busy={isDeleting || isUploading}
        >
          <CardHeader className="p-3 pb-2">
            <CardTitle
                className="text-base font-semibold cursor-pointer hover:text-primary"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {task.title}
            </CardTitle>
            {/* Display Assigned USN (uppercase) and Semester for ALL Admin views */}
            {isAdmin && (
                <div className="flex items-center space-x-3 text-xs text-muted-foreground pt-1">
                    <span className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                         {/* Ensure USN is displayed in uppercase */}
                        {task.usn.toUpperCase()}
                    </span>
                     <span className="flex items-center">
                        <BookCopy className="h-3 w-3 mr-1" />
                         {/* Display N/A if semester is null */}
                         Sem {task.semester === null ? 'N/A' : task.semester}
                    </span>
                </div>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
               <TooltipProvider>
                 <Tooltip>
                   <TooltipTrigger asChild>
                      <span>Due: {formatDueDate(task.dueDate)}</span>
                   </TooltipTrigger>
                   <TooltipContent>
                      <p>{task.dueDate.toLocaleString()}</p>
                   </TooltipContent>
                 </Tooltip>
               </TooltipProvider>
              <Badge
                variant="outline"
                className={`px-2 py-0.5 text-xs ${
                  dueDateColor === 'red' ? 'border-red-300 bg-red-100 text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300' :
                  dueDateColor === 'yellow' ? 'border-yellow-300 bg-yellow-100 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                  'border-gray-300 bg-card text-foreground dark:border-gray-600' // Use card background for 'white'
                }`}
              >
                {
                 dueDateColor === 'red' ? <Clock className="inline-block h-3 w-3 mr-1" /> :
                 dueDateColor === 'yellow' ? <Clock className="inline-block h-3 w-3 mr-1" /> :
                 <CheckCircle className="inline-block h-3 w-3 mr-1 text-green-600 dark:text-green-400" />
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
                <p className="whitespace-pre-wrap">{task.description}</p> {/* Preserve whitespace */}
                 {/* Display Assigned By Name and USN (USN only shown for master admin and student) */}
                 <p className="text-xs mt-2 flex items-center">
                     {task.assignedByName ? (
                         <>
                             <Award className="h-3 w-3 mr-1" />
                             Assigned by: {task.assignedByName}
                             {(isMasterAdmin || !isAdmin) && ` (${task.assignedBy.toUpperCase()})`} {/* Show USN for master admin or student */}
                         </>
                     ) : (
                         <>
                             <UserCog className="h-3 w-3 mr-1" />
                             Assigned by: {task.assignedBy.toUpperCase()} {/* Fallback if name missing */}
                         </>
                     )}
                 </p>

                 {task.submittedAt && (
                    <TooltipProvider>
                        <Tooltip>
                        <TooltipTrigger asChild>
                             {/* Use formatDueDate or basic format */}
                            <p className="text-xs mt-1">Submitted: {format(task.submittedAt, 'MMM d, yyyy HH:mm')}</p>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{task.submittedAt.toLocaleString()}</p>
                        </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                 )}
                  {task.completedAt && (
                    <TooltipProvider>
                         <Tooltip>
                         <TooltipTrigger asChild>
                              {/* Use formatDueDate or basic format */}
                             <p className="text-xs mt-1">Marked Done: {format(task.completedAt, 'MMM d, yyyy HH:mm')}</p>
                         </TooltipTrigger>
                         <TooltipContent>
                             <p>{task.completedAt.toLocaleString()}</p>
                         </TooltipContent>
                         </Tooltip>
                     </TooltipProvider>
                  )}
             </CardContent>
          )}
          <CardFooter className="p-3 pt-1 flex justify-between items-center">
            {/* Hidden file input for student uploads */}
            <input
                type="file"
                id={`file-input-${task.id}`}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,image/*,.zip,.rar" // Specify acceptable file types
                onChange={handleFileChange}
                disabled={isUploading}
            />
             <div className="flex space-x-1">
                 {/* Student Actions: Upload only if not Submitted or Done */}
                {!isAdmin && ![TaskStatus.Submitted, TaskStatus.Done].includes(task.status) && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={handleUploadClick} disabled={isUploading}>
                                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                </Button>
                            </TooltipTrigger>
                             <TooltipContent>
                                <p>Upload Submission</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
                 {/* View Attachments (Admin provided) */}
                 {task.attachmentUrl && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                               <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => handleDownloadClick(task.attachmentUrl)} disabled={isDeleting || isUploading}>
                                    <Paperclip className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>View Assignment File</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                 )}
                 {/* View Submission (Student uploaded) */}
                 {task.submissionUrl && (
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700" onClick={() => handleDownloadClick(task.submissionUrl)} disabled={isDeleting || isUploading}>
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

             {/* Admin Actions (Regular and Master) */}
            {isAdmin && (
                <div className="flex space-x-1">
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={handleEditClick} disabled={isDeleting || isUploading}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                             </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit Task (Not Implemented)</p>
                              </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    {/* Delete Button with Confirmation (Visible to Master Admin and the Admin who assigned it) */}
                    {/* Logic to show delete button might need refinement based on exact permission rules */}
                    {/* Assuming for now deleteTask context handles permissions, show if isAdmin */}
                     <AlertDialog>
                         <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                     <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/80 hover:text-destructive" disabled={isDeleting || isUploading}>
                                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                                        </Button>
                                     </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Delete Task</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                 {/* Ensure USN is uppercase */}
                                This action cannot be undone. This will permanently delete the task
                                "{task.title}" for student {task.usn.toUpperCase()}.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Delete
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}
          </CardFooter>
        </Card>
      )}
    </Draggable>
  );
}
