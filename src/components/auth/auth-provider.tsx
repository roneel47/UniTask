"use client";

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User } from '@/types/user';
import { Task, TaskStatus } from '@/types/task'; // Import Task types

// Define the shape of the authentication context
interface AuthContextType {
  user: User | null;
  loading: boolean;
  tasks: Task[]; // Add tasks state
  tasksLoading: boolean; // Add loading state for tasks
  login: (usn: string, password?: string) => Promise<void>;
  logout: () => void;
  register: (usn: string, password?: string) => Promise<void>;
  updateUserRole: (usn: string, role: 'student' | 'admin') => Promise<void>;
  getAllUsers: () => Promise<User[]>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>; // Function to update a task
  addTask: (newTask: Task) => Promise<void>; // Function to add a task
  addMultipleTasks: (newTasks: Task[]) => Promise<void>; // Function to add multiple tasks
  deleteTask: (taskId: string) => Promise<void>; // Function to delete a task (admin only)
}

// Create the context with a default value
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Initial Mock Data (only used if localStorage is empty)
const initialMockUsers: User[] = [
  { usn: '1RG22CS001', role: 'admin', password: 'adminpassword' },
  { usn: 'TEACHER001', role: 'admin', password: 'adminpassword' },
  ...Array.from({ length: 5 }, (_, i) => ({
    usn: `1RG22CS${String(i + 2).padStart(3, '0')}`,
    role: 'student' as 'student',
    password: 'studentpassword',
  })),
];

const initialMockTasks: Task[] = [
 { id: '1-1RG22CS001', title: 'Complete Project Proposal', description: 'Finalize and submit the project proposal document.', dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), status: TaskStatus.ToBeStarted, assignedBy: 'Prof. Smith', usn: '1RG22CS001' },
  { id: '2-1RG22CS001', title: 'Study for Midterm Exam', description: 'Review chapters 1-5 for the upcoming exam.', dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), status: TaskStatus.InProgress, assignedBy: 'Prof. Doe', usn: '1RG22CS001' },
  { id: '3-1RG22CS001', title: 'Lab Assignment 3', description: 'Implement the algorithm described in the lab manual.', dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), status: TaskStatus.Completed, assignedBy: 'TA Jane', usn: '1RG22CS001' },
   { id: '4-1RG22CS001', title: 'Prepare Presentation', description: 'Create slides for the group presentation.', dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), status: TaskStatus.Submitted, assignedBy: 'Prof. Doe', usn: '1RG22CS001', submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
   { id: '5-1RG22CS001', title: 'Read Research Paper', description: 'Analyze the assigned research paper.', dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), status: TaskStatus.Done, assignedBy: 'Prof. Smith', usn: '1RG22CS001', completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
   { id: '6-1RG22CS002', title: 'Code Review Session', description: 'Participate in the peer code review.', dueDate: new Date(Date.now() + 3 * 60 * 60 * 1000), status: TaskStatus.ToBeStarted, assignedBy: 'TA Jane', usn: '1RG22CS002' }, // Different USN
   // Add a task for another student
   { id: '7-1RG22CS003', title: 'Essay Draft 1', description: 'Write the first draft of the literature essay.', dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), status: TaskStatus.ToBeStarted, assignedBy: 'Prof. Smith', usn: '1RG22CS003' },
];


