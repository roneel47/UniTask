
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
  register: (usn: string, semester: number, password?: string) => Promise<void>; // Added semester
  updateUserRole: (usn: string, role: 'student' | 'admin') => Promise<void>;
  getAllUsers: () => Promise<User[]>;
  promoteSemesters: () => Promise<{ promotedCount: number; maxSemesterCount: number }>; // Function to promote semesters
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
  { usn: '1RG22CS001', role: 'admin', semester: 6, password: 'adminpassword' }, // Admin associated with a default semester
  { usn: 'TEACHER001', role: 'admin', semester: 0, password: 'adminpassword' }, // Another admin (can handle multiple sems)
  // Students in different semesters
  { usn: '1RG22CS002', role: 'student', semester: 6, password: 'studentpassword' },
  { usn: '1RG22CS003', role: 'student', semester: 6, password: 'studentpassword' },
  { usn: '1RG23CS050', role: 'student', semester: 4, password: 'studentpassword' },
  { usn: '1RG23CS051', role: 'student', semester: 4, password: 'studentpassword' },
  { usn: '1RG24CS100', role: 'student', semester: 2, password: 'studentpassword' },
  { usn: '1RG24CS101', role: 'student', semester: 2, password: 'studentpassword' },
  { usn: '1RG21CS200', role: 'student', semester: 8, password: 'studentpassword' },
];

