"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
// import { Skeleton } from '@/components/ui/skeleton'; // Keep if needed elsewhere, but replaced here
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FullPageLoader } from '@/components/layout/full-page-loader'; // Import the new loader

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not logged in, redirect to login
        router.replace('/login');
      } else if (user.role !== 'admin') {
        // Logged in but not an admin, redirect to their dashboard
        router.replace('/dashboard');
         // Optionally show a toast or message here
      }
    }
  }, [user, loading, router]);

  if (loading || !user) {
    // Still loading or user not yet available
    // Use the FullPageLoader
    return <FullPageLoader message="Verifying admin access..." />;
  }

  if (user.role !== 'admin') {
      // User is loaded but not an admin (redirect is in progress)
      // Show an access denied message while redirecting
       return (
          <div className="container mx-auto p-4 pt-8 flex justify-center">
             <Alert variant="destructive" className="max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Access Denied</AlertTitle>
                <AlertDescription>
                   You do not have permission to access this page. Redirecting...
                </AlertDescription>
             </Alert>
          </div>
       );
  }

  // User is an admin, render the admin-specific children
  return <>{children}</>;
}
