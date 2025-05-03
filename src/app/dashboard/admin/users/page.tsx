
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
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export default function ManageUsersPage() {
  const { user, loading, logout, getAllUsers, updateUserRole } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [updatingUsers, setUpdatingUsers] = useState<Record<string, boolean>>({}); // Track loading state per user
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]); // Re-fetch if user changes (though unlikely in this context)

  const fetchUsers = async () => {
      setIsDataLoading(true);
      setError(null);
      try {
        const userList = await getAllUsers();
        setUsers(userList);
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
      // Update local state immediately for responsiveness
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.usn === targetUser.usn ? { ...u, role: newRole } : u
        )
      );
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
       // Revert visual state on error
       setUsers(prevUsers =>
         prevUsers.map(u =>
           u.usn === targetUser.usn ? { ...u, role: targetUser.role } : u // Revert to original role
         )
       );
    } finally {
      setUpdatingUsers(prev => ({ ...prev, [targetUser.usn]: false }));
    }
  };

  if (loading || !user) {
    // Show loading skeleton or redirect handled by useEffect
     return (
       <div className="container mx-auto p-4 pt-8">
         <Skeleton className="h-8 w-48 mb-6 bg-muted" />
         <div className="border rounded-lg">
           <Table>
             <TableHeader>
                <TableRow>
                    <TableHead><Skeleton className="h-5 w-32 bg-muted" /></TableHead>
                    <TableHead><Skeleton className="h-5 w-24 bg-muted" /></TableHead>
                    <TableHead className="text-right"><Skeleton className="h-5 w-40 bg-muted ml-auto" /></TableHead>
                </TableRow>
             </TableHeader>
             <TableBody>
                {[...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-32 bg-muted" /></TableCell>
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
      <h1 className="text-2xl font-semibold text-primary mb-6">Manage Users</h1>

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
                    <TableHead><Skeleton className="h-5 w-24 bg-muted" /></TableHead>
                    <TableHead className="text-right"><Skeleton className="h-5 w-40 bg-muted ml-auto" /></TableHead>
                </TableRow>
             </TableHeader>
             <TableBody>
                {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-32 bg-muted" /></TableCell>
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
                <TableHead>Current Role</TableHead>
                <TableHead className="text-right">Set as Admin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((targetUser) => (
                <TableRow key={targetUser.usn}>
                  <TableCell className="font-medium">{targetUser.usn}</TableCell>
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
                            disabled={loading || updatingUsers[targetUser.usn] || user.usn === targetUser.usn} // Disable self-change
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
           {users.length === 0 && !isDataLoading && (
              <p className="p-4 text-center text-muted-foreground">No users found.</p>
           )}
        </div>
      )}
    </div>
  );
}
