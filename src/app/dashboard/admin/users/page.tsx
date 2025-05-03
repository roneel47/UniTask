
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
import { AlertCircle, Loader2, Filter, BookCopy } from 'lucide-react'; // Added Filter, BookCopy
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Added Select


// Define semester options
const semesterOptions = ['all', ...Array.from({ length: 8 }, (_, i) => String(i + 1))];

export default function ManageUsersPage() {
  const { user, loading, logout, getAllUsers, updateUserRole } = useAuth();
  const router = useRouter();
  const [allUsers, setAllUsers] = useState<User[]>([]); // Store all fetched users
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]); // Users to display in the table
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [updatingUsers, setUpdatingUsers] = useState<Record<string, boolean>>({}); // Track loading state per user
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<string>('all'); // Default to 'all'


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
  }, [user]); // Re-fetch if user changes (though unlikely in this context)


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
        // Ensure users are sorted (e.g., by USN or semester) for consistent display
        userList.sort((a, b) => (a.semester - b.semester) || a.usn.localeCompare(b.usn));
        setAllUsers(userList); // Store all users
        // setFilteredUsers(userList); // Initial display (will be updated by useEffect)
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
      await updateUserRole(targetUser.usn, newRole);
      // Update local state immediately for responsiveness (both allUsers and filteredUsers)
       const updateList = (list: User[]) => list.map(u =>
            u.usn === targetUser.usn ? { ...u, role: newRole } : u
       );
      setAllUsers(prev => updateList(prev));
      // setFilteredUsers(prev => updateList(prev)); // This will be handled by the useEffect dependency on allUsers

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
       // setFilteredUsers(prev => revertList(prev)); // Handled by useEffect
    } finally {
      setUpdatingUsers(prev => ({ ...prev, [targetUser.usn]: false }));
    }
  };

  if (loading || !user) {
    // Show loading skeleton or redirect handled by useEffect
     return (
       <div className="container mx-auto p-4 pt-8">
         <Skeleton className="h-8 w-48 mb-6 bg-muted" />
          {/* Skeleton for filter */}
         <div className="mb-4 flex items-center gap-2">
            <Skeleton className="h-5 w-20 bg-muted" />
            <Skeleton className="h-10 w-32 bg-muted" />
         </div>
         <div className="border rounded-lg">
           <Table>
             <TableHeader>
                <TableRow>
                    <TableHead><Skeleton className="h-5 w-32 bg-muted" /></TableHead>
                    <TableHead><Skeleton className="h-5 w-16 bg-muted" /></TableHead> {/* Semester */}
                    <TableHead><Skeleton className="h-5 w-24 bg-muted" /></TableHead> {/* Role */}
                    <TableHead className="text-right"><Skeleton className="h-5 w-40 bg-muted ml-auto" /></TableHead>
                </TableRow>
             </TableHeader>
             <TableBody>
                {[...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-32 bg-muted" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16 bg-muted" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24 bg-muted" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-20 bg-muted ml-auto" /></TableCell>
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
          {/* Semester Filter */}
           <div className="flex items-center gap-2">
               <Label htmlFor="semester-filter" className="text-sm font-medium shrink-0">
                 <Filter className="inline-block h-4 w-4 mr-1 relative -top-px"/>
                 Filter by Semester:
               </Label>
               <Select
                 value={selectedSemesterFilter}
                 onValueChange={setSelectedSemesterFilter}
                 disabled={isDataLoading}
               >
                 <SelectTrigger id="semester-filter" className="w-full sm:w-[180px]">
                   <SelectValue placeholder="Select Semester" />
                 </SelectTrigger>
                 <SelectContent>
                   {semesterOptions.map(sem => (
                     <SelectItem key={sem} value={sem}>
                       {sem === 'all' ? 'All Semesters' : `Semester ${sem}`}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
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
                </TableRow>
             </TableHeader>
             <TableBody>
                {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-32 bg-muted" /></TableCell>
                         <TableCell><Skeleton className="h-5 w-16 bg-muted" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24 bg-muted" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-20 bg-muted ml-auto" /></TableCell>
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
                <TableHead>Current Role</TableHead>
                <TableHead className="text-right">Set as Admin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((targetUser) => (
                <TableRow key={targetUser.usn}>
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
                            // Admin cannot change own role. Also disable if data is loading or this user is being updated.
                            disabled={loading || updatingUsers[targetUser.usn] || user.usn === targetUser.usn}
                            aria-label={`Set ${targetUser.usn} as admin`}
                         />
                         <Label htmlFor={`admin-switch-${targetUser.usn}`} className="sr-only">
                            Set {targetUser.usn} as Admin
                         </Label>
                      </div>
                  </TableCell>
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
