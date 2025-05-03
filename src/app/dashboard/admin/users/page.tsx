
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { User } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Loader2, Filter, BookCopy, ArrowUpCircle, Trash2, UserX } from 'lucide-react'; // Added Trash2, UserX
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Added Select
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
} from "@/components/ui/alert-dialog"; // Added AlertDialog
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Added Tooltip


// Define semester options for filtering and promotion (add 'all' for filter)
const filterSemesterOptions = ['all', ...Array.from({ length: 8 }, (_, i) => String(i + 1))];
// Semesters eligible for promotion (1-7)
const promotableSemesterOptions = Array.from({ length: 7 }, (_, i) => String(i + 1));

// Define the master admin USN (must be uppercase) - used for UI checks - NEW CREDENTIALS
const MASTER_ADMIN_USN = 'MASTERADMIN1'; // New Master Admin USN

export default function ManageUsersPage() {
  const {
    user,
    loading,
    getAllUsers,
    updateUserRole,
    // promoteSemesters, // Removed global promote
    promoteSpecificSemester, // Added specific promote
    deleteUser, // Added delete user
    isMasterAdmin, // Added check for master admin
   } = useAuth();
  const router = useRouter();
  const [allUsers, setAllUsers] = useState<User[]>([]); // Store all fetched users
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]); // Users to display in the table
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [updatingUsers, setUpdatingUsers] = useState<Record<string, boolean>>({}); // Track loading state per user role update
  const [deletingUser, setDeletingUser] = useState<string | null>(null); // Track which user is being deleted
  const [isPromoting, setIsPromoting] = useState(false); // State for promotion loading
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<string>('all'); // Default to 'all'
  const [semesterToPromote, setSemesterToPromote] = useState<string | null>(null); // Track semester selected for promotion


  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Re-fetch if user changes


   // Filter users whenever allUsers or the semester filter changes
   useEffect(() => {
    if (selectedSemesterFilter === 'all') {
      setFilteredUsers(allUsers);
    } else {
      const semesterNumber = parseInt(selectedSemesterFilter, 10);
      setFilteredUsers(allUsers.filter(u => u.semester === semesterNumber));
    }
   }, [allUsers, selectedSemesterFilter]);


  const fetchUsers = async () => {
      setIsDataLoading(true);
      setError(null);
      try {
        const userList = await getAllUsers();
        // Ensure users are sorted (e.g., by semester then USN) for consistent display
        // USNs are already uppercase from context
        userList.sort((a, b) => (a.semester - b.semester) || a.usn.localeCompare(b.usn));
        setAllUsers(userList); // Store all users (USNs are uppercase)
      } catch (err: any) {
         console.error("Failed to fetch users:", err);
         setError(err.message || "Failed to load user data.");
         toast({
            variant: "destructive",
            title: "Error",
            description: err.message || "Could not fetch users.",
         });
      } finally {
         setIsDataLoading(false);
      }
  }

  const handleRoleChange = async (targetUser: User, newRole: 'student' | 'admin') => {
     // Compare uppercase USNs
     if (user?.usn === targetUser.usn) {
         toast({
             variant: "destructive",
             title: "Action Denied",
             description: "You cannot change your own role.",
         });
         return;
     }

    setUpdatingUsers(prev => ({ ...prev, [targetUser.usn]: true }));
    try {
      // Pass uppercase USN to context function
      await updateUserRole(targetUser.usn, newRole);
      // Update local state immediately for responsiveness (both allUsers and filteredUsers)
       const updateList = (list: User[]) => list.map(u =>
            u.usn === targetUser.usn ? { ...u, role: newRole } : u
       );
      setAllUsers(prev => updateList(prev)); // Update allUsers triggers useEffect for filteredUsers
      // Re-sort after update (USNs already uppercase)
      setAllUsers(prev => [...prev].sort((a, b) => (a.semester - b.semester) || a.usn.localeCompare(b.usn)));

      toast({
        title: "Success",
        description: `${targetUser.usn}'s role updated to ${newRole}.`,
      });
    } catch (err: any) {
      console.error("Failed to update role:", err);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: err.message || `Could not update role for ${targetUser.usn}.`,
      });
       // Revert visual state on error - update both lists
       const revertList = (list: User[]) => list.map(u =>
          u.usn === targetUser.usn ? { ...u, role: targetUser.role } : u // Revert to original role
       );
       setAllUsers(prev => revertList(prev));
        // Re-sort after revert (USNs already uppercase)
       setAllUsers(prev => [...prev].sort((a, b) => (a.semester - b.semester) || a.usn.localeCompare(b.usn)));

    } finally {
      setUpdatingUsers(prev => ({ ...prev, [targetUser.usn]: false }));
    }
  };

  const handlePromoteSemester = async () => {
    if (!semesterToPromote) {
        toast({
            variant: "destructive",
            title: "Selection Error",
            description: "Please select a semester (1-7) to promote.",
        });
        return;
    }

    const semesterNumber = parseInt(semesterToPromote, 10);
    setIsPromoting(true);
    try {
      const { promotedCount, maxSemesterCount } = await promoteSpecificSemester(semesterNumber);
      await fetchUsers(); // Re-fetch users to reflect changes
      toast({
        title: `Semester ${semesterNumber} Promoted`,
        description: `${promotedCount} student(s) moved to Semester ${semesterNumber + 1}. ${maxSemesterCount} student(s) are in Semester ${semesterNumber + 1} or higher.`,
      });
       setSemesterToPromote(null); // Reset dropdown after successful promotion
    } catch (err: any) {
      console.error(`Failed to promote semester ${semesterNumber}:`, err);
      toast({
        variant: "destructive",
        title: "Promotion Failed",
        description: err.message || `Could not promote semester ${semesterNumber}.`,
      });
    } finally {
      setIsPromoting(false);
    }
  };

   const handleDeleteUser = async (usnToDelete: string) => {
    setDeletingUser(usnToDelete); // Set loading state for this specific user
    try {
      await deleteUser(usnToDelete); // Context handles uppercase
      toast({
        title: "User Deleted",
        description: `User ${usnToDelete} and their associated tasks have been removed.`,
      });
      // Re-fetch users to update the list
      await fetchUsers();
    } catch (err: any) {
      console.error(`Failed to delete user ${usnToDelete}:`, err);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: err.message || `Could not delete user ${usnToDelete}.`,
      });
    } finally {
      setDeletingUser(null); // Clear loading state
    }
  };


  if (loading || !user) {
    // Show loading skeleton or redirect handled by useEffect
     return (
       <div className="container mx-auto p-4 pt-8">
         <Skeleton className="h-8 w-48 mb-6 bg-muted" />
         <div className="mb-4 flex flex-wrap justify-between items-center gap-4">
             {/* Skeleton for filter */}
            <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-20 bg-muted" />
                <Skeleton className="h-10 w-32 bg-muted" />
            </div>
             {/* Skeleton for Promote */}
            <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-32 bg-muted" />
                <Skeleton className="h-10 w-40 bg-muted" />
            </div>
         </div>
         <div className="border rounded-lg">
           <Table>
             <TableHeader>
                <TableRow>
                    <TableHead><Skeleton className="h-5 w-32 bg-muted" /></TableHead>
                    <TableHead><Skeleton className="h-5 w-16 bg-muted" /></TableHead> {/* Semester */}
                    <TableHead><Skeleton className="h-5 w-24 bg-muted" /></TableHead> {/* Role */}
                    <TableHead className="text-right"><Skeleton className="h-5 w-40 bg-muted ml-auto" /></TableHead>
                    {/* Skeleton for Delete */}
                    {isMasterAdmin && <TableHead className="text-right"><Skeleton className="h-5 w-20 bg-muted ml-auto" /></TableHead>}
                </TableRow>
             </TableHeader>
             <TableBody>
                {[...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-32 bg-muted" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16 bg-muted" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24 bg-muted" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-20 bg-muted ml-auto" /></TableCell>
                        {/* Skeleton for Delete */}
                        {isMasterAdmin && <TableCell className="text-right"><Skeleton className="h-8 w-20 bg-muted ml-auto" /></TableCell>}
                    </TableRow>
                ))}
             </TableBody>
           </Table>
         </div>
       </div>
     );
  }

   if (user.role !== 'admin') {
      // This should ideally be caught by the redirect, but serves as a fallback.
      return (
          <div className="container mx-auto p-4 pt-8 text-center text-destructive">
             Access Denied. Administrator privileges required.
          </div>
      );
   }


  return (
    <div className="container mx-auto p-4 pt-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
          <h1 className="text-2xl font-semibold text-primary">Manage Users</h1>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">

               {/* Semester Filter */}
               <div className="flex items-center gap-2">
                   <Label htmlFor="semester-filter" className="text-sm font-medium shrink-0">
                     <Filter className="inline-block h-4 w-4 mr-1 relative -top-px"/>
                     Filter:
                   </Label>
                   <Select
                     value={selectedSemesterFilter}
                     onValueChange={setSelectedSemesterFilter}
                     disabled={isDataLoading || isPromoting || !!deletingUser}
                   >
                     <SelectTrigger id="semester-filter" className="w-full sm:w-[180px]">
                       <SelectValue placeholder="Select Semester" />
                     </SelectTrigger>
                     <SelectContent>
                       {filterSemesterOptions.map(sem => (
                         <SelectItem key={sem} value={sem}>
                           {sem === 'all' ? 'All Semesters' : `Semester ${sem}`}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
               </div>

                {/* Promote Specific Semester */}
                <div className="flex items-center gap-2">
                     <Select
                        value={semesterToPromote ?? ''}
                        onValueChange={(value) => setSemesterToPromote(value === '' ? null : value)}
                        disabled={isDataLoading || isPromoting || !!deletingUser}
                    >
                        <SelectTrigger id="promote-semester-select" className="w-full sm:w-[150px]">
                            <SelectValue placeholder="Promote Sem..." />
                        </SelectTrigger>
                        <SelectContent>
                            {promotableSemesterOptions.map(sem => (
                                <SelectItem key={sem} value={sem}>
                                Sem {sem}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="outline"
                                disabled={isPromoting || isDataLoading || !semesterToPromote || !!deletingUser}
                                className="w-full sm:w-auto"
                            >
                                {isPromoting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowUpCircle className="mr-2 h-4 w-4" />}
                                Promote
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Promote Semester {semesterToPromote}?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will increment the semester ONLY for students currently in semester {semesterToPromote}. Students in semester 8 will remain in semester 8. This action cannot be easily undone. Are you sure?
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel disabled={isPromoting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handlePromoteSemester}
                                disabled={isPromoting}
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                                {isPromoting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Yes, Promote Sem {semesterToPromote}
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
          </div>
       </div>


       {error && (
           <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Users</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
           </Alert>
       )}


      {isDataLoading ? (
         <div className="border rounded-lg">
           <Table>
             <TableHeader>
                <TableRow>
                    <TableHead><Skeleton className="h-5 w-32 bg-muted" /></TableHead>
                     <TableHead><Skeleton className="h-5 w-16 bg-muted" /></TableHead> {/* Semester */}
                    <TableHead><Skeleton className="h-5 w-24 bg-muted" /></TableHead> {/* Role */}
                    <TableHead className="text-right"><Skeleton className="h-5 w-40 bg-muted ml-auto" /></TableHead>
                     {isMasterAdmin && <TableHead className="text-right"><Skeleton className="h-5 w-20 bg-muted ml-auto" /></TableHead>}
                </TableRow>
             </TableHeader>
             <TableBody>
                {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-32 bg-muted" /></TableCell>
                         <TableCell><Skeleton className="h-5 w-16 bg-muted" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24 bg-muted" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-20 bg-muted ml-auto" /></TableCell>
                         {isMasterAdmin && <TableCell className="text-right"><Skeleton className="h-8 w-20 bg-muted ml-auto" /></TableCell>}
                    </TableRow>
                ))}
             </TableBody>
           </Table>
         </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>USN</TableHead>
                <TableHead><BookCopy className="inline-block h-4 w-4 mr-1 relative -top-px" /> Semester</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Set Admin</TableHead>
                {/* Add Delete Header only for Master Admin */}
                {isMasterAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Filtered users already have uppercase USNs */}
              {filteredUsers.map((targetUser) => (
                <TableRow key={targetUser.usn} className={deletingUser === targetUser.usn ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{targetUser.usn}</TableCell>
                  <TableCell>{targetUser.semester || 'N/A'}</TableCell> {/* Display semester */}
                  <TableCell>{targetUser.role}</TableCell>
                  <TableCell className="text-right">
                     <div className="flex items-center justify-end space-x-2">
                       {updatingUsers[targetUser.usn] && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        <Switch
                            id={`admin-switch-${targetUser.usn}`}
                            checked={targetUser.role === 'admin'}
                            onCheckedChange={(checked) =>
                              handleRoleChange(targetUser, checked ? 'admin' : 'student')
                            }
                            // Admin cannot change own role. Disable if data loading, user updating, promoting, or deleting.
                            disabled={loading || !!updatingUsers[targetUser.usn] || isPromoting || user.usn === targetUser.usn || !!deletingUser}
                            aria-label={`Set ${targetUser.usn} as admin`}
                         />
                         <Label htmlFor={`admin-switch-${targetUser.usn}`} className="sr-only">
                            Set {targetUser.usn} as Admin
                         </Label>
                      </div>
                  </TableCell>
                  {/* Add Delete Button Cell only for Master Admin */}
                  {isMasterAdmin && (
                    <TableCell className="text-right">
                       {/* Don't show delete button for the master admin themselves */}
                      {targetUser.usn !== MASTER_ADMIN_USN && (
                        <AlertDialog>
                          <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                   <AlertDialogTrigger asChild>
                                      <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-destructive/80 hover:text-destructive"
                                          disabled={isPromoting || !!deletingUser || loading || updatingUsers[targetUser.usn]} // Disable if any operation is in progress
                                       >
                                          {deletingUser === targetUser.usn ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                                      </Button>
                                   </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Delete User</p>
                                </TooltipContent>
                              </Tooltip>
                          </TooltipProvider>
                          <AlertDialogContent>
                              <AlertDialogHeader>
                                  <AlertDialogTitle>Delete User {targetUser.usn}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete the user account for <span className="font-semibold">{targetUser.usn}</span> and all associated tasks. Are you sure?
                                  </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                  <AlertDialogCancel disabled={deletingUser === targetUser.usn}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                      onClick={() => handleDeleteUser(targetUser.usn)}
                                      disabled={deletingUser === targetUser.usn}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                      {deletingUser === targetUser.usn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                      Yes, Delete User
                                  </AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                       {/* Show a placeholder or icon if it's the master admin row */}
                       {targetUser.usn === MASTER_ADMIN_USN && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="inline-block h-8 w-8 pt-1.5 text-center text-muted-foreground">
                                            <UserX className="h-4 w-4 inline-block"/>
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Master admin cannot be deleted.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                       )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
           {filteredUsers.length === 0 && !isDataLoading && (
              <p className="p-4 text-center text-muted-foreground">
                  {selectedSemesterFilter === 'all' ? 'No users found.' : `No users found for Semester ${selectedSemesterFilter}.`}
              </p>
           )}
        </div>
      )}
    </div>
  );
}

    