export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Auth loading
  const [mockUsers, setMockUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]); // Tasks state
  const [tasksLoading, setTasksLoading] = useState(true); // Tasks loading


    // --- Date Handling for Storage ---
    // Dates are not directly JSON serializable, convert to ISO strings for storage
    const serializeTasks = (tasksToSerialize: Task[]): string => {
        return JSON.stringify(tasksToSerialize.map(task => ({
        ...task,
        dueDate: task.dueDate.toISOString(),
        submittedAt: task.submittedAt?.toISOString(),
        completedAt: task.completedAt?.toISOString(),
        })));
    };

    const deserializeTasks = (tasksString: string | null): Task[] => {
        if (!tasksString) return [];
        try {
        const parsedTasks = JSON.parse(tasksString);
        return parsedTasks.map((task: any) => ({
            ...task,
            // Ensure dates are parsed back correctly
            dueDate: new Date(task.dueDate),
            submittedAt: task.submittedAt ? new Date(task.submittedAt) : undefined,
            completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
        }));
        } catch (error) {
        console.error("Failed to parse tasks from storage:", error);
        return []; // Return empty array or default if parsing fails
        }
    };


  // Load initial data and check session on mount
  useEffect(() => {
    const loadInitialData = () => {
      setLoading(true);
      setTasksLoading(true);
      try {
        // Load users
        const storedMockUsers = localStorage.getItem('uniTaskMockUsers');
        if (storedMockUsers) {
          setMockUsers(JSON.parse(storedMockUsers));
        } else {
          setMockUsers(initialMockUsers);
          localStorage.setItem('uniTaskMockUsers', JSON.stringify(initialMockUsers));
        }

        // Load tasks
        const storedTasks = localStorage.getItem('uniTaskTasks');
        const loadedTasks = deserializeTasks(storedTasks);
        if (loadedTasks.length > 0) {
             setTasks(loadedTasks);
        } else {
            // Initialize with default mock tasks if storage is empty/invalid
             setTasks(initialMockTasks);
             localStorage.setItem('uniTaskTasks', serializeTasks(initialMockTasks));
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
        localStorage.removeItem('uniTaskTasks');
        setMockUsers(initialMockUsers); // Reset to initial state
        setTasks(initialMockTasks); // Reset tasks
      } finally {
        setLoading(false);
        setTasksLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Helper function to save mock users to localStorage
  const saveMockUsers = useCallback((updatedUsers: User[]) => {
    setMockUsers(updatedUsers);
    localStorage.setItem('uniTaskMockUsers', JSON.stringify(updatedUsers));
  }, []);

    // Helper function to save tasks to localStorage
  const saveTasks = useCallback((updatedTasks: Task[]) => {
    setTasks(updatedTasks);
    localStorage.setItem('uniTaskTasks', serializeTasks(updatedTasks));
  }, []);


  const login = async (usn: string, password?: string): Promise<void> => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

    const foundUser = mockUsers.find(u => u.usn.toUpperCase() === usn.toUpperCase());

    if (!foundUser) {
      setLoading(false);
      throw new Error("USN not found.");
    }

    // Simplified password check for demo
    if (foundUser.password === password) {
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
      role: 'student',
      password: password,
    };

    const updatedUsers = [...mockUsers, newUser];
    saveMockUsers(updatedUsers);

    setLoading(false);
  };


  const updateUserRole = async (usn: string, role: 'student' | 'admin'): Promise<void> => {
    if (user?.role !== 'admin') {
        throw new Error("Permission denied. Only administrators can change user roles.");
    }
     if (user?.usn.toUpperCase() === usn.toUpperCase()) {
       throw new Error("Administrators cannot change their own role.");
     }

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300));

    const userIndex = mockUsers.findIndex(u => u.usn.toUpperCase() === usn.toUpperCase());

    if (userIndex === -1) {
      setLoading(false);
      throw new Error("User not found.");
    }

    const updatedUsers = [...mockUsers];
    updatedUsers[userIndex] = { ...updatedUsers[userIndex], role: role };

    saveMockUsers(updatedUsers);

    if (user && user.usn.toUpperCase() === usn.toUpperCase()) {
        const { password: _, ...userToStore } = updatedUsers[userIndex];
        setUser(userToStore);
        localStorage.setItem('uniTaskUser', JSON.stringify(userToStore));
    }


    setLoading(false);
  };

  const getAllUsers = async (): Promise<User[]> => {
    if (user?.role !== 'admin') {
        throw new Error("Permission denied. Only administrators can view user list.");
    }
     await new Promise(resolve => setTimeout(resolve, 300));
     return mockUsers.map(({ password, ...userWithoutPassword }) => userWithoutPassword);
  }

  const logout = () => {
    setLoading(true);
    setUser(null);
    localStorage.removeItem('uniTaskUser'); // Clear persisted user
    // Do NOT clear tasks or users on logout
    setTimeout(() => setLoading(false), 300);
  };

   // --- Task Management Functions ---

   const updateTask = async (taskId: string, updates: Partial<Task>): Promise<void> => {
    setTasksLoading(true);
    await new Promise(resolve => setTimeout(resolve, 150)); // Short delay for update simulation

    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      setTasksLoading(false);
      throw new Error("Task not found.");
    }

    const updatedTasks = [...tasks];
    updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], ...updates };

    // Add timestamp logic based on status change if needed
    if (updates.status) {
        if (updates.status === TaskStatus.Submitted && !updatedTasks[taskIndex].submittedAt) {
            updatedTasks[taskIndex].submittedAt = new Date();
        }
        if (updates.status === TaskStatus.Done && !updatedTasks[taskIndex].completedAt) {
            updatedTasks[taskIndex].completedAt = new Date();
        }
        // Clear timestamps if moving back from Submitted/Done (less common but possible)
         if (updates.status !== TaskStatus.Submitted && updates.status !== TaskStatus.Done) {
            updatedTasks[taskIndex].submittedAt = undefined;
        }
        if (updates.status !== TaskStatus.Done) {
             updatedTasks[taskIndex].completedAt = undefined;
        }
    }


    saveTasks(updatedTasks);
    setTasksLoading(false);
  };

  const addTask = async (newTask: Task): Promise<void> => {
      if (user?.role !== 'admin') {
          throw new Error("Permission denied. Only administrators can create tasks.");
      }
      setTasksLoading(true);
      await new Promise(resolve => setTimeout(resolve, 200)); // Simulate creation delay

      // Basic validation: check if ID already exists
      if (tasks.some(task => task.id === newTask.id)) {
          console.warn(`Task with ID ${newTask.id} already exists. Skipping.`);
          setTasksLoading(false);
          // Optionally throw an error or handle differently
          return;
      }

      const updatedTasks = [...tasks, newTask];
      saveTasks(updatedTasks);
      setTasksLoading(false);
  }

   const addMultipleTasks = async (newTasks: Task[]): Promise<void> => {
      if (user?.role !== 'admin') {
          throw new Error("Permission denied. Only administrators can create tasks.");
      }
      if (newTasks.length === 0) return;

      setTasksLoading(true);
      await new Promise(resolve => setTimeout(resolve, 200 + newTasks.length * 10)); // Slightly longer delay for multiple

       // Filter out duplicates based on ID before adding
      const existingIds = new Set(tasks.map(t => t.id));
      const uniqueNewTasks = newTasks.filter(nt => !existingIds.has(nt.id));

      if (uniqueNewTasks.length !== newTasks.length) {
          console.warn("Some tasks were duplicates and skipped.");
      }

      if (uniqueNewTasks.length > 0) {
          const updatedTasks = [...tasks, ...uniqueNewTasks];
          saveTasks(updatedTasks);
      }

      setTasksLoading(false);
  };


  const deleteTask = async (taskId: string): Promise<void> => {
     if (user?.role !== 'admin') {
          throw new Error("Permission denied. Only administrators can delete tasks.");
      }
      setTasksLoading(true);
      await new Promise(resolve => setTimeout(resolve, 200)); // Simulate deletion delay

      const updatedTasks = tasks.filter(task => task.id !== taskId);
       if (updatedTasks.length === tasks.length) {
         console.warn(`Task with ID ${taskId} not found for deletion.`);
       }

      saveTasks(updatedTasks);
      setTasksLoading(false);
  }


  // Provide tasks and related functions in the context
  const value = {
    user,
    loading,
    tasks,
    tasksLoading,
    login,
    logout,
    register,
    updateUserRole,
    getAllUsers,
    updateTask,
    addTask,
    addMultipleTasks,
    deleteTask,
   };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
