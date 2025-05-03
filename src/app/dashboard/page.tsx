"use client";

import React, { useState } from 'react'; // Removed useEffect as data fetching is handled by AuthProvider
import { useAuth } from '@/hooks/use-auth';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { Task, TaskStatus } from '@/types/task';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { CreateTaskDialog } from '@/components/kanban/create-task-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';

// Mock data removed - tasks come from useAuth context

export default function DashboardPage() {
  const {
    user,
    tasks, // Get tasks from context
    tasksLoading, // Get loading state from context
    updateTask, // Get update function from context
    addMultipleTasks, // Get add function from context
    // deleteTask, // Get delete function (if needed directly here)
    getAllUsers, // Needed for 'all' assignment logic
  } = useAuth();

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false); // Loading state for task creation
  const [assignmentError, setAssignmentError] = useState<string | null>(null); // Error state for 'all' assignment
  const { toast } = useToast();


  // Removed useEffect for fetching tasks - handled by AuthProvider

  const handleTaskMove = async (taskId: string, newStatus: TaskStatus) => {
    console.log(`Requesting move for task ${taskId} to ${newStatus}`);
    try {
      // Call updateTask from context
      await updateTask(taskId, { status: newStatus });
      toast({
        title: "Task Updated",
        description: `Task moved to ${newStatus}.`,
      });
    } catch (error: any) {
      console.error("Failed to update task status:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Could not move the task.",
      });
      // No need for explicit revert, context state remains unchanged on error
    }
  };

  const handleCreateTask = async (newTaskData: Omit<Task, 'id' | 'status' | 'assignedBy'>) => {
     if (user?.role !== 'admin') return;

     setIsCreatingTask(true);
     setAssignmentError(null);
     console.log("Creating new task with data:", newTaskData);

     try {
         let targetUsns: string[] = [];

         if (newTaskData.usn.toLowerCase() === 'all') {
             // Fetch all users to determine target USNs (assuming all non-admins are students)
             const allUsers = await getAllUsers();
             targetUsns = allUsers
                .filter(u => u.role === 'student') // Only assign to students
                .map(u => u.usn);

             if (targetUsns.length === 0) {
                 setAssignmentError("No student users found to assign the task to.");
                 setIsCreatingTask(false);
                 return;
             }
         } else {
             // Assign to a specific USN - Consider validating USN existence
              const usnUpper = newTaskData.usn.toUpperCase();
             // Optional: Validate USN exists via getAllUsers if needed
             // const allUsers = await getAllUsers();
             // if (!allUsers.some(u => u.usn === usnUpper)) {
             //    setAssignmentError(`User with USN ${usnUpper} not found.`);
             //    setIsCreatingTask(false);
             //    return;
             // }
             targetUsns = [usnUpper];
         }

         const taskIdBase = String(Date.now()); // Base ID for the task batch
         const tasksToAdd: Task[] = targetUsns.map(usn => ({
            id: `${taskIdBase}-${usn}`, // Unique ID per student assignment
            title: newTaskData.title,
            description: newTaskData.description,
            dueDate: newTaskData.dueDate,
            status: TaskStatus.ToBeStarted,
            assignedBy: user.usn, // Assign by the current admin user
            usn: usn, // Specific USN for this task instance
            // attachmentUrl: newTaskData.attachmentUrl, // Include if added
         }));

         await addMultipleTasks(tasksToAdd); // Use addMultipleTasks from context

         toast({
            title: "Task(s) Created",
            description: `Task assigned to ${newTaskData.usn === 'all' ? targetUsns.length + ' student(s)' : newTaskData.usn}.`,
         });
         setIsCreateTaskOpen(false); // Close dialog on success

     } catch (error: any) {
         console.error("Failed to create task(s):", error);
         toast({
            variant: "destructive",
            title: "Creation Failed",
            description: error.message || "Could not create the task(s).",
         });
          setAssignmentError(error.message || "Could not create the task(s).");
     } finally {
         setIsCreatingTask(false);
     }
  };

  // Dashboard Layout handles initial user loading state

  // User is guaranteed by layout, access directly
  const filteredTasks = tasks.filter(task =>
      user.role === 'admin' || task.usn.toUpperCase() === user.usn.toUpperCase()
  );

  return (
    <div className="container mx-auto p-4 pt-8">
       <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-primary">
          {user.role === 'admin' ? 'Admin Dashboard' : `Student Dashboard (${user.usn})`}
        </h1>
        {user.role === 'admin' && (
          <Button onClick={() => setIsCreateTaskOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={isCreatingTask}>
             {isCreatingTask ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
             Create Task
          </Button>
        )}
      </div>

       {assignmentError && (
         <Alert variant="destructive" className="mb-4">
           <AlertCircle className="h-4 w-4" />
           <AlertTitle>Assignment Error</AlertTitle>
           <AlertDescription>{assignmentError}</AlertDescription>
         </Alert>
       )}

      {tasksLoading ? ( // Use tasksLoading from context
         <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-secondary p-4 rounded-lg shadow animate-pulse">
              <Skeleton className="h-6 w-3/4 mb-4 bg-muted" />
              <Skeleton className="h-24 w-full mb-2 bg-muted" />
              <Skeleton className="h-24 w-full bg-muted" />
            </div>
          ))}
        </div>
      ) : (
        <KanbanBoard
            tasks={filteredTasks} // Pass filtered tasks
            onTaskMove={handleTaskMove}
            isAdmin={user.role === 'admin'}
         />
      )}


      {user.role === 'admin' && (
        <CreateTaskDialog
          isOpen={isCreateTaskOpen}
          onClose={() => { if (!isCreatingTask) setIsCreateTaskOpen(false); }}
          onCreate={handleCreateTask}
          isLoading={isCreatingTask} // Pass loading state to dialog
        />
      )}
    </div>
  );
}
