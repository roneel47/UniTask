"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
// import { Skeleton } from '@/components/ui/skeleton'; // Keep if needed elsewhere, but replaced here
import { FullPageLoader } from '@/components/layout/full-page-loader'; // Import the new loader

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  // Show a loading state while checking authentication
  if (loading || user === undefined) {
    // Use the FullPageLoader
    return <FullPageLoader message="Checking authentication..." />;
  }

  // This part should ideally not be reached as the redirect happens,
  // but it's good practice to have a fallback.
  return null;
}
