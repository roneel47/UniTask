'use client';

import { LoadingSpinner } from './loading-spinner';

interface FullPageLoaderProps {
  message?: string;
}

export function FullPageLoader({ message = "Loading..." }: FullPageLoaderProps) {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center bg-background"> {/* Adjust height */}
      <div className="flex flex-col items-center space-y-4">
        <LoadingSpinner size={48} />
        <p className="text-lg font-medium text-muted-foreground animate-pulse">{message}</p>
      </div>
    </div>
  );
}
