
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { Task, TaskStatus } from '@/types/task';
import { User } from '@/types/user'; // Import User type
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Filter, BookCopy, Columns, ListTodo, Play, Check, CheckCheck, Inbox } from 'lucide-react'; // Added task status icons
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Added Card for counts

// Define semester options (1-8 and N/A for admins without semester)
const semesterOptions = [...Array.from({ length: 8 }, (_, i) => String(i + 1)), 'N/A'];


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
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<string | null>(null); // '1' to '8', 'N/A' or null
  const [selectedUsnFilter, setSelectedUsnFilter] = useState<string | null>(null); // 'all' or specific USN within selected semester, or null
  const [studentList, setStudentList] = useState<User[]>([]); // All users fetched initially
  const [filteredStudentList, setFilteredStudentList] = useState<User[]>([]); // Students/Admins filtered by selected semester
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);


   // Fetch all users for admin dropdowns
   useEffect(() => {
     const fetchUsers = async () => {
       if (user?.role === 'admin') {
         setIsFetchingUsers(true);
         try {
           const allUsers = await getAllUsers();
            // Ensure USNs are uppercase and semester is handled
           const processedUsers = allUsers.map(u => ({
             ...u,
             usn: u.usn.toUpperCase(),
             semester: u.semester, // Keep semester as number or null
            }));
           setStudentList(processedUsers); // Store all users initially
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
            let studentsInFilter: User[];
            if (selectedSemesterFilter === 'N/A') {
                // Filter for students/admins with null semester
                 studentsInFilter = studentList.filter(
                   (u) => (u.role === 'student' || u.role === 'admin') && u.semester === null
                 );
            } else {
                 // Filter for students/admins in a specific numeric semester
                const semesterNumber = parseInt(selectedSemesterFilter, 10);
                studentsInFilter = studentList.filter(
                    (u) => (u.role === 'student' || u.role === 'admin') && u.semester === semesterNumber
                );
            }

           // Sort users by USN
           studentsInFilter.sort((a, b) => a.usn.localeCompare(b.usn));
           setFilteredStudentList(studentsInFilter);
           // Reset USN filter when semester changes, unless it's 'all'
           // Keep 'all' selected if it was already selected
           if (selectedUsnFilter !== 'all') {
                setSelectedUsnFilter(null); // Reset to 'Select a user'
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
     // Semester is now number | null
     // Include assignedByName
     const { title, description, assignedByName, dueDate, usn: usnInput, semester } = newTaskData;


     // Validate semester (allow null, or 1-8)
     if (semester !== null && (semester < 1 || semester > 8)) {
       setAssignmentError("Invalid semester selected. Must be 1-8 or N/A.");
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
         const semesterTarget = semester; // number | null
         const assignmentTarget = usnInput.trim(); // Use the correctly destructured variable

         // Fetch users of the target semester if studentList is empty (fallback)
         const currentStudentList = studentList.length > 0 ? studentList : await getAllUsers();
         // Ensure USNs are uppercase and semester is handled
         const uppercaseStudentList = currentStudentList.map(u => ({
             ...u,
             usn: u.usn.toUpperCase(),
             semester: u.semester, // Keep number or null
         }));

          // Filter users matching the target semester (number or null)
         const usersInSemester = uppercaseStudentList.filter(
             (u) => (u.role === 'student' || u.role === 'admin') && u.semester === semesterTarget
         );

         if (assignmentTarget.toLowerCase() === 'all') {
             targetUsns = usersInSemester.map(u => u.usn); // Already uppercase
             if (targetUsns.length === 0) {
                  const semDisplay = semesterTarget === null ? 'N/A' : `semester ${semesterTarget}`;
                 setAssignmentError(`No users found in ${semDisplay}.`);
                 setIsCreatingTask(false);
                 return Promise.reject(`No users found in ${semDisplay}.`); // Return rejected promise
             }
         } else {
             const targetUsnUpper = assignmentTarget.toUpperCase(); // Ensure input USN is uppercase
             // Validate USN exists *within the target semester*
             const targetUser = usersInSemester.find(u => u.usn === targetUsnUpper);
             if (!targetUser) {
                 const semDisplay = semesterTarget === null ? 'N/A' : `semester ${semesterTarget}`;
                setAssignmentError(`User with USN ${targetUsnUpper} not found in ${semDisplay}.`);
                setIsCreatingTask(false);
                return Promise.reject(`User not found in ${semDisplay}.`); // Return rejected promise
             }
             targetUsns = [targetUsnUpper]; // Already uppercase
         }

         const taskIdBase = String(Date.now());
         const tasksToAdd: Task[] = targetUsns.map(assignedUsn => ({
            id: `${taskIdBase}-${assignedUsn}`, // Ensure unique ID per user task instance
            title: title,
            description: description,
            dueDate: dueDate,
            status: TaskStatus.ToBeStarted,
            assignedBy: user.usn, // Already uppercase from context
            assignedByName: assignedByName, // Add assignedByName
            usn: assignedUsn, // Already uppercase
            semester: semesterTarget, // Add semester (number or null) to the task
         }));

         await addMultipleTasks(tasksToAdd); // Context function handles uppercase & semester

          const semDisplay = semesterTarget === null ? 'N/A' : `semester ${semesterTarget}`;
         toast({
            title: "Task(s) Created",
             description: `Task assigned to ${assignmentTarget.toLowerCase() === 'all' ? targetUsns.length + ` user(s) in ${semDisplay}` : assignmentTarget.toUpperCase()}.`,
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
        // Only show tasks assigned BY the current admin
        if (task.assignedBy !== user.usn) {
            return false;
        }

        let semesterMatch = false;
         // 1. Check semester filter
        if (selectedSemesterFilter) {
             if (selectedSemesterFilter === 'N/A') {
                 semesterMatch = task.semester === null;
             } else {
                 semesterMatch = task.semester === parseInt(selectedSemesterFilter, 10);
             }
        }

        if (!semesterMatch && selectedSemesterFilter) {
             return false; // Doesn't match selected semester filter
        }

         // 2. If semester filter is active (or implicitly 'all' semesters if none selected, though UI prevents this now), apply USN filter
         if (selectedSemesterFilter) { // Only filter by USN if a semester filter is active
            if (selectedUsnFilter === 'all') {
                return true; // Show all tasks for the selected semester/N/A group assigned by this admin
            }
            if (selectedUsnFilter) {
                // Show tasks for the specific user in the selected semester/N/A group assigned by this admin
                // Context ensures task.usn is uppercase, selectedUsnFilter is also uppercase
                return task.usn === selectedUsnFilter;
            }
             return false; // If semester is selected but no USN filter ('all' or specific), show nothing
         }
         return false; // If no semester is selected, show nothing by default for admin
    }

    return false; // Default case
  });

   // Calculate task counts based on filteredTasks
   const taskCounts = useMemo(() => {
     const counts = {
       total: filteredTasks.length,
       [TaskStatus.ToBeStarted]: 0,
       [TaskStatus.InProgress]: 0,
       [TaskStatus.Completed]: 0, // Added count for Completed
       [TaskStatus.Submitted]: 0,
       [TaskStatus.Done]: 0,
     };
     filteredTasks.forEach(task => {
       counts[task.status]++;
     });
     return counts;
   }, [filteredTasks]);



  return (
    <div className="container mx-auto p-4 pt-8">
       <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-semibold text-primary">
          {/* Ensure user.usn and user.semester are displayed (handle null semester) */}
          {user.role === 'admin'
            ? `Admin Dashboard${user.semester !== null ? ` (Teacher - Sem ${user.semester})` : ' (Teacher)'}`
            : `Student Dashboard (${user.usn} - Sem ${user.semester === null ? 'N/A' : user.semester})`
          }
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
                       {sem === 'N/A' ? 'N/A (Admins)' : `Semester ${sem}`}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
            </div>

            {/* User Filter (appears after semester is selected) */}
            {selectedSemesterFilter && (
                <div className="flex items-center gap-2">
                   <Label htmlFor="user-filter" className="text-sm font-medium shrink-0">
                     <Filter className="inline-block h-4 w-4 mr-1 relative -top-px"/>
                     User:
                   </Label>
                   <Select
                     value={selectedUsnFilter ?? ''}
                      // Ensure value passed to onValueChange is uppercase or 'all'
                     onValueChange={(value) => setSelectedUsnFilter(value === '' ? null : (value === 'all' ? 'all' : value.toUpperCase()))}
                     disabled={isFetchingUsers || tasksLoading || !selectedSemesterFilter}
                   >
                     <SelectTrigger id="user-filter" className="w-full sm:w-[200px]">
                       <SelectValue placeholder={isFetchingUsers ? "Loading..." : "Select user..."} />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="all">
                            All Users in {selectedSemesterFilter === 'N/A' ? 'N/A' : `Sem ${selectedSemesterFilter}`}
                        </SelectItem>
                       {filteredStudentList.map(student => (
                         // Ensure value is uppercase
                         <SelectItem key={student.usn} value={student.usn}>
                           {student.usn} {student.role === 'admin' ? '(Admin/CR)' : ''}
                         </SelectItem>
                       ))}
                        {filteredStudentList.length === 0 && !isFetchingUsers && (
                           <p className="p-2 text-sm text-muted-foreground">
                               No users in {selectedSemesterFilter === 'N/A' ? 'N/A' : `Sem ${selectedSemesterFilter}`}
                           </p>
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

       {/* Task Counts (only if tasks are visible) */}
        {(user?.role === 'student' || (user?.role === 'admin' && selectedSemesterFilter && selectedUsnFilter)) && !tasksLoading && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                    <Inbox className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{taskCounts.total}</div>
                        <p className="text-xs text-muted-foreground">
                           {user.role === 'admin' ? `Assigned by you for filter` : 'Your assigned tasks'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{TaskStatus.ToBeStarted}</CardTitle>
                    <ListTodo className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                    <div className="text-2xl font-bold">{taskCounts[TaskStatus.ToBeStarted]}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{TaskStatus.InProgress}</CardTitle>
                    <Play className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                    <div className="text-2xl font-bold">{taskCounts[TaskStatus.InProgress]}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{TaskStatus.Submitted}</CardTitle>
                    <Check className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                    <div className="text-2xl font-bold">{taskCounts[TaskStatus.Submitted]}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{TaskStatus.Done}</CardTitle>
                    <CheckCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                    <div className="text-2xl font-bold">{taskCounts[TaskStatus.Done]}</div>
                    </CardContent>
                </Card>
                {/* Add Card for Completed status if needed */}
                {/* <Card> ... {TaskStatus.Completed} ... </Card> */}
            </div>
        )}
         {/* Skeleton for Task Counts */}
        {tasksLoading && (
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-6">
               {[...Array(5)].map((_, i) => (
                 <Card key={i}>
                   <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                     <Skeleton className="h-4 w-24 bg-muted" />
                     <Skeleton className="h-6 w-6 bg-muted" />
                   </CardHeader>
                   <CardContent>
                     <Skeleton className="h-8 w-12 bg-muted mb-1" />
                   </CardContent>
                 </Card>
               ))}
           </div>
        )}


      {tasksLoading ? (
         <div className="flex flex-col items-center justify-center h-[calc(100vh-350px)] text-center"> {/* Adjusted height */}
              <LoadingSpinner size={48} />
              <p className="text-lg font-medium text-muted-foreground mt-4 animate-pulse">Loading tasks...</p>
         </div>
      ) : (
        <>
          {/* Message for admin if no semester is selected */}
          {user?.role === 'admin' && !selectedSemesterFilter && (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-350px)] text-center"> {/* Adjusted height */}
               <BookCopy className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Select a semester</p>
              <p className="text-sm text-muted-foreground">Choose a semester (or N/A) from the dropdown above to view tasks assigned by you.</p>
            </div>
          )}

           {/* Message for admin if semester selected but no USN filter */}
           {user?.role === 'admin' && selectedSemesterFilter && !selectedUsnFilter && (
             <div className="flex flex-col items-center justify-center h-[calc(100vh-350px)] text-center"> {/* Adjusted height */}
               <Filter className="h-12 w-12 text-muted-foreground mb-4" />
               <p className="text-lg font-medium text-muted-foreground">Select a user filter</p>
                <p className="text-sm text-muted-foreground">
                   Choose 'All Users' or a specific user to view tasks assigned by you for {selectedSemesterFilter === 'N/A' ? 'N/A' : `Semester ${selectedSemesterFilter}`}.
                </p>
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
              <div className="flex flex-col items-center justify-center h-[calc(100vh-350px)] text-center"> {/* Adjusted height */}
                   <Columns className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">No tasks found</p>
                  <p className="text-sm text-muted-foreground">
                     {selectedUsnFilter === 'all'
                        ? `No tasks assigned by you found for ${selectedSemesterFilter === 'N/A' ? 'N/A' : `Semester ${selectedSemesterFilter}`}.`
                       // Ensure displayed USN is uppercase
                        : `No tasks assigned by you found for user ${selectedUsnFilter} in ${selectedSemesterFilter === 'N/A' ? 'N/A' : `Semester ${selectedSemesterFilter}`}.`}
                   </p>
              </div>
            )}

             {/* Message if student has no tasks */}
            {user?.role === 'student' && filteredTasks.length === 0 && (
                 <div className="flex flex-col items-center justify-center h-[calc(100vh-350px)] text-center"> {/* Adjusted height */}
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
          onCreate={handleCreateTask} // Handles uppercase USN creation & null semester
          isLoading={isCreatingTask}
        />
      )}
    </div>
  );
}
