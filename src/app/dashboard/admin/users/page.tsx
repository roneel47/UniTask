
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { User } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Added Input for search
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
    AlertCircle, Loader2, Filter, BookCopy, ArrowUpCircle, Trash2, UserX, UserSearch, Search, Users, UserCheck, BarChart3, Hash, XCircle
} from 'lucide-react'; // Added icons
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LoadingSpinner } from '@/components/layout/loading-spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Added Card for counts

// Define semester options for filtering and promotion (add 'all', 'N/A')
const filterSemesterOptions = ['all', ...Array.from({ length: 8 }, (_, i) => String(i + 1)), 'N/A'];
// Semesters eligible for promotion (1-7)
const promotableSemesterOptions = Array.from({ length: 7 }, (_, i) => String(i + 1));
// Role filter options
const roleFilterOptions = ['all', 'admin', 'student'];

// Define the master admin USN (must be uppercase) - used for UI checks
const MASTER_ADMIN_USN = 'MASTERADMIN1';

export default function ManageUsersPage() {
  const {
    user,
    loading,
    getAllUsers,
    updateUserRole,
    promoteSpecificSemester,
    deleteUser,
    removeAdminSemester, // Added remove semester function
    isMasterAdmin,
   } = useAuth();
  const router = useRouter();
  const [allUsers, setAllUsers] = useState<User[]>([]); // Store all fetched users
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]); // Users to display in the table
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [updatingUsers, setUpdatingUsers] = useState<Record<string, boolean>>({}); // Track loading state per user role update
  const [removingSemester, setRemovingSemester] = useState<string | null>(null); // Track semester removal loading
  const [deletingUser, setDeletingUser] = useState<string | null>(null); // Track which user is being deleted
  const [isPromoting, setIsPromoting] = useState(false); // State for promotion loading
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
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


   // Calculate counts based on allUsers
   const userCounts = useMemo(() => {
       const totalUsers = allUsers.length;
       const totalAdmins = allUsers.filter(u => u.role === 'admin').length;
       const totalStudents = totalUsers - totalAdmins;
       const studentsBySemester: Record<string, number> = {};
       for (let i = 1; i <= 8; i++) {
           studentsBySemester[String(i)] = 0;
       }
       studentsBySemester['N/A'] = 0; // Count students with null semester if needed

       allUsers.forEach(u => {
           if (u.role === 'student') {
               if (u.semester !== null && u.semester >= 1 && u.semester <= 8) {
                   studentsBySemester[String(u.semester)]++;
               } else if (u.semester === null) {
                    studentsBySemester['N/A']++; // Increment N/A count for students
               }
           }
       });

       return {
           totalUsers,
           totalAdmins,
           totalStudents,
           studentsBySemester,
       };
   }, [allUsers]);


   // Filter users whenever allUsers or filters change
   useEffect(() => {
    let currentlyFiltered = [...allUsers];

    // 1. Filter by Role
    if (selectedRoleFilter !== 'all') {
      currentlyFiltered = currentlyFiltered.filter(u => u.role === selectedRoleFilter);
    }

    // 2. Filter by Semester
    if (selectedSemesterFilter !== 'all') {
      if (selectedSemesterFilter === 'N/A') {
        currentlyFiltered = currentlyFiltered.filter(u => u.semester === null);
      } else {
        const semesterNumber = parseInt(selectedSemesterFilter, 10);
        currentlyFiltered = currentlyFiltered.filter(u => u.semester === semesterNumber);
      }
    }

    // 3. Filter by Search Term (USN)
    if (searchTerm.trim()) {
       const lowerSearchTerm = searchTerm.toLowerCase();
       // Compare against uppercase USNs from state
       currentlyFiltered = currentlyFiltered.filter(u =>
          u.usn.toLowerCase().includes(lowerSearchTerm)
       );
    }

    // Ensure consistent sorting (e.g., by role, then semester, then USN)
     currentlyFiltered.sort((a, b) => {
        // Sort by role first (admin, then student)
        if (a.role !== b.role) {
            return a.role === 'admin' ? -1 : 1;
        }
        // Then sort by semester (nulls/N/A first, then numerically)
        if (a.semester === null && b.semester !== null) return -1;
        if (a.semester !== null && b.semester === null) return 1;
        if (a.semester !== null && b.semester !== null && a.semester !== b.semester) {
            return a.semester - b.semester;
        }
        // Finally, sort by USN
        return a.usn.localeCompare(b.usn);
     });


    setFilteredUsers(currentlyFiltered);
   }, [allUsers, selectedRoleFilter, selectedSemesterFilter, searchTerm]);


  const fetchUsers = async () => {
      setIsDataLoading(true);
      setError(null);
      try {
        const userList = await getAllUsers(); // Context ensures these have correct semester types (number | null)
        // Sorting is now handled in the filtering useEffect
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
      // Update local state immediately for responsiveness (only allUsers)
       const updateList = (list: User[]) => list.map(u =>
            u.usn === targetUser.usn ? { ...u, role: newRole } : u
       );
      setAllUsers(prev => updateList(prev)); // Update allUsers triggers filtering useEffect

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
       // Revert visual state on error - update allUsers list
       const revertList = (list: User[]) => list.map(u =>
          u.usn === targetUser.usn ? { ...u, role: targetUser.role } : u // Revert to original role
       );
       setAllUsers(prev => revertList(prev)); // Update allUsers triggers filtering useEffect

    } finally {
      setUpdatingUsers(prev => ({ ...prev, [targetUser.usn]: false }));
    }
  };

  const handleRemoveSemester = async (targetUserUsn: string) => {
      if (!isMasterAdmin) return; // Only master admin can trigger this

      setRemovingSemester(targetUserUsn);
      try {
          await removeAdminSemester(targetUserUsn); // Context handles uppercase
          toast({
              title: "Semester Removed",
              description: `Semester has been removed for admin ${targetUserUsn}.`,
          });
           // Re-fetch users to reflect the change
          await fetchUsers();
      } catch (err: any) {
           console.error(`Failed to remove semester for ${targetUserUsn}:`, err);
           toast({
               variant: "destructive",
               title: "Action Failed",
               description: err.message || `Could not remove semester for ${targetUserUsn}.`,
           });
      } finally {
           setRemovingSemester(null);
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
     return (
       <div className="container mx-auto p-4 pt-8">
         <Skeleton className="h-8 w-48 mb-6 bg-muted" />
         {/* Skeleton for Counts */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24 bg-muted" />
                  <Skeleton className="h-6 w-6 bg-muted" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 bg-muted mb-1" />
                  <Skeleton className="h-3 w-32 bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Skeleton for Filters */}
          <div className="mb-4 flex flex-col md:flex-row gap-4">
             <Skeleton className="h-10 w-full md:w-64 bg-muted" /> {/* Search */}
             <Skeleton className="h-10 w-full md:w-40 bg-muted" /> {/* Role */}
             <Skeleton className="h-10 w-full md:w-48 bg-muted" /> {/* Semester Filter */}
             {/* Skeleton for Promote */}
             <div className="flex items-center gap-2 ml-auto">
                 <Skeleton className="h-10 w-32 bg-muted" />
                 <Skeleton className="h-10 w-28 bg-muted" />
             </div>
          </div>
         {/* Skeleton for Table */}
         <div className="border rounded-lg">
           <Table>
             <TableHeader>
                <TableRow>
                    <TableHead><Skeleton className="h-5 w-32 bg-muted" /></TableHead>
                    <TableHead><Skeleton className="h-5 w-20 bg-muted" /></TableHead> {/* Role */}
                    <TableHead><Skeleton className="h-5 w-20 bg-muted" /></TableHead> {/* Semester */}
                    <TableHead className="text-right"><Skeleton className="h-5 w-32 bg-muted ml-auto" /></TableHead> {/* Set Admin */}
                    {/* Skeleton for Actions */}
                    <TableHead className="text-right"><Skeleton className="h-5 w-24 bg-muted ml-auto" /></TableHead>
                </TableRow>
             </TableHeader>
             <TableBody>
                {[...Array(5)].map((_, i) => ( // Show 5 skeleton rows
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-32 bg-muted" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20 bg-muted" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20 bg-muted" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-20 bg-muted ml-auto" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-20 bg-muted ml-auto" /></TableCell>
                    </TableRow>
                ))}
             </TableBody>
           </Table>
           <div className="flex items-center justify-center p-6 text-muted-foreground">
               <LoadingSpinner size={24} className="mr-2" />
               Loading users...
           </div>
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
          {/* Promote Section (Moved to Filters Area) */}
       </div>

        {/* User Counts */}
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">{isDataLoading ? <Skeleton className="h-8 w-16 bg-muted"/> : userCounts.totalUsers}</div>
                <p className="text-xs text-muted-foreground">All registered accounts</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Administrators</CardTitle>
                 <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                 <div className="text-2xl font-bold">{isDataLoading ? <Skeleton className="h-8 w-16 bg-muted"/> : userCounts.totalAdmins}</div>
                <p className="text-xs text-muted-foreground">Including master admin</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Students</CardTitle>
                 <UserSearch className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                 <div className="text-2xl font-bold">{isDataLoading ? <Skeleton className="h-8 w-16 bg-muted"/> : userCounts.totalStudents}</div>
                <p className="text-xs text-muted-foreground">Currently enrolled students</p>
                </CardContent>
            </Card>
            <Card>
                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 <CardTitle className="text-sm font-medium">Students by Sem</CardTitle>
                 <BarChart3 className="h-4 w-4 text-muted-foreground" />
                 </CardHeader>
                 <CardContent>
                    {isDataLoading ? <Skeleton className="h-16 w-full bg-muted"/> : (
                        <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-2 gap-y-0.5">
                           {Object.entries(userCounts.studentsBySemester).map(([sem, count]) => (
                             <span key={sem} className="flex justify-between">
                                 <span>Sem {sem}:</span>
                                 <span className="font-medium text-foreground">{count}</span>
                             </span>
                           ))}
                        </div>
                    )}
                 </CardContent>
            </Card>
       </div>


       {/* Filters Row */}
        <div className="mb-4 flex flex-col md:flex-row gap-4 flex-wrap">
             {/* Search Input */}
             <div className="relative flex-grow md:flex-grow-0 md:w-64">
                 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                 <Input
                     type="search"
                     placeholder="Search by USN..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="pl-8 w-full"
                     disabled={isDataLoading || isPromoting || !!deletingUser || !!removingSemester}
                 />
             </div>

              {/* Role Filter */}
              <div className="flex items-center gap-2">
                   <Label htmlFor="role-filter" className="text-sm font-medium shrink-0">
                     <Filter className="inline-block h-4 w-4 mr-1 relative -top-px"/> Role:
                   </Label>
                   <Select
                     value={selectedRoleFilter}
                     onValueChange={setSelectedRoleFilter}
                     disabled={isDataLoading || isPromoting || !!deletingUser || !!removingSemester}
                   >
                     <SelectTrigger id="role-filter" className="w-full md:w-[150px]">
                       <SelectValue placeholder="Select Role" />
                     </SelectTrigger>
                     <SelectContent>
                       {roleFilterOptions.map(role => (
                         <SelectItem key={role} value={role}>
                           {role === 'all' ? 'All Roles' : role.charAt(0).toUpperCase() + role.slice(1)}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
               </div>

               {/* Semester Filter */}
               <div className="flex items-center gap-2">
                   <Label htmlFor="semester-filter" className="text-sm font-medium shrink-0">
                     <BookCopy className="inline-block h-4 w-4 mr-1 relative -top-px"/> Sem:
                   </Label>
                   <Select
                     value={selectedSemesterFilter}
                     onValueChange={setSelectedSemesterFilter}
                     disabled={isDataLoading || isPromoting || !!deletingUser || !!removingSemester}
                   >
                     <SelectTrigger id="semester-filter" className="w-full md:w-[180px]">
                       <SelectValue placeholder="Select Semester" />
                     </SelectTrigger>
                     <SelectContent>
                       {filterSemesterOptions.map(sem => (
                         <SelectItem key={sem} value={sem}>
                           {sem === 'all' ? 'All Semesters' : sem === 'N/A' ? 'N/A' : `Semester ${sem}`}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
               </div>

               {/* Promote Specific Semester (Moved to the right) */}
                <div className="flex items-center gap-2 md:ml-auto">
                     <Select
                        value={semesterToPromote ?? ''}
                        onValueChange={(value) => setSemesterToPromote(value === '' ? null : value)}
                        disabled={isDataLoading || isPromoting || !!deletingUser || !!removingSemester}
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
                                disabled={isPromoting || isDataLoading || !semesterToPromote || !!deletingUser || !!removingSemester}
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


       {error && (
           <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Users</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
           </Alert>
       )}


      {isDataLoading ? (
         // Reuse skeleton from above
         <div className="border rounded-lg">
            {/* ... skeleton table ... */}
             <div className="flex items-center justify-center p-6 text-muted-foreground">
               <LoadingSpinner size={24} className="mr-2" />
               Loading users...
            </div>
         </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Hash className="inline-block h-4 w-4 mr-1 relative -top-px" /> USN</TableHead>
                <TableHead><Users className="inline-block h-4 w-4 mr-1 relative -top-px" /> Role</TableHead>
                <TableHead><BookCopy className="inline-block h-4 w-4 mr-1 relative -top-px" /> Semester</TableHead>
                <TableHead className="text-right">Set Admin</TableHead>
                {/* Actions Header */}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Filtered users already have uppercase USNs */}
              {filteredUsers.map((targetUser) => (
                <TableRow key={targetUser.usn} className={deletingUser === targetUser.usn || removingSemester === targetUser.usn ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{targetUser.usn}</TableCell>
                  <TableCell>{targetUser.role.charAt(0).toUpperCase() + targetUser.role.slice(1)}</TableCell>
                  {/* Display semester N/A if null */}
                  <TableCell>{targetUser.semester === null ? 'N/A' : targetUser.semester}</TableCell>
                  <TableCell className="text-right">
                     <div className="flex items-center justify-end space-x-2">
                       {updatingUsers[targetUser.usn] && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        <Switch
                            id={`admin-switch-${targetUser.usn}`}
                            checked={targetUser.role === 'admin'}
                            onCheckedChange={(checked) =>
                              handleRoleChange(targetUser, checked ? 'admin' : 'student')
                            }
                            // Admin cannot change own role. Disable if data loading, user updating, promoting, or deleting/removing semester.
                            disabled={loading || !!updatingUsers[targetUser.usn] || isPromoting || user.usn === targetUser.usn || !!deletingUser || !!removingSemester}
                            aria-label={`Set ${targetUser.usn} as admin`}
                         />
                         <Label htmlFor={`admin-switch-${targetUser.usn}`} className="sr-only">
                            Set {targetUser.usn} as Admin
                         </Label>
                      </div>
                  </TableCell>
                   {/* Actions Cell */}
                  <TableCell className="text-right space-x-1">
                      {/* Remove Semester Button (Master Admin only, for other Admins with semester) */}
                      {isMasterAdmin && targetUser.role === 'admin' && targetUser.usn !== MASTER_ADMIN_USN && targetUser.semester !== null && (
                         <AlertDialog>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                   <AlertDialogTrigger asChild>
                                      <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-orange-500/80 hover:text-orange-600 dark:text-orange-400/80 dark:hover:text-orange-500"
                                          disabled={isPromoting || !!deletingUser || loading || !!updatingUsers[targetUser.usn] || !!removingSemester}
                                       >
                                          {removingSemester === targetUser.usn ? <Loader2 className="h-4 w-4 animate-spin"/> : <XCircle className="h-4 w-4" />}
                                      </Button>
                                   </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                    <p>Remove Semester (Teacher)</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                             <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Remove Semester for Admin {targetUser.usn}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action sets the semester for admin <span className="font-semibold">{targetUser.usn}</span> to N/A. This is typically used for teachers or admins not associated with a specific student semester. Are you sure?
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={removingSemester === targetUser.usn}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => handleRemoveSemester(targetUser.usn)}
                                        disabled={removingSemester === targetUser.usn}
                                        className="bg-orange-500 text-white hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700"
                                    >
                                        {removingSemester === targetUser.usn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Yes, Remove Semester
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                             </AlertDialogContent>
                         </AlertDialog>
                      )}

                      {/* Delete User Button (Master Admin only, not for self) */}
                      {isMasterAdmin && targetUser.usn !== MASTER_ADMIN_USN && (
                        <AlertDialog>
                          <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                   <AlertDialogTrigger asChild>
                                      <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-destructive/80 hover:text-destructive"
                                          disabled={isPromoting || !!deletingUser || loading || !!updatingUsers[targetUser.usn] || !!removingSemester} // Disable if any operation is in progress
                                       >
                                          {deletingUser === targetUser.usn ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                                      </Button>
                                   </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="left">
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

                       {/* Placeholder for master admin row or non-master admin view */}
                      {targetUser.usn === MASTER_ADMIN_USN && (
                          <TooltipProvider>
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <span className="inline-block h-8 w-8 pt-1.5 text-center text-muted-foreground">
                                          <UserX className="h-4 w-4 inline-block"/>
                                      </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="left">
                                      <p>Master admin cannot be modified here.</p>
                                  </TooltipContent>
                              </Tooltip>
                          </TooltipProvider>
                      )}

                      {/* Render nothing in actions for non-master admin viewing other users if no specific action is available */}
                       {!isMasterAdmin && targetUser.usn !== MASTER_ADMIN_USN && (
                          <span className="inline-block h-8 w-8"></span> // Placeholder to maintain alignment
                       )}
                  </TableCell>

                </TableRow>
              ))}
            </TableBody>
          </Table>
           {filteredUsers.length === 0 && !isDataLoading && (
              <div className="flex flex-col items-center justify-center p-10 text-center">
                 <UserSearch className="h-12 w-12 text-muted-foreground mb-4" />
                 <p className="text-lg font-medium text-muted-foreground">No users found</p>
                  <p className="text-sm text-muted-foreground">
                     No users match the current search and filter criteria.
                  </p>
              </div>
           )}
        </div>
      )}
    </div>
  );
}
