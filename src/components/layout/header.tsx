
"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth'; // Import useAuth
import { LogOut, User as UserIcon, Users, ChevronsUpDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme/theme-toggle'; // Import ThemeToggle

export function Header() {
  const { user, loading, logout, isMasterAdmin } = useAuth(); // Get isMasterAdmin from useAuth
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login'); // Redirect to login after logout
  };

  const getInitials = (usn: string) => {
    if (!usn) return 'U';
    // Ensure USN is uppercase before getting initials
    const upperUsn = usn.toUpperCase();
    // Attempt to get initials from potential name or default to USN chars
    return upperUsn.substring(0, 2).toUpperCase();
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            {/* Updated SVG icon based on the provided image and feedback */}
             <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 64 64" // Use a square viewBox for easier coordination
                fill="none"
                className="h-8 w-8"
             >
                 {/* Book Cover Outline - Primary Color Stroke */}
                 <path
                    d="M54 10C54 7.79086 52.2091 6 50 6H14C11.7908 6 10 7.79086 10 10V54C10 56.2091 11.7908 58 14 58H50C52.2091 58 54 56.2091 54 54V10Z"
                    stroke="hsl(var(--primary))"
                    strokeWidth="3"
                    rx="4" // Added rounded corners
                 />
                 {/* Spine - Slightly darker/lighter primary fill */}
                  <rect x="6" y="8" width="4" height="48" rx="2" fill="hsl(var(--primary))" opacity="0.7"/>

                 {/* Page Divider Line - Subtle primary color */}
                 <line x1="32" y1="6" x2="32" y2="58" stroke="hsl(var(--primary))" strokeWidth="1.5" opacity="0.4"/>


                {/* Left Page Content (Adjusted coordinates for 64x64 viewBox) */}
                {/* Yellow Square */}
                <rect x="15" y="12" width="8" height="8" rx="1.5" fill="hsl(var(--chart-5))" /> {/* Chart color 5 for yellow */}
                {/* Green Checks */}
                <path d="M16 28L19 31L24 26" stroke="hsl(var(--chart-2))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /> {/* Chart color 2 for green */}
                <path d="M16 38L19 41L24 36" stroke="hsl(var(--chart-2))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 48L19 51L24 46" stroke="hsl(var(--chart-2))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />


                {/* Right Page Content (Adjusted coordinates for 64x64 viewBox) */}
                 {/* Graduation Cap */}
                 <path d="M38 18L45 14L52 18L45 22L38 18Z" fill="hsl(var(--primary))" />
                 <path d="M40 20V25C42.5 26.5 47.5 26.5 50 25V20" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                 {/* Tassel */}
                 <line x1="52" y1="18" x2="53.5" y2="23" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round"/>


                {/* ID Card */}
                <rect x="37" y="35" width="16" height="10" rx="2" fill="hsl(var(--primary))" />
                 {/* Headshot circle - fill with background, stroke with primary */}
                 <circle cx="41" cy="40" r="2" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="1" />
                 {/* Lines on ID - stroke with background */}
                 <line x1="45" y1="38.5" x2="50" y2="38.5" stroke="hsl(var(--background))" strokeWidth="1.5" strokeLinecap="round"/>
                 <line x1="45" y1="41.5" x2="49" y2="41.5" stroke="hsl(var(--background))" strokeWidth="1.5" strokeLinecap="round"/>

             </svg>

            <span className="font-bold text-primary">UniTask</span>
          </Link>
          {/* Add navigation links here if needed */}
           {user && ( // Show dashboard link only when logged in
             <nav className="flex items-center space-x-4">
               <Link href="/dashboard" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                 Dashboard
               </Link>
              </nav>
           )}
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2"> {/* Reduced space for theme toggle */}
           <ThemeToggle /> {/* Add the ThemeToggle component */}
           <nav className="flex items-center space-x-1">
            {loading ? (
              <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 flex items-center justify-between space-x-2 px-2">
                    <Avatar className="h-7 w-7">
                       {/* Ensure USN used for avatar URL and alt is uppercase */}
                      <AvatarImage src={`https://avatar.vercel.sh/${user.usn.toUpperCase()}.png`} alt={user.usn.toUpperCase()} />
                       {/* Initials are already handled in getInitials */}
                      <AvatarFallback>{getInitials(user.usn)}</AvatarFallback>
                    </Avatar>
                    {/* Display USN in uppercase */}
                    <span className="hidden sm:inline-block text-sm font-medium">{user.usn.toUpperCase()}</span>
                    <ChevronsUpDown className="ml-1 h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                       {/* Display USN in uppercase */}
                      <p className="text-sm font-medium leading-none">{user.usn.toUpperCase()}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                         {/* Display N/A if semester is null */}
                         {user.role === 'admin'
                            ? `${isMasterAdmin ? 'Master Admin' : 'Admin'}${user.semester !== null ? ` - Sem ${user.semester}` : ''}` // Use isMasterAdmin here
                            : `Student - Sem ${user.semester === null ? 'N/A' : user.semester}`
                         }
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                   {/* Add Manage Users link for admins */}
                  {user.role === 'admin' && (
                    <DropdownMenuItem asChild>
                       <Link href="/dashboard/admin/users">
                          <Users className="mr-2 h-4 w-4" />
                          <span>Manage Users</span>
                       </Link>
                    </DropdownMenuItem>
                  )}
                  {/* <DropdownMenuItem>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem> */}
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm">
                <Link href="/login">Login</Link>
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
