
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
            {/* Updated SVG icon based on the provided image */}
             <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 60 50" // Adjusted viewBox for better aspect ratio
                fill="none"
                className="h-8 w-8" // Slightly larger for visibility
             >
                {/* Book Outline - Use primary theme color */}
                <path
                   d="M7 44C7 41.7909 8.79086 40 11 40H50.5V45C50.5 47.2091 48.7091 49 46.5 49H11C8.79086 49 7 47.2091 7 45V44Z"
                   fill="hsl(var(--primary))"
                />
                <path
                   fillRule="evenodd"
                   clipRule="evenodd"
                   d="M53 5C53 2.79086 51.2091 1 49 1H11C8.79086 1 7 2.79086 7 5V40H53V5ZM11 3C9.89543 3 9 3.89543 9 5V38H51V5C51 3.89543 50.1046 3 49 3H11Z"
                   fill="hsl(var(--primary))"
                />

                {/* Left Page Content */}
                {/* Yellow Square */}
                <rect x="13" y="8" width="6" height="6" rx="1" fill="hsl(var(--chart-5))" /> {/* Using a chart color for yellow */}
                {/* Green Checks */}
                <path d="M14 21L17 24L22 19" stroke="hsl(var(--chart-2))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /> {/* Using a chart color for green */}
                <path d="M14 28L17 31L22 26" stroke="hsl(var(--chart-2))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 35L17 38L22 33" stroke="hsl(var(--chart-2))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {/* Blue Lines - Use primary theme color */}
                <rect x="25" y="9" width="8" height="3" rx="1.5" fill="hsl(var(--primary))" />
                <rect x="25" y="21" width="8" height="3" rx="1.5" fill="hsl(var(--primary))" />
                <rect x="25" y="28" width="8" height="3" rx="1.5" fill="hsl(var(--primary))" />
                <rect x="25" y="35" width="8" height="3" rx="1.5" fill="hsl(var(--primary))" />


                {/* Right Page Content - Use primary theme color */}
                {/* Graduation Cap */}
                <path d="M37 16L45 12L53 16L45 20L37 16Z" fill="hsl(var(--primary))" />
                <path d="M39 17.5V23C41.5 24.5 48.5 24.5 51 23V17.5" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                 {/* Tassel */}
                 <line x1="53" y1="16" x2="54" y2="20" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round"/>


                {/* ID Card */}
                <rect x="37" y="27" width="16" height="10" rx="2" fill="hsl(var(--primary))" />
                 {/* Headshot circle - fill with background, stroke with primary */}
                 <circle cx="41.5" cy="32" r="2" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="1" />
                 {/* Lines on ID - stroke with background */}
                 <line x1="45.5" y1="30.5" x2="50.5" y2="30.5" stroke="hsl(var(--background))" strokeWidth="1.5" strokeLinecap="round"/>
                 <line x1="45.5" y1="33.5" x2="49.5" y2="33.5" stroke="hsl(var(--background))" strokeWidth="1.5" strokeLinecap="round"/>

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
