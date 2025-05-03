
"use client";

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User } from '@/types/user';
import { Task, TaskStatus } from '@/types/task'; // Import Task types

// Define the master admin USN (must be uppercase)
const MASTER_ADMIN_USN = 'RONEEL1244';

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
  // promoteSemesters: () => Promise<{ promotedCount: number; maxSemesterCount: number }>; // Removed global promote
  promoteSpecificSemester: (semesterToPromote: number) => Promise<{ promotedCount: number; maxSemesterCount: number }>; // Added specific promote
  deleteUser: (usnToDelete: string) => Promise<void>; // Added delete user
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
// Only one admin initially
const initialMockUsers: User[] = [
  // Ensure the master admin USN is uppercase here
  { usn: MASTER_ADMIN_USN, role: 'admin', semester: 0, password: 'pass@000' }, // Single admin
];

// Initial Mock Tasks (kept for demonstration, adjust as needed if no students exist initially)
const initialMockTasks: Task[] = [];


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
             // Ensure USNs in tasks are uppercase
            usn: task.usn?.toUpperCase() ?? '',
            assignedBy: task.assignedBy?.toUpperCase() ?? '',
        }));
        } catch (error) {
        console.error("Failed to parse tasks from storage:", error);
        return []; // Return empty array or default if parsing fails
        }
    };

     const serializeUsers = (usersToSerialize: User[]): string => {
        // Remove password before saving
        // Ensure USN is uppercase before serializing
        return JSON.stringify(usersToSerialize.map(({ password, ...user }) => ({
            ...user,
            usn: user.usn.toUpperCase(), // Ensure USN is uppercase
        })));
     };

      const deserializeUsers = (usersString: string | null): User[] => {
        if (!usersString) return [];
        try {
            return JSON.parse(usersString).map((user: any) => ({
                ...user,
                usn: user.usn.toUpperCase(), // Ensure USN is uppercase on deserialization too
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
            // Ensure initial mock USNs are uppercase
            const uppercaseInitialUsers = initialMockUsers.map(u => ({...u, usn: u.usn.toUpperCase()}));
            setMockUsers(uppercaseInitialUsers); // State now has users with passwords
            localStorage.setItem('uniTaskMockUsers', serializeUsers(uppercaseInitialUsers)); // Save without passwords
        } else {
            // Merge stored users (no passwords) with initial mock (has passwords)
            // to retain passwords for login simulation without storing them plain
             const usersWithPasswords = loadedUsers.map(loadedUser => {
                 // Ensure initial mock USNs are uppercase for comparison
                 const uppercaseInitialUsers = initialMockUsers.map(u => ({...u, usn: u.usn.toUpperCase()}));
                 const initialUser = uppercaseInitialUsers.find(u => u.usn === loadedUser.usn); // Compare uppercase USNs
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
           // Ensure semester is correctly loaded and USN is uppercase for the session user
          setUser({
              ...parsedUser,
              usn: parsedUser.usn.toUpperCase(),
              semester: typeof parsedUser.semester === 'number' ? parsedUser.semester : 0,
          });
        }
      } catch (error) {
        console.error("Failed to load data from storage:", error);
        // Clear potentially corrupted storage
        localStorage.removeItem('uniTaskUser');
        localStorage.removeItem('uniTaskMockUsers');
        localStorage.removeItem('uniTaskTasks');
         // Ensure initial mock USNs are uppercase
        const uppercaseInitialUsers = initialMockUsers.map(u => ({...u, usn: u.usn.toUpperCase()}));
        setMockUsers(uppercaseInitialUsers); // Reset to initial state (with passwords)
        localStorage.setItem('uniTaskMockUsers', serializeUsers(uppercaseInitialUsers)); // Save without passwords
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
    // Ensure USN is uppercase before saving state and local storage
    const uppercaseUsers = updatedUsers.map(u => ({...u, usn: u.usn.toUpperCase()}));
    setMockUsers(uppercaseUsers); // Keep passwords in runtime state
    localStorage.setItem('uniTaskMockUsers', serializeUsers(uppercaseUsers)); // Save without passwords
  }, []);

    // Helper function to save tasks to localStorage
  const saveTasks = useCallback((updatedTasks: Task[]) => {
     // Ensure USN in tasks is uppercase before saving
    const uppercaseTasks = updatedTasks.map(t => ({...t, usn: t.usn.toUpperCase(), assignedBy: t.assignedBy.toUpperCase() }));
    setTasks(uppercaseTasks);
    localStorage.setItem('uniTaskTasks', serializeTasks(uppercaseTasks));
  }, []);


  const login = async (usnInput: string, password?: string): Promise<void> => {
    const usn = usnInput.toUpperCase(); // Ensure USN is uppercase
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

    const foundUser = mockUsers.find(u => u.usn === usn); // Already uppercase in mockUsers

    if (!foundUser) {
      setLoading(false);
      throw new Error("USN not found.");
    }

    // Simplified password check for demo (checking against runtime state which has passwords)
    // Allow login without password if none is set (useful for initial setup/testing)
    if (!foundUser.password || foundUser.password === password) {
      const { password: _, ...userToStore } = foundUser;
      setUser(userToStore); // Update runtime user state (USN already uppercase)
      localStorage.setItem('uniTaskUser', JSON.stringify(userToStore)); // Save user session (without password)
      setLoading(false);
    } else {
      setLoading(false);
      throw new Error("Invalid USN or password.");
    }
  };

  const register = async (usnInput: string, semester: number, password?: string): Promise<void> => {
    const usn = usnInput.toUpperCase(); // Ensure USN is uppercase
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    const existingUser = mockUsers.find(u => u.usn === usn); // Compare with uppercase USNs
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
      usn: usn, // Already uppercase
      role: 'student',
      semester: semester, // Assign semester
      password: password, // Store password in runtime state for login check
    };

    const updatedUsers = [...mockUsers, newUser];
    saveMockUsers(updatedUsers); // Saves to state (with pw) and localStorage (without pw), handles uppercase

    setLoading(false);
  };


  const updateUserRole = async (usnInput: string, role: 'student' | 'admin'): Promise<void> => {
    const usn = usnInput.toUpperCase(); // Ensure USN is uppercase
    if (user?.role !== 'admin') {
        throw new Error("Permission denied. Only administrators can change user roles.");
    }
     if (user?.usn === usn) { // Compare uppercase USNs
       throw new Error("Administrators cannot change their own role.");
     }

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300));

    const userIndex = mockUsers.findIndex(u => u.usn === usn); // Find using uppercase USN

    if (userIndex === -1) {
      setLoading(false);
      throw new Error("User not found.");
    }

    const updatedUsers = [...mockUsers];
    // Also ensure semester is preserved (or potentially allow admin to change it too?)
    updatedUsers[userIndex] = { ...updatedUsers[userIndex], role: role };

    saveMockUsers(updatedUsers); // Handles uppercase

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
     // Return users without passwords from the runtime state (already uppercase)
     return mockUsers.map(({ password, ...userWithoutPassword }) => userWithoutPassword);
  }

   const promoteSpecificSemester = async (semesterToPromote: number): Promise<{ promotedCount: number; maxSemesterCount: number }> => {
    if (user?.role !== 'admin') {
      throw new Error("Permission denied. Only administrators can promote semesters.");
    }
    if (semesterToPromote < 1 || semesterToPromote > 7) {
        throw new Error("Invalid semester selected for promotion. Only semesters 1 through 7 can be promoted.");
    }

    setLoading(true); // Consider a specific loading state for promotion if needed
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay

    let promotedCount = 0;
    let maxSemesterCount = 0; // Tracks how many were *already* in semester 8 (or the target sem + 1)

    const updatedUsers = mockUsers.map(u => {
      // Only promote students in the SPECIFIC semester being targeted
      if (u.role === 'student' && u.semester === semesterToPromote) {
         // Always increment if the target semester is < 8
          promotedCount++;
          return { ...u, semester: u.semester + 1 };
      }
      // Count students already in the next semester or max semester (8)
      if (u.role === 'student' && (u.semester === semesterToPromote + 1 || u.semester === 8)) {
         maxSemesterCount++;
      }
      return u; // Keep other users unchanged
    });

    saveMockUsers(updatedUsers); // Save the updated user list (handles uppercase)

     // If the current logged-in user is a student *in the promoted semester*, update their session
    if (user && user.role === 'student' && user.semester === semesterToPromote) {
        const updatedLoggedInUser = updatedUsers.find(u => u.usn === user.usn); // Find using uppercase USN
        if (updatedLoggedInUser) {
            const { password: _, ...userToStore } = updatedLoggedInUser;
            setUser(userToStore); // Update runtime user state (USN already uppercase)
            localStorage.setItem('uniTaskUser', JSON.stringify(userToStore)); // Update session storage
        }
    }

    setLoading(false); // Reset general loading or specific promotion loading state
    return { promotedCount, maxSemesterCount };
  };

  const deleteUser = async (usnToDeleteInput: string): Promise<void> => {
      const usnToDelete = usnToDeleteInput.toUpperCase();
      // Only the MASTER admin can delete users
      if (user?.usn !== MASTER_ADMIN_USN) {
          throw new Error("Permission denied. Only the master administrator can delete users.");
      }
      // Prevent master admin from deleting themselves
      if (usnToDelete === MASTER_ADMIN_USN) {
          throw new Error("The master administrator account cannot be deleted.");
      }

      setLoading(true); // Or a specific deleting state
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay

      const userIndex = mockUsers.findIndex(u => u.usn === usnToDelete);

      if (userIndex === -1) {
          setLoading(false);
          throw new Error("User not found.");
      }

      const updatedUsers = mockUsers.filter(u => u.usn !== usnToDelete);
      saveMockUsers(updatedUsers);

       // Also delete tasks associated with the user
       const updatedTasks = tasks.filter(task => task.usn !== usnToDelete);
       saveTasks(updatedTasks);


      setLoading(false); // Reset loading state
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
    // Ensure updated USN is uppercase if provided
    const updatedUsn = updates.usn ? updates.usn.toUpperCase() : updatedTasks[taskIndex].usn;
    // Ensure assignedBy is uppercase if provided
    const updatedAssignedBy = updates.assignedBy ? updates.assignedBy.toUpperCase() : updatedTasks[taskIndex].assignedBy;


    updatedTasks[taskIndex] = {
        ...updatedTasks[taskIndex],
        ...updates,
        usn: updatedUsn, // Ensure USN is uppercase
        assignedBy: updatedAssignedBy, // Ensure assignedBy is uppercase
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


    saveTasks(updatedTasks); // Handles uppercase for tasks
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

       // Ensure new task USN and assignedBy are uppercase
      const taskToAdd = {...newTask, usn: newTask.usn.toUpperCase(), assignedBy: newTask.assignedBy.toUpperCase()};

      // Basic validation: check if ID already exists
      if (tasks.some(task => task.id === taskToAdd.id)) {
          console.warn(`Task with ID ${taskToAdd.id} already exists. Skipping.`);
          setTasksLoading(false);
          // Optionally throw an error or handle differently
          return;
      }

      const updatedTasks = [...tasks, taskToAdd];
      saveTasks(updatedTasks); // Handles uppercase
      setTasksLoading(false);
  }

   const addMultipleTasks = async (newTasks: Task[]): Promise<void> => {
      if (user?.role !== 'admin') {
          throw new Error("Permission denied. Only administrators can create tasks.");
      }
      if (newTasks.length === 0) return;

       // Ensure all new tasks have uppercase USNs and assignedBy, and valid semesters
       const tasksToAdd: Task[] = [];
       for (const task of newTasks) {
           if (typeof task.semester !== 'number' || task.semester < 1 || task.semester > 8) {
               throw new Error(`Invalid or missing semester for task "${task.title}".`);
           }
           tasksToAdd.push({...task, usn: task.usn.toUpperCase(), assignedBy: task.assignedBy.toUpperCase()});
       }


      setTasksLoading(true);
      await new Promise(resolve => setTimeout(resolve, 200 + tasksToAdd.length * 10)); // Slightly longer delay for multiple

       // Filter out duplicates based on ID before adding
      const existingIds = new Set(tasks.map(t => t.id));
      const uniqueNewTasks = tasksToAdd.filter(nt => !existingIds.has(nt.id));

      if (uniqueNewTasks.length !== tasksToAdd.length) {
          console.warn("Some tasks were duplicates and skipped.");
      }

      if (uniqueNewTasks.length > 0) {
          const updatedTasks = [...tasks, ...uniqueNewTasks];
          saveTasks(updatedTasks); // Handles uppercase
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

      saveTasks(updatedTasks); // Handles uppercase
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
    // promoteSemesters, // Removed global promote
    promoteSpecificSemester, // Expose specific promote
    deleteUser, // Expose delete user
    updateTask,
    addTask,
    addMultipleTasks,
    deleteTask,
   };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
