"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { Task, TaskStatus } from '@/types/task';
import { User } from '@/types/user'; // Import User type
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Filter, BookCopy, Columns } from 'lucide-react'; // Added Columns icon
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
import { LoadingSpinner } from '@/components/layout/loading-spinner'; // Import loading spinner

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
           // Ensure USNs are uppercase in the fetched list
           const uppercaseUsers = allUsers.map(u => ({...u, usn: u.usn.toUpperCase()}));
           setStudentList(uppercaseUsers); // Store all users initially
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
           // Sort students by USN
           studentsInSemester.sort((a, b) => a.usn.localeCompare(b.usn));
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

     // Correctly destructure 'usn' which holds the 'all' or specific USN input from the dialog
     const { title, description, dueDate, usn: usnInput, semester } = newTaskData;

     if (!semester || semester < 1 || semester > 8) {
       setAssignmentError("Invalid semester selected.");
       setIsCreatingTask(false);
       return Promise.reject("Invalid semester selected."); // Return rejected promise
     }

     // Check if usnInput is defined before trimming
     if (usnInput === undefined || usnInput === null) {
         setAssignmentError("Assignment target (USN or 'all') is missing.");
         setIsCreatingTask(false);
         return Promise.reject("Assignment target is missing.");
     }

     try {
         let targetUsns: string[] = [];
         const semesterNumber = semester; // Already a number
         const assignmentTarget = usnInput.trim(); // Use the correctly destructured variable

         // Fetch users of the target semester if studentList is empty (fallback)
         const currentStudentList = studentList.length > 0 ? studentList : await getAllUsers();
         // Ensure USNs are uppercase
         const uppercaseStudentList = currentStudentList.map(u => ({...u, usn: u.usn.toUpperCase()}));

         const studentsInSemester = uppercaseStudentList.filter(
             (u) => u.role === 'student' && u.semester === semesterNumber
         );

         if (assignmentTarget.toLowerCase() === 'all') {
             targetUsns = studentsInSemester.map(u => u.usn); // Already uppercase
             if (targetUsns.length === 0) {
                 setAssignmentError(`No students found in semester ${semesterNumber}.`);
                 setIsCreatingTask(false);
                 return Promise.reject(`No students found in semester ${semesterNumber}.`); // Return rejected promise
             }
         } else {
             const targetUsnUpper = assignmentTarget.toUpperCase(); // Ensure input USN is uppercase
             // Validate USN exists *within the target semester*
             const targetStudent = studentsInSemester.find(u => u.usn === targetUsnUpper);
             if (!targetStudent) {
                setAssignmentError(`Student with USN ${targetUsnUpper} not found in semester ${semesterNumber}.`);
                setIsCreatingTask(false);
                return Promise.reject(`Student not found in semester ${semesterNumber}.`); // Return rejected promise
             }
             targetUsns = [targetUsnUpper]; // Already uppercase
         }

         const taskIdBase = String(Date.now());
         const tasksToAdd: Task[] = targetUsns.map(assignedUsn => ({
            id: `${taskIdBase}-${assignedUsn}`, // Ensure unique ID per student task instance
            title: title,
            description: description,
            dueDate: dueDate,
            status: TaskStatus.ToBeStarted,
            assignedBy: user.usn, // Already uppercase from context
            usn: assignedUsn, // Already uppercase
            semester: semesterNumber, // Add semester to the task
         }));

         await addMultipleTasks(tasksToAdd); // Context function handles uppercase

         toast({
            title: "Task(s) Created",
            description: `Task assigned to ${assignmentTarget.toLowerCase() === 'all' ? targetUsns.length + ` student(s) in semester ${semesterNumber}` : assignmentTarget.toUpperCase()}.`,
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
  // Ensure USN comparisons are case-insensitive or use consistently cased data
  const filteredTasks = tasks.filter(task => {
    if (!user) return false; // Should not happen due to layout guard

    // Student view: Show tasks assigned to them (case-insensitive USN match)
    if (user.role === 'student') {
        // Context ensures user.usn and task.usn are uppercase
        return task.usn === user.usn;
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
                // Context ensures task.usn is uppercase, selectedUsnFilter is also uppercase
                return task.usn === selectedUsnFilter;
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
          {/* Ensure user.usn and user.semester are displayed */}
          {user.role === 'admin' ? 'Admin Dashboard' : `Student Dashboard (${user.usn} - Sem ${user.semester ?? 'N/A'})`}
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
                      // Ensure value passed to onValueChange is uppercase or 'all'
                     onValueChange={(value) => setSelectedUsnFilter(value === '' ? null : (value === 'all' ? 'all' : value.toUpperCase()))}
                     disabled={isFetchingUsers || tasksLoading || !selectedSemesterFilter}
                   >
                     <SelectTrigger id="student-filter" className="w-full sm:w-[200px]">
                       <SelectValue placeholder={isFetchingUsers ? "Loading..." : "Select a student"} />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="all">All Students in Sem {selectedSemesterFilter}</SelectItem>
                       {filteredStudentList.map(student => (
                         // Ensure value is uppercase
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
         <div className="flex flex-col items-center justify-center h-[calc(100vh-250px)] text-center">
              <LoadingSpinner size={48} />
              <p className="text-lg font-medium text-muted-foreground mt-4 animate-pulse">Loading tasks...</p>
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
                tasks={filteredTasks} // Already filtered, USNs are uppercase
                // onTaskMove handled internally
                isAdmin={user.role === 'admin'}
             />
           )}

           {/* Message if filters selected but no tasks found */}
           {user?.role === 'admin' && selectedSemesterFilter && selectedUsnFilter && filteredTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[calc(100vh-250px)] text-center">
                   <Columns className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">No tasks found</p>
                  <p className="text-sm text-muted-foreground">
                     {selectedUsnFilter === 'all'
                       ? `No tasks found for Semester ${selectedSemesterFilter}.`
                       // Ensure displayed USN is uppercase
                       : `No tasks found for student ${selectedUsnFilter} in Semester ${selectedSemesterFilter}.`}
                   </p>
              </div>
            )}

             {/* Message if student has no tasks */}
            {user?.role === 'student' && filteredTasks.length === 0 && (
                 <div className="flex flex-col items-center justify-center h-[calc(100vh-250px)] text-center">
                     <Columns className="h-12 w-12 text-muted-foreground mb-4" />
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
          onCreate={handleCreateTask} // Handles uppercase USN creation
          isLoading={isCreatingTask}
        />
      )}
    </div>
  );
}
