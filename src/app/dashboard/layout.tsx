"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
// import { Skeleton } from '@/components/ui/skeleton'; // Keep if needed elsewhere, but replaced here
import { FullPageLoader } from '@/components/layout/full-page-loader'; // Import the new loader

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    // Use the FullPageLoader for a more engaging loading state
    return <FullPageLoader message="Loading dashboard..." />;
  }

  // Render children if user is authenticated
  return <>{children}</>;
}
