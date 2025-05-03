
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
import { useAuth } from '@/hooks/use-auth';
import { LogOut, User as UserIcon, Users, ChevronsUpDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme/theme-toggle'; // Import ThemeToggle

export function Header() {
  const { user, loading, logout } = useAuth();
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
            {/* Replace with the new custom SVG icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5" // Slightly adjusted stroke width for the new icon style
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7 text-primary" // Use primary color, increased size slightly
            >
              {/* Book Outline */}
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v15H6.5A2.5 2.5 0 0 1 4 14.5V4.5A2.5 2.5 0 0 1 6.5 2z" />
              {/* Left Page Content */}
              <rect x="6" y="5" width="2" height="2" rx="0.5" fill="#FFD700" stroke="none"/> {/* Yellow square */}
              <path d="m8 9 1 1 2-2" stroke="#32CD32" strokeWidth="2"/> {/* Green check 1 */}
              <path d="m8 12 1 1 2-2" stroke="#32CD32" strokeWidth="2"/> {/* Green check 2 */}
              <path d="m8 15 1 1 2-2" stroke="#32CD32" strokeWidth="2"/> {/* Green check 3 */}
              <line x1="12" y1="6" x2="10" y2="6" stroke="currentColor" />
              <line x1="12" y1="9" x2="10" y2="9" stroke="currentColor" />
              <line x1="12" y1="12" x2="10" y2="12" stroke="currentColor" />
              <line x1="12" y1="15" x2="10" y2="15" stroke="currentColor" />

              {/* Right Page Content */}
              {/* Graduation Cap */}
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" stroke="currentColor"/>
              <path d="M6 12v5c3 3 12 3 15 0v-5" stroke="currentColor"/>
              {/* ID Card */}
              <rect x="14" y="13" width="6" height="4" rx="1" stroke="currentColor"/>
              <circle cx="16" cy="15" r="0.5" fill="currentColor" stroke="currentColor"/>
              <line x1="18" y1="14.5" x2="19" y2="14.5" stroke="currentColor" />
              <line x1="18" y1="15.5" x2="19" y2="15.5" stroke="currentColor" />
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
                            ? `Administrator${user.semester !== null ? ` - Sem ${user.semester}` : ''}`
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