const initialMockTasks: Task[] = [
 { id: '1-1RG22CS002', title: '6th Sem Project Proposal', description: 'Finalize and submit the project proposal document.', dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), status: TaskStatus.ToBeStarted, assignedBy: '1RG22CS001', usn: '1RG22CS002', semester: 6 },
  { id: '2-1RG22CS003', title: '6th Sem Study for Midterm', description: 'Review chapters 1-5 for the upcoming exam.', dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), status: TaskStatus.InProgress, assignedBy: '1RG22CS001', usn: '1RG22CS003', semester: 6 },
  { id: '3-1RG23CS050', title: '4th Sem Lab Assignment 3', description: 'Implement the algorithm described in the lab manual.', dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), status: TaskStatus.Completed, assignedBy: 'TEACHER001', usn: '1RG23CS050', semester: 4 },
   { id: '4-1RG23CS051', title: '4th Sem Prepare Presentation', description: 'Create slides for the group presentation.', dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), status: TaskStatus.Submitted, assignedBy: 'TEACHER001', usn: '1RG23CS051', semester: 4, submissionUrl: 'https://example.com/submissions/4-1RG23CS051/presentation.pptx', submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
   { id: '5-1RG24CS100', title: '2nd Sem Read Research Paper', description: 'Analyze the assigned research paper.', dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), status: TaskStatus.Done, assignedBy: 'TEACHER001', usn: '1RG24CS100', semester: 2, completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
   { id: '6-1RG21CS200', title: '8th Sem Code Review', description: 'Participate in the peer code review.', dueDate: new Date(Date.now() + 3 * 60 * 60 * 1000), status: TaskStatus.ToBeStarted, assignedBy: '1RG22CS001', usn: '1RG21CS200', semester: 8 },
   // Task assigned to 'all' students of a specific semester (example task, won't show on student board directly)
   // { id: 'all-sem6-task1', title: 'All 6th Sem: Ethics Quiz', description: 'Complete the online ethics quiz.', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), status: TaskStatus.ToBeStarted, assignedBy: '1RG22CS001', usn: 'all', semester: 6 },
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
             // Ensure semester is a number, default to 0 or handle appropriately if missing
            semester: typeof task.semester === 'number' ? task.semester : 0,
        }));
        } catch (error) {
        console.error("Failed to parse tasks from storage:", error);
        return []; // Return empty array or default if parsing fails
        }
    };

     const serializeUsers = (usersToSerialize: User[]): string => {
        // Remove password before saving
        return JSON.stringify(usersToSerialize.map(({ password, ...user }) => user));
     };

      const deserializeUsers = (usersString: string | null): User[] => {
        if (!usersString) return [];
        try {
            return JSON.parse(usersString).map((user: any) => ({
                ...user,
                // Ensure semester is number, default if missing/invalid
                semester: typeof user.semester === 'number' ? user.semester : 0,
                // Password is not stored/retrieved here for security simulation
            }));
        } catch (error) {
            console.error("Failed to parse users from storage:", error);
            return [];
        }
      };


    // --- Load initial data and check session on mount ---
  useEffect(() => {
    const loadInitialData = () => {
      setLoading(true);
      setTasksLoading(true);
      let loadedUsers: User[] = [];
      try {
        // Load users (without passwords initially)
        const storedMockUsers = localStorage.getItem('uniTaskMockUsers');
        loadedUsers = deserializeUsers(storedMockUsers);

        if (loadedUsers.length === 0) {
            // If storage empty, use initial mock (which includes passwords)
            setMockUsers(initialMockUsers); // State now has users with passwords
            localStorage.setItem('uniTaskMockUsers', serializeUsers(initialMockUsers)); // Save without passwords
        } else {
            // Merge stored users (no passwords) with initial mock (has passwords)
            // to retain passwords for login simulation without storing them plain
             const usersWithPasswords = loadedUsers.map(loadedUser => {
                 const initialUser = initialMockUsers.find(u => u.usn === loadedUser.usn);
                 return { ...loadedUser, password: initialUser?.password };
             });
            setMockUsers(usersWithPasswords);
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
          const parsedUser = JSON.parse(storedUser);
           // Ensure semester is correctly loaded for the session user
          setUser({
              ...parsedUser,
              semester: typeof parsedUser.semester === 'number' ? parsedUser.semester : 0,
          });
        }
      } catch (error) {
        console.error("Failed to load data from storage:", error);
        // Clear potentially corrupted storage
        localStorage.removeItem('uniTaskUser');
        localStorage.removeItem('uniTaskMockUsers');
        localStorage.removeItem('uniTaskTasks');
        setMockUsers(initialMockUsers); // Reset to initial state (with passwords)
        localStorage.setItem('uniTaskMockUsers', serializeUsers(initialMockUsers)); // Save without passwords
        setTasks(initialMockTasks); // Reset tasks
        localStorage.setItem('uniTaskTasks', serializeTasks(initialMockTasks));
      } finally {
        setLoading(false);
        setTasksLoading(false);
      }
    };
    loadInitialData();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper function to save mock users to localStorage (removes passwords)
  const saveMockUsers = useCallback((updatedUsers: User[]) => {
    setMockUsers(updatedUsers); // Keep passwords in runtime state
    localStorage.setItem('uniTaskMockUsers', serializeUsers(updatedUsers)); // Save without passwords
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

    // Simplified password check for demo (checking against runtime state which has passwords)
    // Allow login without password if none is set (useful for initial setup/testing)
    if (!foundUser.password || foundUser.password === password) {
      const { password: _, ...userToStore } = foundUser;
      setUser(userToStore); // Update runtime user state
      localStorage.setItem('uniTaskUser', JSON.stringify(userToStore)); // Save user session (without password)
      setLoading(false);
    } else {
      setLoading(false);
      throw new Error("Invalid USN or password.");
    }
  };

  const register = async (usn: string, semester: number, password?: string): Promise<void> => {
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

     if (semester < 1 || semester > 8) {
       setLoading(false);
       throw new Error("Invalid semester. Must be between 1 and 8.");
     }


    const newUser: User = {
      usn: usn.toUpperCase(),
      role: 'student',
      semester: semester, // Assign semester
      password: password, // Store password in runtime state for login check
    };

    const updatedUsers = [...mockUsers, newUser];
    saveMockUsers(updatedUsers); // Saves to state (with pw) and localStorage (without pw)

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
    // Also ensure semester is preserved (or potentially allow admin to change it too?)
    updatedUsers[userIndex] = { ...updatedUsers[userIndex], role: role };

    saveMockUsers(updatedUsers);

    // If the currently logged-in admin modifies *another* user who happens to be logged in elsewhere,
    // their session data won't update automatically here. This implementation only updates the modifier's session
    // if they were somehow changing their own role (which is prevented above).
    // For a real app, you'd need a mechanism (like WebSockets or periodic checks) to update other active sessions.

    setLoading(false);
  };

  const getAllUsers = async (): Promise<User[]> => {
    if (user?.role !== 'admin') {
        throw new Error("Permission denied. Only administrators can view user list.");
    }
     await new Promise(resolve => setTimeout(resolve, 300));
     // Return users without passwords from the runtime state
     return mockUsers.map(({ password, ...userWithoutPassword }) => userWithoutPassword);
  }

  const promoteSemesters = async (): Promise<{ promotedCount: number; maxSemesterCount: number }> => {
    if (user?.role !== 'admin') {
      throw new Error("Permission denied. Only administrators can promote semesters.");
    }

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay

    let promotedCount = 0;
    let maxSemesterCount = 0;

    const updatedUsers = mockUsers.map(u => {
      if (u.role === 'student' && u.semester < 8) {
        promotedCount++;
        return { ...u, semester: u.semester + 1 };
      } else if (u.role === 'student' && u.semester === 8) {
        maxSemesterCount++;
        return u; // Keep semester 8 students as they are
      }
      return u; // Keep admins and others unchanged
    });

    saveMockUsers(updatedUsers); // Save the updated user list

     // If the current logged-in user is a student who got promoted, update their session
    if (user && user.role === 'student' && user.semester < 8) {
        const updatedLoggedInUser = updatedUsers.find(u => u.usn === user.usn);
        if (updatedLoggedInUser) {
            const { password: _, ...userToStore } = updatedLoggedInUser;
            setUser(userToStore); // Update runtime user state
            localStorage.setItem('uniTaskUser', JSON.stringify(userToStore)); // Update session storage
        }
    }


    setLoading(false);
    return { promotedCount, maxSemesterCount };
  };


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
     // Ensure semester isn't accidentally overwritten if not included in updates
    const currentSemester = updatedTasks[taskIndex].semester;
    updatedTasks[taskIndex] = {
        ...updatedTasks[taskIndex],
        ...updates,
        semester: updates.semester ?? currentSemester, // Preserve semester if not explicitly updated
    };


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
       if (typeof newTask.semester !== 'number' || newTask.semester < 1 || newTask.semester > 8) {
            throw new Error("Invalid or missing semester for the new task.");
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

       // Validate all tasks have a valid semester
       for (const task of newTasks) {
           if (typeof task.semester !== 'number' || task.semester < 1 || task.semester > 8) {
               throw new Error(`Invalid or missing semester for task "${task.title}".`);
           }
       }

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
    promoteSemesters, // Expose the new function
    updateTask,
    addTask,
    addMultipleTasks,
    deleteTask,
   };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
