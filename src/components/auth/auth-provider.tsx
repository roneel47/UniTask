
"use client";

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User } from '@/types/user';

// Define the shape of the authentication context
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (usn: string, password?: string) => Promise<void>;
  logout: () => void;
  register: (usn: string, password?: string) => Promise<void>; // Add register function
  updateUserRole: (usn: string, role: 'student' | 'admin') => Promise<void>; // Add role update function
  getAllUsers: () => Promise<User[]>; // Function for admin to get user list
}

// Create the context with a default value
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Mock user data store (replace with actual backend call)
// Make this stateful so registration and role changes persist within the session.
const initialMockUsers: User[] = [
  // Admins (using hardcoded password for demo)
  { usn: '1RG22CS001', role: 'admin', password: 'adminpassword' },
  { usn: 'TEACHER001', role: 'admin', password: 'adminpassword' },

  // Students (using hardcoded password for demo) - generating a few examples
  ...Array.from({ length: 5 }, (_, i) => ({
    usn: `1RG22CS${String(i + 2).padStart(3, '0')}`, // Start from 002
    role: 'student' as 'student',
    password: 'studentpassword',
  })),
];


export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mockUsers, setMockUsers] = useState<User[]>([]); // Use state for mock users

  // Load initial users and check session on mount
  useEffect(() => {
    const loadInitialData = () => {
      setLoading(true);
      try {
        // Load users from localStorage if available, otherwise use initial mocks
        const storedMockUsers = localStorage.getItem('uniTaskMockUsers');
        if (storedMockUsers) {
          setMockUsers(JSON.parse(storedMockUsers));
        } else {
          setMockUsers(initialMockUsers);
          localStorage.setItem('uniTaskMockUsers', JSON.stringify(initialMockUsers));
        }

        // Check for logged-in user session
        const storedUser = localStorage.getItem('uniTaskUser');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error("Failed to load data from storage:", error);
        // Clear potentially corrupted storage
        localStorage.removeItem('uniTaskUser');
        localStorage.removeItem('uniTaskMockUsers');
        setMockUsers(initialMockUsers); // Reset to initial state
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Helper function to save mock users to localStorage
  const saveMockUsers = useCallback((updatedUsers: User[]) => {
    setMockUsers(updatedUsers);
    localStorage.setItem('uniTaskMockUsers', JSON.stringify(updatedUsers));
  }, []);

  const login = async (usn: string, password?: string): Promise<void> => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

    const foundUser = mockUsers.find(u => u.usn.toUpperCase() === usn.toUpperCase());

    if (!foundUser) {
      setLoading(false);
      throw new Error("USN not found.");
    }

    // Simplified password check for demo - MUST match the stored password
    if (foundUser.password === password) {
       // Exclude password from the user object stored in state and localStorage
      const { password: _, ...userToStore } = foundUser;
      setUser(userToStore);
      localStorage.setItem('uniTaskUser', JSON.stringify(userToStore));
      setLoading(false);
    } else {
      setLoading(false);
      throw new Error("Invalid USN or password.");
    }
  };

  const register = async (usn: string, password?: string): Promise<void> => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    const existingUser = mockUsers.find(u => u.usn.toUpperCase() === usn.toUpperCase());
    if (existingUser) {
      setLoading(false);
      throw new Error("USN already registered.");
    }

    if (!password || password.length < 6) {
        setLoading(false);
        throw new Error("Password must be at least 6 characters long.");
    }

    const newUser: User = {
      usn: usn.toUpperCase(),
      role: 'student', // Default role is student
      password: password, // Store password (insecure, for demo only!)
    };

    const updatedUsers = [...mockUsers, newUser];
    saveMockUsers(updatedUsers); // Update state and localStorage

    setLoading(false);
    // Don't automatically log in the user after registration
  };


  const updateUserRole = async (usn: string, role: 'student' | 'admin'): Promise<void> => {
    // Ensure only admins can perform this action
    if (user?.role !== 'admin') {
        throw new Error("Permission denied. Only administrators can change user roles.");
    }
     if (user?.usn.toUpperCase() === usn.toUpperCase()) {
       throw new Error("Administrators cannot change their own role.");
     }

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay

    const userIndex = mockUsers.findIndex(u => u.usn.toUpperCase() === usn.toUpperCase());

    if (userIndex === -1) {
      setLoading(false);
      throw new Error("User not found.");
    }

    const updatedUsers = [...mockUsers];
    updatedUsers[userIndex] = { ...updatedUsers[userIndex], role: role };

    saveMockUsers(updatedUsers); // Update state and localStorage

    // If the updated user is the currently logged-in user, update their session info
    // Note: Admins cannot demote themselves with the check above.
    // This handles the case where another admin promotes the current user.
    if (user && user.usn.toUpperCase() === usn.toUpperCase()) {
        const { password: _, ...userToStore } = updatedUsers[userIndex];
        setUser(userToStore);
        localStorage.setItem('uniTaskUser', JSON.stringify(userToStore));
    }


    setLoading(false);
  };

  const getAllUsers = async (): Promise<User[]> => {
     // Ensure only admins can perform this action
    if (user?.role !== 'admin') {
        throw new Error("Permission denied. Only administrators can view user list.");
    }
     await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
     // Return users without their passwords
     return mockUsers.map(({ password, ...userWithoutPassword }) => userWithoutPassword);
  }

  const logout = () => {
    setLoading(true);
    setUser(null);
    localStorage.removeItem('uniTaskUser'); // Clear persisted user
    setTimeout(() => setLoading(false), 300);
  };

  const value = { user, loading, login, logout, register, updateUserRole, getAllUsers };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
