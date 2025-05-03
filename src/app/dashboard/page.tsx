
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { Task, TaskStatus } from '@/types/task';
import { User } from '@/types/user'; // Import User type
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Filter, BookCopy, Columns, ListTodo, Play, Check, CheckCheck, Inbox, RefreshCw, Edit, Trash2, Download, History } from 'lucide-react'; // Added History icon
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"; // Import Table components
// AlertDialog is no longer needed in this file after removing delete from submitted table
// Tooltip is no longer needed here
import { format } from 'date-fns'; // Import format for dates


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
    fetchTasks, // Get fetchTasks from context
    isMasterAdmin, // Get master admin status
    deleteTask, // Get deleteTask from context
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
  const [isRefreshing, setIsRefreshing] = useState(false); // State for refresh button loading
  // isDeletingTask state removed as delete button moved from this file context

   // Fetch all users for admin dropdowns
   useEffect(() => {
     const fetchUsers = async () => {
       // Fetch users if admin (regular or master)
       if (user?.role === 'admin') {
         setIsFetchingUsers(true);
         try {
           const allUsers = await getAllUsers(); // Fetches latest user list
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
     // Don't re-run fetchUsers if getAllUsers changes identity, only if user changes
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [user, toast]); // Removed getAllUsers dependency

   // Update filtered student list when semester filter changes
   useEffect(() => {
       if (user?.role === 'admin' && selectedSemesterFilter) {
            let usersInFilter: User[];
            if (selectedSemesterFilter === 'N/A') {
                // Filter for students/admins with null semester
                 usersInFilter = studentList.filter(
                   (u) => (u.role === 'student' || u.role === 'admin') && u.semester === null
                 );
            } else {
                 // Filter for students/admins in a specific numeric semester
                const semesterNumber = parseInt(selectedSemesterFilter, 10);
                usersInFilter = studentList.filter(
                    (u) => (u.role === 'student' || u.role === 'admin') && u.semester === semesterNumber
                );
            }

           // Sort users by USN
           usersInFilter.sort((a, b) => a.usn.localeCompare(b.usn));
           setFilteredStudentList(usersInFilter);
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
     if (!user || user.role !== 'admin' || isMasterAdmin) return Promise.reject("Permission denied."); // Prevent master admin from creating via this dialog

     setIsCreatingTask(true);
     setAssignmentError(null);
     console.log("Creating new task with data:", newTaskData);

     const { title, description, assignedByName, dueDate, usn: usnInput, semester: semesterString } = newTaskData;

     // Convert semester string ('1'-'8', 'N/A') to number | null
      const semesterTarget = semesterString === 'N/A' ? null : parseInt(semesterString, 10);

     if (semesterTarget !== null && (semesterTarget < 1 || semesterTarget > 8)) {
         setAssignmentError("Invalid semester selected. Must be 1-8 or N/A.");
         setIsCreatingTask(false);
         return Promise.reject("Invalid semester selected.");
     }


     if (usnInput === undefined || usnInput === null) {
         setAssignmentError("Assignment target (USN or 'all') is missing.");
         setIsCreatingTask(false);
         return Promise.reject("Assignment target is missing.");
     }

     try {
         let targetUsns: string[] = [];
         const assignmentTarget = usnInput.trim();
         console.log(`Assignment Target: '${assignmentTarget}', Semester Target: ${semesterTarget}`);

         // --- Fetch ALL users *within* the function to get the latest list ---
         const allCurrentUsers = await getAllUsers();
         const uppercaseUserList = allCurrentUsers.map(u => ({
             ...u,
             usn: u.usn.toUpperCase(),
             semester: u.semester,
         }));
         console.log("Fetched users inside handleCreateTask:", uppercaseUserList.length);
         // ---

         const usersInSemester = uppercaseUserList.filter(
             (u) => (u.role === 'student' || u.role === 'admin') && u.semester === semesterTarget
         );
         console.log(`Users found in target semester (${semesterTarget}):`, usersInSemester.length, usersInSemester.map(u => u.usn));


         if (assignmentTarget.toLowerCase() === 'all') {
             targetUsns = usersInSemester.map(u => u.usn); // Already uppercase
             if (targetUsns.length === 0) {
                 const semDisplay = semesterTarget === null ? 'N/A' : `semester ${semesterTarget}`;
                 setAssignmentError(`No users found in ${semDisplay}.`);
                 setIsCreatingTask(false);
                 return Promise.reject(`No users found in ${semDisplay}.`);
             }
             console.log(`Assigning to 'all' in semester ${semesterTarget}. Target USNs:`, targetUsns);
         } else {
             const targetUsnUpper = assignmentTarget.toUpperCase();
             const targetUser = usersInSemester.find(u => u.usn === targetUsnUpper);
             if (!targetUser) {
                 const semDisplay = semesterTarget === null ? 'N/A' : `semester ${semesterTarget}`;
                 setAssignmentError(`User with USN ${targetUsnUpper} not found in ${semDisplay}.`);
                 setIsCreatingTask(false);
                 console.error(`User ${targetUsnUpper} not found in semester ${semesterTarget}. Available in semester:`, usersInSemester.map(u => u.usn));
                 return Promise.reject(`User not found in ${semDisplay}.`);
             }
             targetUsns = [targetUsnUpper];
             console.log(`Assigning to specific USN: ${targetUsnUpper}`);
         }

         const taskIdBase = String(Date.now());
         const tasksToAdd: Task[] = targetUsns.map(assignedUsn => ({
             id: `${taskIdBase}-${assignedUsn}`, // Ensure unique ID per user task instance
             title: title,
             description: description,
             dueDate: dueDate,
             status: TaskStatus.ToBeStarted,
             assignedBy: user.usn, // Already uppercase from context
             assignedByName: assignedByName,
             usn: assignedUsn, // Already uppercase
             semester: semesterTarget, // Use the number | null value
         }));

         console.log("Tasks to be added:", tasksToAdd);
         await addMultipleTasks(tasksToAdd); // Calls context function

         // --- Retroactive Assignment is handled by registration logic in AuthProvider ---
         console.log("Registration logic handles retroactive assignment for new users.");


         const semDisplay = semesterTarget === null ? 'N/A' : `semester ${semesterTarget}`;
         toast({
             title: "Task(s) Created",
             description: `Task assigned to ${assignmentTarget.toLowerCase() === 'all' ? targetUsns.length + ` user(s) in ${semDisplay}` : assignmentTarget.toUpperCase()}.`,
         });
         setIsCreateTaskOpen(false); // Close dialog on success

         // --- Refresh tasks locally after creation ---
         await fetchTasks(); // Fetch updated tasks list

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


  // Filter tasks for the Kanban board based on role and selected filters
  const filteredTasks = useMemo(() => {
     if (!user) return []; // Should not happen due to layout guard

     // --- Student View ---
     if (user.role === 'student') {
         // Context ensures user.usn and task.usn are uppercase
         return tasks.filter(task => task.usn === user.usn);
     }

     // --- Admin View (Regular or Master) ---
     if (user.role === 'admin') {
        // Require semester filter to be selected before showing any tasks
        if (!selectedSemesterFilter || !selectedUsnFilter) {
            return [];
        }

        // Determine target semester value (number or null)
         const targetSemesterValue = selectedSemesterFilter === 'N/A' ? null : parseInt(selectedSemesterFilter, 10);

         // Filter tasks matching the selected semester and USN filter
          return tasks.filter(task => {
                // 1. Match semester
                const semesterMatch = task.semester === targetSemesterValue;
                if (!semesterMatch) return false;

                // 2. Match USN filter ('all' or specific)
                if (selectedUsnFilter === 'all') {
                    // Show all tasks for the selected semester
                    return true;
                } else {
                    // Show tasks assigned TO the specific selected user
                    return task.usn === selectedUsnFilter; // Both should be uppercase
                }
            });

         // Old logic based on assignedBy for non-master admin is removed
         // Master admin now sees all tasks for the filter, non-master sees all tasks for the filter
         // Specific filtering for "Tasks Created By You" happens in a separate memo below
     }

     return []; // Default case (shouldn't be reached)
  }, [user, tasks, selectedSemesterFilter, selectedUsnFilter]); // Removed isMasterAdmin dependency as logic unified


   // Calculate task counts based on filteredTasks for the Kanban board
   const kanbanTaskCounts = useMemo(() => {
     const counts = {
       total: filteredTasks.length,
       [TaskStatus.ToBeStarted]: 0,
       [TaskStatus.InProgress]: 0,
       [TaskStatus.Completed]: 0,
       [TaskStatus.Submitted]: 0,
       [TaskStatus.Done]: 0,
     };
     filteredTasks.forEach(task => {
       counts[task.status]++;
     });
     return counts;
   }, [filteredTasks]);

   // Filter for "Tasks Created By You" (Regular Admin view only, based on semester/USN filter)
    const tasksCreatedByAdmin = useMemo(() => {
        if (!user || user.role !== 'admin' || isMasterAdmin || !selectedSemesterFilter) {
           return []; // Only show for regular admins with a semester selected
        }
         const targetSemesterValue = selectedSemesterFilter === 'N/A' ? null : parseInt(selectedSemesterFilter, 10);

         return tasks.filter(task =>
             task.assignedBy === user.usn && // Only tasks assigned BY this admin
             task.semester === targetSemesterValue && // Match the selected semester filter
              // Match USN filter if not 'all'
             (selectedUsnFilter === 'all' || task.usn === selectedUsnFilter)
        ).sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime()); // Sort by due date descending
    }, [user, tasks, selectedSemesterFilter, selectedUsnFilter, isMasterAdmin]);


   // Handler for Refresh button
   const handleRefreshTasks = async () => {
      if (!user || user.role !== 'admin') return; // Only admins can refresh
      setIsRefreshing(true);
      try {
         // Fetch latest users first (in case new ones were registered)
          await fetchUsersForDropdown(); // Call the refactored user fetching logic
          // Fetch latest tasks from storage
         await fetchTasks();
         toast({
            title: "Tasks Refreshed",
            description: "Latest tasks and user data loaded.",
         });
      } catch (error: any) {
         console.error("Failed to refresh tasks:", error);
         toast({
            variant: "destructive",
            title: "Refresh Failed",
            description: error.message || "Could not refresh tasks.",
         });
      } finally {
         setIsRefreshing(false);
      }
   };

    // Refactored user fetching logic for dropdowns
    const fetchUsersForDropdown = async () => {
       if (user?.role === 'admin') {
          setIsFetchingUsers(true);
          try {
             const allUsers = await getAllUsers(); // Fetches latest user list
             const processedUsers = allUsers.map(u => ({
                ...u,
                usn: u.usn.toUpperCase(),
                semester: u.semester,
             }));
             setStudentList(processedUsers);
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

    // Initial fetch for users on component mount
    useEffect(() => {
       fetchUsersForDropdown();
       // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, toast]); // Dependencies: user (to trigger on role change), toast (stable)

    // Edit/Delete/Download handlers removed from here, handled in TaskCard contextually

  return (
    <div className="container mx-auto p-4 pt-8">
       <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-semibold text-primary">
           {user.role === 'admin'
            ? `${isMasterAdmin ? 'Master Admin' : 'Admin'} Dashboard${user.semester !== null ? ` (Teacher - Sem ${user.semester})` : ' (Teacher)'}`
            : `Student Dashboard (${user.usn} - Sem ${user.semester === null ? 'N/A' : user.semester})`
           }
        </h1>
        {/* Admin Controls: Create Task, Filters, and Refresh */}
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
                 disabled={isFetchingUsers || tasksLoading || isRefreshing} // Disable during refresh
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
                     View User: {/* Changed label to be consistent */}
                   </Label>
                   <Select
                     value={selectedUsnFilter ?? ''}
                     onValueChange={(value) => setSelectedUsnFilter(value === '' ? null : (value === 'all' ? 'all' : value.toUpperCase()))}
                     disabled={isFetchingUsers || tasksLoading || !selectedSemesterFilter || isRefreshing} // Disable during refresh
                   >
                     <SelectTrigger id="user-filter" className="w-full sm:w-[200px]">
                       <SelectValue placeholder={isFetchingUsers ? "Loading..." : "Select user..."} />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="all">
                            All Users in {selectedSemesterFilter === 'N/A' ? 'N/A' : `Sem ${selectedSemesterFilter}`}
                        </SelectItem>
                       {filteredStudentList.map(student => (
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


             {/* Create Task Button (Only for Regular Admins) */}
             {!isMasterAdmin && (
                 <Button onClick={() => setIsCreateTaskOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90 w-full sm:w-auto ml-auto" disabled={isCreatingTask || isRefreshing}>
                   {isCreatingTask ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                   Create Task
                 </Button>
             )}
              {/* Refresh Tasks Button (for Admins) */}
              <Button onClick={handleRefreshTasks} variant="outline" className="w-full sm:w-auto" disabled={isRefreshing || tasksLoading}>
                 {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                 Refresh Tasks
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

       {/* Task Counts for Kanban (only if tasks are visible) */}
        {(user?.role === 'student' || (user?.role === 'admin' && selectedSemesterFilter && selectedUsnFilter)) && !tasksLoading && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Visible Tasks</CardTitle> {/* Changed title */}
                    <Inbox className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kanbanTaskCounts.total}</div>
                        <p className="text-xs text-muted-foreground">
                            {user.role === 'admin'
                                ? 'Tasks matching current filter'
                                : 'Your assigned tasks'
                            }
                        </p>
                    </CardContent>
                </Card>
                {/* Status counts based on filteredTasks */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{TaskStatus.ToBeStarted}</CardTitle>
                    <ListTodo className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                    <div className="text-2xl font-bold">{kanbanTaskCounts[TaskStatus.ToBeStarted]}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{TaskStatus.InProgress}</CardTitle>
                    <Play className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                    <div className="text-2xl font-bold">{kanbanTaskCounts[TaskStatus.InProgress]}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{TaskStatus.Submitted}</CardTitle>
                    <Check className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                    <div className="text-2xl font-bold">{kanbanTaskCounts[TaskStatus.Submitted]}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{TaskStatus.Done}</CardTitle>
                    <CheckCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                    <div className="text-2xl font-bold">{kanbanTaskCounts[TaskStatus.Done]}</div>
                    </CardContent>
                </Card>
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
              <p className="text-sm text-muted-foreground">
                 Choose a semester (or N/A) to view tasks.
              </p>
            </div>
          )}

           {/* Message for admin if semester selected but no USN filter */}
           {user?.role === 'admin' && selectedSemesterFilter && !selectedUsnFilter && (
             <div className="flex flex-col items-center justify-center h-[calc(100vh-350px)] text-center"> {/* Adjusted height */}
               <Filter className="h-12 w-12 text-muted-foreground mb-4" />
               <p className="text-lg font-medium text-muted-foreground">Select a user filter</p>
                <p className="text-sm text-muted-foreground">
                    Choose 'All Users' or a specific user to view their tasks for {selectedSemesterFilter === 'N/A' ? 'N/A' : `Semester ${selectedSemesterFilter}`}.
                </p>
             </div>
           )}

           {/* Show Kanban board if student OR if admin has selected semester AND (usn or 'all') */}
           {(user?.role === 'student' || (user?.role === 'admin' && selectedSemesterFilter && selectedUsnFilter)) && (
             <KanbanBoard
                 tasks={filteredTasks} // Filtered for the board view
                 isAdmin={user.role === 'admin'}
             />
           )}

           {/* Message if filters selected but no tasks found for Kanban */}
            {user?.role === 'admin' && selectedSemesterFilter && selectedUsnFilter && filteredTasks.length === 0 && tasksCreatedByAdmin.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[calc(100vh-350px)] text-center"> {/* Adjusted height */}
                   <Columns className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">No tasks found</p>
                  <p className="text-sm text-muted-foreground">
                      No tasks match the current filters.
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


            {/* --- Tasks Created By You Table (Regular Admin Only) --- */}
             {user?.role === 'admin' && !isMasterAdmin && selectedSemesterFilter && tasksCreatedByAdmin.length > 0 && (
                 <div className="mt-12"> {/* Add margin top */}
                     <h2 className="text-xl font-semibold text-primary mb-4 flex items-center">
                        <History className="mr-2 h-5 w-5" /> Tasks Created By You ({tasksCreatedByAdmin.length})
                     </h2>
                     <p className="text-sm text-muted-foreground mb-4">
                        Showing tasks you assigned matching the filter: Semester {selectedSemesterFilter === 'N/A' ? 'N/A' : selectedSemesterFilter}, User {selectedUsnFilter ?? 'All'}.
                     </p>
                     <div className="border rounded-lg overflow-hidden">
                         <Table>
                             <TableHeader>
                                 <TableRow>
                                     <TableHead>Task Title</TableHead>
                                     <TableHead>Assigned To (USN)</TableHead>
                                     <TableHead>Current Status</TableHead>
                                     <TableHead>Due Date</TableHead>
                                     {/* Remove Actions column for simplicity here */}
                                     {/* <TableHead className="text-right">Actions</TableHead> */}
                                 </TableRow>
                             </TableHeader>
                             <TableBody>
                                 {tasksCreatedByAdmin.map((task) => (
                                     <TableRow key={task.id}>
                                         <TableCell className="font-medium">{task.title}</TableCell>
                                         <TableCell>{task.usn}</TableCell>
                                         <TableCell>{task.status}</TableCell>
                                         <TableCell>
                                             {format(task.dueDate, 'PP')} {/* Format date */}
                                         </TableCell>
                                         {/* Remove Actions Cell */}
                                          {/* <TableCell className="text-right space-x-1">
                                             <Button variant="ghost" size="icon" disabled> <Edit className="h-4 w-4" /> </Button>
                                             <Button variant="ghost" size="icon" disabled> <Trash2 className="h-4 w-4" /> </Button>
                                         </TableCell> */}
                                     </TableRow>
                                 ))}
                             </TableBody>
                         </Table>
                     </div>
                 </div>
             )}

              {/* Message if filters selected, Kanban tasks might exist, but NO tasks created by this admin match filter */}
              {user?.role === 'admin' && !isMasterAdmin && selectedSemesterFilter && filteredTasks.length > 0 && tasksCreatedByAdmin.length === 0 && (
                 <div className="mt-12 p-6 text-center text-muted-foreground border rounded-lg">
                    You have not created any tasks that match the current filter criteria.
                 </div>
              )}
             {/* --- End Tasks Created By You Table --- */}

        </>
      )}


       {/* Create Task Dialog (Only for Regular Admins) */}
      {user.role === 'admin' && !isMasterAdmin && (
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
