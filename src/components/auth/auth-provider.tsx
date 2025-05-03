"use client";

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types/user'; // Assuming User type is defined

// Define the shape of the authentication context
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (usn: string, password?: string) => Promise<void>; // Password optional for now
  logout: () => void;
}

// Create the context with a default value
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Mock user data store (replace with actual backend call)
// In a real app, this data would come from your database.
// Shared password for admins for now as requested.
const ADMIN_PASSWORD = "adminpassword";
const STUDENT_PASSWORD = "studentpassword"; // Default password for students

const mockUsers: User[] = [
  // Admins (using shared password)
  { usn: '1RG22CS001', role: 'admin' }, // Assuming first student is admin/CR
  { usn: 'TEACHER001', role: 'admin' }, // Example teacher admin

  // Students (using default password) - generating a few examples
  ...Array.from({ length: 5 }, (_, i) => ({ // Generate 5 students
    usn: `1RG22CS${String(i + 2).padStart(3, '0')}`, // Start from 002
    role: 'student' as 'student',
  })),
    // Add more students up to 1rg22cs098 if needed for testing
];


export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for persisted user session on initial load (e.g., from localStorage or a session cookie)
    const checkSession = () => {
      setLoading(true);
      try {
        const storedUser = localStorage.getItem('uniTaskUser');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error("Failed to load user from storage:", error);
        localStorage.removeItem('uniTaskUser'); // Clear invalid storage item
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = async (usn: string, password?: string): Promise<void> => {
    setLoading(true);
    // Simulate backend authentication
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

    const foundUser = mockUsers.find(u => u.usn.toUpperCase() === usn.toUpperCase());

    if (!foundUser) {
      setLoading(false);
      throw new Error("USN not found.");
    }

    // Check password based on role
    let isAuthenticated = false;
    if (foundUser.role === 'admin') {
        // For now, allow login if password matches the shared admin password OR is empty (for easy testing)
      isAuthenticated = password === ADMIN_PASSWORD || password === undefined || password === '';
    } else {
       // For now, allow login if password matches the shared student password OR is empty
      isAuthenticated = password === STUDENT_PASSWORD || password === undefined || password === '';
    }


    if (isAuthenticated) {
      setUser(foundUser);
      localStorage.setItem('uniTaskUser', JSON.stringify(foundUser)); // Persist user
      setLoading(false);
    } else {
      setLoading(false);
      throw new Error("Invalid USN or password.");
    }
  };

  const logout = () => {
    setLoading(true);
    setUser(null);
    localStorage.removeItem('uniTaskUser'); // Clear persisted user
    // Simulate sign out delay if needed
    setTimeout(() => setLoading(false), 300);
     // Redirect handled in Header or specific pages
  };

  const value = { user, loading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
