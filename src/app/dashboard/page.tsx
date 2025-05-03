
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { Task, TaskStatus } from '@/types/task';
import { User } from '@/types/user'; // Import User type
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Filter } from 'lucide-react';
import { CreateTaskDialog } from '@/components/kanban/create-task-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';


export default function DashboardPage() {
  const {
    user,
    tasks,
    tasksLoading,
    updateTask,
    addMultipleTasks,
    getAllUsers,
  } = useAuth();

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const { toast } = useToast();

  // State for student filtering (admin only)
  const [selectedUsnFilter, setSelectedUsnFilter] = useState<string | null>(null); // Default to null (no selection)
  const [studentList, setStudentList] = useState<User[]>([]);
  const [isFetchingStudents, setIsFetchingStudents] = useState(false);


   // Fetch student list for admin dropdown
   useEffect(() => {
     const fetchStudents = async () => {
       if (user?.role === 'admin') {
         setIsFetchingStudents(true);
         try {
           const allUsers = await getAllUsers();
           // Filter only students for the dropdown
           setStudentList(allUsers.filter(u => u.role === 'student'));
         } catch (error) {
           console.error("Failed to fetch students for filter:", error);
           toast({
             variant: "destructive",
             title: "Error",
             description: "Could not load student list for filtering.",
           });
         } finally {
           setIsFetchingStudents(false);
         }
       }
     };
     fetchStudents();
   }, [user, getAllUsers, toast]);


  const handleTaskMove = async (taskId: string, newStatus: TaskStatus) => {
    console.log(`Requesting move for task ${taskId} to ${newStatus}`);
    try {
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
             // Use the already fetched list if available, otherwise fetch again
             const students = studentList.length > 0 ? studentList : (await getAllUsers()).filter(u => u.role === 'student');
             targetUsns = students.map(u => u.usn);

             if (targetUsns.length === 0) {
                 setAssignmentError("No student users found to assign the task to.");
                 setIsCreatingTask(false);
                 return;
             }
         } else {
             const usnUpper = newTaskData.usn.toUpperCase();
             // Optional: Validate USN exists
             const allUsers = studentList.length > 0 ? studentList : await getAllUsers();
             if (!allUsers.some(u => u.usn === usnUpper && u.role === 'student')) {
                setAssignmentError(`Student with USN ${usnUpper} not found.`);
                setIsCreatingTask(false);
                return;
             }
             targetUsns = [usnUpper];
         }

         const taskIdBase = String(Date.now());
         const tasksToAdd: Task[] = targetUsns.map(usn => ({
            id: `${taskIdBase}-${usn}`,
            title: newTaskData.title,
            description: newTaskData.description,
            dueDate: newTaskData.dueDate,
            status: TaskStatus.ToBeStarted,
            assignedBy: user.usn,
            usn: usn,
         }));

         await addMultipleTasks(tasksToAdd);

         toast({
            title: "Task(s) Created",
            description: `Task assigned to ${newTaskData.usn === 'all' ? targetUsns.length + ' student(s)' : newTaskData.usn}.`,
         });
         setIsCreateTaskOpen(false);

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

  // Filter tasks based on role and selection
  const filteredTasks = tasks.filter(task => {
    if (!user) return false; // Should not happen due to layout guard
    if (user.role === 'student') {
        return task.usn.toUpperCase() === user.usn.toUpperCase();
    }
    // Admin filtering logic
    if (selectedUsnFilter === 'all') {
        return true; // Show all tasks
    }
    if (selectedUsnFilter) {
        return task.usn.toUpperCase() === selectedUsnFilter.toUpperCase(); // Show tasks for selected student
    }
    return false; // If admin and no filter selected, show no tasks initially
  });


  return (
    <div className="container mx-auto p-4 pt-8">
       <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-semibold text-primary">
          {user.role === 'admin' ? 'Admin Dashboard' : `Student Dashboard (${user.usn})`}
        </h1>
        {/* Admin Controls: Create Task and Filter */}
        {user.role === 'admin' && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Student Filter */}
            <div className="flex items-center gap-2">
               <Label htmlFor="student-filter" className="text-sm font-medium shrink-0">
                 <Filter className="inline-block h-4 w-4 mr-1 relative -top-px"/>
                 Filter by Student:
               </Label>
               <Select
                 value={selectedUsnFilter ?? ''}
                 onValueChange={(value) => setSelectedUsnFilter(value === '' ? null : value)}
                 disabled={isFetchingStudents || tasksLoading}
               >
                 <SelectTrigger id="student-filter" className="w-full sm:w-[200px]">
                   <SelectValue placeholder={isFetchingStudents ? "Loading students..." : "Select a student"} />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All Students</SelectItem>
                   {studentList.map(student => (
                     <SelectItem key={student.usn} value={student.usn}>
                       {student.usn}
                     </SelectItem>
                   ))}
                   {studentList.length === 0 && !isFetchingStudents && (
                      <p className="p-2 text-sm text-muted-foreground">No students found</p>
                   )}
                 </SelectContent>
               </Select>
            </div>

             {/* Create Task Button */}
             <Button onClick={() => setIsCreateTaskOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90 w-full sm:w-auto" disabled={isCreatingTask}>
               {isCreatingTask ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
               Create Task
             </Button>
          </div>
        )}
      </div>

       {assignmentError && (
         <Alert variant="destructive" className="mb-4">
           <AlertCircle className="h-4 w-4" />
           <AlertTitle>Assignment Error</AlertTitle>
           <AlertDescription>{assignmentError}</AlertDescription>
         </Alert>
       )}

      {tasksLoading ? (
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
        <>
          {/* Message for admin if no student is selected */}
          {user?.role === 'admin' && !selectedUsnFilter && (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-250px)] text-center">
               <Filter className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Select a student</p>
              <p className="text-sm text-muted-foreground">Choose a student from the dropdown above to view their tasks, or select "All Students".</p>
            </div>
          )}

           {/* Show Kanban board if a filter is selected (admin) or if user is student */}
          {(user?.role === 'student' || selectedUsnFilter) && (
            <KanbanBoard
                tasks={filteredTasks}
                onTaskMove={handleTaskMove}
                isAdmin={user.role === 'admin'}
             />
           )}

           {/* Message if filter is selected but no tasks found */}
           {user?.role === 'admin' && selectedUsnFilter && filteredTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[calc(100vh-250px)] text-center">
                  <p className="text-lg font-medium text-muted-foreground">No tasks found</p>
                  <p className="text-sm text-muted-foreground">
                     {selectedUsnFilter === 'all' ? "There are no tasks assigned yet." : `No tasks found for student ${selectedUsnFilter}.`}
                   </p>
              </div>
            )}
        </>
      )}


      {user.role === 'admin' && (
        <CreateTaskDialog
          isOpen={isCreateTaskOpen}
          onClose={() => { if (!isCreatingTask) setIsCreateTaskOpen(false); }}
          onCreate={handleCreateTask}
          isLoading={isCreatingTask}
        />
      )}
    </div>
  );
}

