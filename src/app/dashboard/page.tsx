
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { Task, TaskStatus } from '@/types/task';
import { User } from '@/types/user'; // Import User type
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Filter, BookCopy } from 'lucide-react'; // Added BookCopy icon
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

// Define semester options
const semesterOptions = Array.from({ length: 8 }, (_, i) => String(i + 1));

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

  // State for filtering (admin only)
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<string | null>(null); // '1' to '8' or null
  const [selectedUsnFilter, setSelectedUsnFilter] = useState<string | null>(null); // 'all' or specific USN within selected semester, or null
  const [studentList, setStudentList] = useState<User[]>([]); // All students fetched initially
  const [filteredStudentList, setFilteredStudentList] = useState<User[]>([]); // Students filtered by selected semester
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);


   // Fetch all users for admin dropdowns
   useEffect(() => {
     const fetchUsers = async () => {
       if (user?.role === 'admin') {
         setIsFetchingUsers(true);
         try {
           const allUsers = await getAllUsers();
           setStudentList(allUsers); // Store all users initially
         } catch (error) {
           console.error("Failed to fetch users:", error);
           toast({
             variant: "destructive",
             title: "Error",
             description: "Could not load user list.",
           });
         } finally {
           setIsFetchingUsers(false);
         }
       }
     };
     fetchUsers();
   }, [user, getAllUsers, toast]);

   // Update filtered student list when semester filter changes
   useEffect(() => {
       if (user?.role === 'admin' && selectedSemesterFilter) {
           const semesterNumber = parseInt(selectedSemesterFilter, 10);
           const studentsInSemester = studentList.filter(
               (u) => u.role === 'student' && u.semester === semesterNumber
           );
           setFilteredStudentList(studentsInSemester);
           // Reset USN filter when semester changes, unless it's 'all'
           // Keep 'all' selected if it was already selected
           if (selectedUsnFilter !== 'all') {
                setSelectedUsnFilter(null); // Reset to 'Select a student'
           }
       } else {
           setFilteredStudentList([]); // Clear list if no semester selected
           setSelectedUsnFilter(null); // Reset USN filter as well
       }
   }, [selectedSemesterFilter, studentList, user?.role, selectedUsnFilter]); // Added selectedUsnFilter dependency


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
     if (user?.role !== 'admin') return Promise.reject("Permission denied."); // Return rejected promise

     setIsCreatingTask(true);
     setAssignmentError(null);
     console.log("Creating new task with data:", newTaskData);

     const { title, description, dueDate, assignTo, semester } = newTaskData;

     if (!semester || semester < 1 || semester > 8) {
       setAssignmentError("Invalid semester selected.");
       setIsCreatingTask(false);
       return Promise.reject("Invalid semester selected."); // Return rejected promise
     }

     try {
         let targetUsns: string[] = [];
         const semesterNumber = semester; // Already a number

         // Fetch users of the target semester
         const allUsers = studentList.length > 0 ? studentList : await getAllUsers(); // Use cached or fetch again
         const studentsInSemester = allUsers.filter(
             (u) => u.role === 'student' && u.semester === semesterNumber
         );

         if (assignTo.toLowerCase() === 'all') {
             targetUsns = studentsInSemester.map(u => u.usn);
             if (targetUsns.length === 0) {
                 setAssignmentError(`No students found in semester ${semesterNumber}.`);
                 setIsCreatingTask(false);
                 return Promise.reject(`No students found in semester ${semesterNumber}.`); // Return rejected promise
             }
         } else {
             const usnUpper = assignTo.toUpperCase();
             // Validate USN exists *within the target semester*
             const targetStudent = studentsInSemester.find(u => u.usn === usnUpper);
             if (!targetStudent) {
                setAssignmentError(`Student with USN ${usnUpper} not found in semester ${semesterNumber}.`);
                setIsCreatingTask(false);
                return Promise.reject(`Student not found in semester ${semesterNumber}.`); // Return rejected promise
             }
             targetUsns = [usnUpper];
         }

         const taskIdBase = String(Date.now());
         const tasksToAdd: Task[] = targetUsns.map(usn => ({
            id: `${taskIdBase}-${usn}`, // Ensure unique ID per student task instance
            title: title,
            description: description,
            dueDate: dueDate,
            status: TaskStatus.ToBeStarted,
            assignedBy: user.usn,
            usn: usn,
            semester: semesterNumber, // Add semester to the task
         }));

         await addMultipleTasks(tasksToAdd);

         toast({
            title: "Task(s) Created",
            description: `Task assigned to ${assignTo === 'all' ? targetUsns.length + ` student(s) in semester ${semesterNumber}` : assignTo}.`,
         });
         setIsCreateTaskOpen(false); // Close dialog on success

     } catch (error: any) {
         console.error("Failed to create task(s):", error);
         const errorMessage = error.message || "Could not create the task(s).";
         toast({
            variant: "destructive",
            title: "Creation Failed",
            description: errorMessage,
         });
         setAssignmentError(errorMessage);
         throw error; // Re-throw error so the dialog knows it failed
     } finally {
         setIsCreatingTask(false);
     }
  };


  // Filter tasks based on role and selected filters (semester and USN)
  const filteredTasks = tasks.filter(task => {
    if (!user) return false; // Should not happen due to layout guard

    // Student view: Show tasks assigned to them (USN match)
    if (user.role === 'student') {
        return task.usn.toUpperCase() === user.usn.toUpperCase();
    }

    // Admin view: Apply semester and USN filters
    if (user.role === 'admin') {
        // 1. Must match selected semester (if a semester is selected)
        if (selectedSemesterFilter && task.semester !== parseInt(selectedSemesterFilter, 10)) {
            return false;
        }
        // 2. If semester is selected, apply USN filter within that semester
        if (selectedSemesterFilter) {
            if (selectedUsnFilter === 'all') {
                return true; // Show all tasks for the selected semester
            }
            if (selectedUsnFilter) {
                // Show tasks for the specific student in the selected semester
                return task.usn.toUpperCase() === selectedUsnFilter.toUpperCase();
            }
             return false; // If semester is selected but no USN filter ('all' or specific), show nothing
        }
        return false; // If no semester is selected, show nothing
    }

    return false; // Default case
  });


  return (
    <div className="container mx-auto p-4 pt-8">
       <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-semibold text-primary">
          {user.role === 'admin' ? 'Admin Dashboard' : `Student Dashboard (${user.usn} - Sem ${user.semester})`}
        </h1>
        {/* Admin Controls: Create Task and Filters */}
        {user.role === 'admin' && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
            {/* Semester Filter */}
            <div className="flex items-center gap-2">
               <Label htmlFor="semester-filter" className="text-sm font-medium shrink-0">
                 <BookCopy className="inline-block h-4 w-4 mr-1 relative -top-px"/>
                 Semester:
               </Label>
               <Select
                 value={selectedSemesterFilter ?? ''}
                 onValueChange={(value) => setSelectedSemesterFilter(value === '' ? null : value)}
                 disabled={isFetchingUsers || tasksLoading}
               >
                 <SelectTrigger id="semester-filter" className="w-full sm:w-[150px]">
                   <SelectValue placeholder={isFetchingUsers ? "Loading..." : "Select Sem"} />
                 </SelectTrigger>
                 <SelectContent>
                   {semesterOptions.map(sem => (
                     <SelectItem key={sem} value={sem}>
                       Semester {sem}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
            </div>

            {/* Student Filter (appears after semester is selected) */}
            {selectedSemesterFilter && (
                <div className="flex items-center gap-2">
                   <Label htmlFor="student-filter" className="text-sm font-medium shrink-0">
                     <Filter className="inline-block h-4 w-4 mr-1 relative -top-px"/>
                     Student:
                   </Label>
                   <Select
                     value={selectedUsnFilter ?? ''}
                     onValueChange={(value) => setSelectedUsnFilter(value === '' ? null : value)}
                     disabled={isFetchingUsers || tasksLoading || !selectedSemesterFilter}
                   >
                     <SelectTrigger id="student-filter" className="w-full sm:w-[200px]">
                       <SelectValue placeholder={isFetchingUsers ? "Loading..." : "Select a student"} />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="all">All Students in Sem {selectedSemesterFilter}</SelectItem>
                       {filteredStudentList.map(student => (
                         <SelectItem key={student.usn} value={student.usn}>
                           {student.usn}
                         </SelectItem>
                       ))}
                       {filteredStudentList.length === 0 && !isFetchingUsers && (
                          <p className="p-2 text-sm text-muted-foreground">No students in Sem {selectedSemesterFilter}</p>
                       )}
                     </SelectContent>
                   </Select>
                </div>
            )}


             {/* Create Task Button */}
             <Button onClick={() => setIsCreateTaskOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90 w-full sm:w-auto ml-auto" disabled={isCreatingTask}>
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
          {/* Message for admin if no semester is selected */}
          {user?.role === 'admin' && !selectedSemesterFilter && (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-250px)] text-center">
               <BookCopy className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Select a semester</p>
              <p className="text-sm text-muted-foreground">Choose a semester from the dropdown above to view student tasks.</p>
            </div>
          )}

           {/* Message for admin if semester selected but no USN filter */}
           {user?.role === 'admin' && selectedSemesterFilter && !selectedUsnFilter && (
             <div className="flex flex-col items-center justify-center h-[calc(100vh-250px)] text-center">
               <Filter className="h-12 w-12 text-muted-foreground mb-4" />
               <p className="text-lg font-medium text-muted-foreground">Select a student filter</p>
               <p className="text-sm text-muted-foreground">Choose 'All Students' or a specific student to view tasks for Semester {selectedSemesterFilter}.</p>
             </div>
           )}

           {/* Show Kanban board if student OR if admin has selected semester AND (usn or 'all') */}
           {(user?.role === 'student' || (user?.role === 'admin' && selectedSemesterFilter && selectedUsnFilter)) && (
            <KanbanBoard
                tasks={filteredTasks}
                // onTaskMove handled internally
                isAdmin={user.role === 'admin'}
             />
           )}

           {/* Message if filters selected but no tasks found */}
           {user?.role === 'admin' && selectedSemesterFilter && selectedUsnFilter && filteredTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[calc(100vh-250px)] text-center">
                  <p className="text-lg font-medium text-muted-foreground">No tasks found</p>
                  <p className="text-sm text-muted-foreground">
                     {selectedUsnFilter === 'all'
                       ? `No tasks found for Semester ${selectedSemesterFilter}.`
                       : `No tasks found for student ${selectedUsnFilter} in Semester ${selectedSemesterFilter}.`}
                   </p>
              </div>
            )}

             {/* Message if student has no tasks */}
            {user?.role === 'student' && filteredTasks.length === 0 && (
                 <div className="flex flex-col items-center justify-center h-[calc(100vh-250px)] text-center">
                     <p className="text-lg font-medium text-muted-foreground">No tasks assigned</p>
                     <p className="text-sm text-muted-foreground">You currently have no tasks.</p>
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
