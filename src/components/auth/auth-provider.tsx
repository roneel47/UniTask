
"use client";

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User } from '@/types/user';
import { Task, TaskStatus } from '@/types/task'; // Import Task types

// Define the master admin USN (must be uppercase) - NEW CREDENTIALS
const MASTER_ADMIN_USN = 'MASTERADMIN1'; // New Master Admin USN

// Simple password "hashing" simulation function
const hashPassword = (pw: string | undefined): string | undefined => pw ? pw + '_sim_hash' : undefined;

// Define the shape of the authentication context
interface AuthContextType {
  user: User | null;
  loading: boolean;
  tasks: Task[]; // Add tasks state
  tasksLoading: boolean; // Add loading state for tasks
  login: (usn: string, password?: string) => Promise<void>;
  logout: () => void;
  register: (usn: string, semester: number | null, password?: string) => Promise<void>; // Allow null semester
  updateUserRole: (usn: string, role: 'student' | 'admin') => Promise<void>;
  getAllUsers: () => Promise<User[]>;
  promoteSpecificSemester: (semesterToPromote: number) => Promise<{ promotedCount: number; maxSemesterCount: number }>; // Added specific promote
  deleteUser: (usnToDelete: string) => Promise<void>; // Added delete user
  removeAdminSemester: (usnToRemoveSemester: string) => Promise<void>; // Added remove semester for admin
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>; // Function to update a task
  addTask: (newTask: Task) => Promise<void>; // Function to add a task
  addMultipleTasks: (newTasks: Task[]) => Promise<void>; // Function to add multiple tasks
  deleteTask: (taskIdToDelete: string, deleteAllInstances?: boolean) => Promise<void>; // Modified to handle deleting all instances
  fetchTasks: () => Promise<void>; // Add explicit fetchTasks function
  isMasterAdmin: boolean; // Added master admin check
}

// Create the context with a default value
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Initial Mock Data (only used if localStorage is empty) - Use HASHED passwords
const initialMockUsers: User[] = [
  { usn: MASTER_ADMIN_USN, role: 'admin', semester: 0, password: hashPassword('MasterPass!456') }, // Use hashed password
];

// Initial Mock Tasks (kept for demonstration, adjust as needed if no students exist initially)
const initialMockTasks: Task[] = [];


export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Auth loading
  const [mockUsers, setMockUsers] = useState<User[]>([]); // Holds users WITH HASHED passwords in runtime state
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
        // assignedByName is already a string, no conversion needed
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
            // Ensure semester is a number or null, default to 0 if missing/invalid for non-null cases
             semester: typeof task.semester === 'number' ? task.semester : (task.semester === null ? null : 0),
            // Ensure USNs in tasks are uppercase
            usn: task.usn?.toUpperCase() ?? '',
            assignedBy: task.assignedBy?.toUpperCase() ?? '',
            assignedByName: task.assignedByName ?? '', // Deserialize assignedByName
        }));
        } catch (error) {
        console.error("Failed to parse tasks from storage:", error);
        return []; // Return empty array or default if parsing fails
        }
    };

      const deserializeUsers = (usersString: string | null): User[] => {
        if (!usersString) return [];
        try {
            // Read the password (which should be the hashed version)
            return JSON.parse(usersString).map((user: any) => ({
                ...user,
                usn: user.usn.toUpperCase(), // Ensure USN is uppercase on deserialization too
                // Ensure semester is number or null, default 0 for master admin if undefined/invalid
                 semester: user.usn === MASTER_ADMIN_USN ? 0 : (typeof user.semester === 'number' ? user.semester : (user.semester === null ? null : 0)),
                password: user.password, // Read the stored (hashed) password
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
      let usersFromStorage: User[] = [];
      const storedMockUsers = localStorage.getItem('uniTaskMockUsers');
      // Ensure the template uses the *hashed* password
      const masterAdminUserTemplate = {
        ...initialMockUsers.find(u => u.usn === MASTER_ADMIN_USN)!,
        password: hashPassword('MasterPass!456'), // Ensure the template in memory uses the correct *current* hashed password
        semester: 0, // Master admin always has semester 0
      };

      try {
        // 1. Load users from storage (these SHOULD have hashed passwords)
        usersFromStorage = deserializeUsers(storedMockUsers);

        // 2. Create a map of initial users (with hashed passwords) for easy lookup
        const initialUsersMap = new Map<string, User>(initialMockUsers.map(u => [u.usn, u]));

        // 3. Combine storage users with initial users, prioritizing stored data including stored (hashed) passwords
        const combinedUsersMap = new Map<string, User>();

        // Add users from storage first
        usersFromStorage.forEach(storedUser => {
             // Check if this user exists in initial data, mainly for the master admin
             const initialUserData = initialUsersMap.get(storedUser.usn);
             // Use the stored user data (including the hashed password from storage)
             combinedUsersMap.set(storedUser.usn, {
                 ...storedUser,
                 // If it's the master admin, overwrite with the template's correct details
                 password: storedUser.usn === MASTER_ADMIN_USN ? masterAdminUserTemplate.password : storedUser.password,
                 role: storedUser.usn === MASTER_ADMIN_USN ? 'admin' : storedUser.role,
                 semester: storedUser.usn === MASTER_ADMIN_USN ? 0 : storedUser.semester, // Ensure master admin sem is 0
             });
        });

         // Add any initial users that weren't in storage (like the master admin on first load)
         initialMockUsers.forEach(initialUser => {
             if (!combinedUsersMap.has(initialUser.usn)) {
                 // Ensure the correct hashed password is used if adding from initial template
                 const initialPassword = initialUser.usn === MASTER_ADMIN_USN ? masterAdminUserTemplate.password : initialUser.password;
                 combinedUsersMap.set(initialUser.usn, {
                    ...initialUser,
                    password: initialPassword, // Add with hashed password
                    semester: initialUser.usn === MASTER_ADMIN_USN ? 0 : initialUser.semester, // Ensure master admin sem is 0
                 });
             }
         });

        // Ensure the master admin is definitely in the map with the correct details from the template
        if (!combinedUsersMap.has(MASTER_ADMIN_USN)) {
            combinedUsersMap.set(MASTER_ADMIN_USN, masterAdminUserTemplate);
        } else {
            // Master admin was in the map, ensure its details are correct from the template
            const currentMasterAdminData = combinedUsersMap.get(MASTER_ADMIN_USN)!;
            combinedUsersMap.set(MASTER_ADMIN_USN, {
                ...currentMasterAdminData,
                password: masterAdminUserTemplate.password,
                role: 'admin',
                semester: 0,
            });
        }

        const finalUsersWithPasswords = Array.from(combinedUsersMap.values());

        // 4. Set runtime state with hashed passwords
        setMockUsers(finalUsersWithPasswords);
        // 5. Save to local storage *WITH* hashed passwords (this is crucial for login persistence)
        localStorage.setItem('uniTaskMockUsers', JSON.stringify(finalUsersWithPasswords));


        // Load tasks
        const storedTasks = localStorage.getItem('uniTaskTasks');
        const loadedTasks = deserializeTasks(storedTasks); // Deserializes assignedByName
        if (loadedTasks.length > 0) {
             setTasks(loadedTasks);
        } else {
            // Initialize with default mock tasks if storage is empty/invalid
             setTasks(initialMockTasks);
             localStorage.setItem('uniTaskTasks', serializeTasks(initialMockTasks)); // Serializes assignedByName
        }


        // Check for logged-in user session
        const storedUser = localStorage.getItem('uniTaskUser');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
           // Ensure semester is correctly loaded (number or null) and USN is uppercase for the session user
           // Session user doesn't need password stored
          setUser({
              ...parsedUser,
              usn: parsedUser.usn.toUpperCase(),
              semester: typeof parsedUser.semester === 'number' ? parsedUser.semester : (parsedUser.semester === null ? null : 0),
          });
        }
      } catch (error) {
        console.error("Failed to load data from storage:", error);
        // Clear potentially corrupted storage
        localStorage.removeItem('uniTaskUser');
        localStorage.removeItem('uniTaskMockUsers');
        localStorage.removeItem('uniTaskTasks');
        // Reset to include only the master admin with hashed password
        setMockUsers([masterAdminUserTemplate]); // Use template which includes hashed password
        localStorage.setItem('uniTaskMockUsers', JSON.stringify([masterAdminUserTemplate])); // Save WITH hashed password
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


  // Helper function to save mock users to localStorage (now includes hashed passwords)
  const saveMockUsers = useCallback((updatedUsers: User[]) => {
    // Ensure USN is uppercase and semester is handled correctly before saving state and local storage
    const processedUsers = updatedUsers.map(u => ({
        ...u,
        usn: u.usn.toUpperCase(),
         // Ensure semester is number or null, default 0 for master admin
        semester: u.usn === MASTER_ADMIN_USN ? 0 : (typeof u.semester === 'number' ? u.semester : (u.semester === null ? null : 0)),
    }));
    setMockUsers(processedUsers); // Keep hashed passwords in runtime state
    localStorage.setItem('uniTaskMockUsers', JSON.stringify(processedUsers)); // Save WITH hashed passwords
  }, []);

    // Helper function to save tasks to localStorage
  const saveTasks = useCallback((updatedTasks: Task[]) => {
     // Ensure USN in tasks is uppercase and semester is valid before saving
    const processedTasks = updatedTasks.map(t => ({
        ...t,
        usn: t.usn.toUpperCase(),
        assignedBy: t.assignedBy.toUpperCase(),
        semester: typeof t.semester === 'number' ? t.semester : (t.semester === null ? null : 0), // Handle null semester
        assignedByName: t.assignedByName ?? '', // Ensure assignedByName exists
    }));
    setTasks(processedTasks);
    localStorage.setItem('uniTaskTasks', serializeTasks(processedTasks)); // Serializes assignedByName
  }, []);


   const login = async (usnInput: string, passwordInput?: string): Promise<void> => {
    const usn = usnInput.toUpperCase(); // Ensure USN is uppercase
    setLoading(true);
    console.log(`Attempting login for USN: ${usn}`); // Debug log
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

    // --- Load latest users from storage *during* login attempt ---
    const storedUsersString = localStorage.getItem('uniTaskMockUsers');
    const currentMockUsers = deserializeUsers(storedUsersString || '[]');
    // ---

    const foundUser = currentMockUsers.find(u => u.usn === usn); // Compare against latest list

    console.log('Found user in latest mock data:', foundUser); // Debug log

    if (!foundUser) {
        console.error(`Login failed: USN ${usn} not found.`); // Debug log
        setLoading(false);
        throw new Error("USN not found.");
    }

    // Hash the provided password and compare with the stored hashed password
    const hashedInputPassword = hashPassword(passwordInput);
    const passwordMatch = foundUser.password === hashedInputPassword;

    console.log(`Password check for ${usn}: Stored Hash='${foundUser.password}', Input Hash='${hashedInputPassword}', Match=${passwordMatch}`); // Debug log


    if (passwordMatch) {
        console.log(`Login successful for ${usn}`); // Debug log
        const { password: _, ...userToStore } = foundUser; // Destructure to remove hashed password before storing in session/state
        setUser(userToStore); // Update runtime user state (USN & semester already handled)
        localStorage.setItem('uniTaskUser', JSON.stringify(userToStore)); // Save user session (without password)
        setLoading(false);
    } else {
        console.error(`Login failed for ${usn}: Invalid password.`); // Debug log
        setLoading(false);
        throw new Error("Invalid USN or password.");
    }
};


    const register = async (usnInput: string, semester: number | null, passwordInput?: string): Promise<void> => {
        const usn = usnInput.toUpperCase(); // Ensure USN is uppercase
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 500));

        // --- Load the *latest* user list from storage within the function ---
        const storedUsersString = localStorage.getItem('uniTaskMockUsers');
        const currentMockUsers = deserializeUsers(storedUsersString || '[]'); // Use deserialize to ensure correct format
        // ---

        const existingUser = currentMockUsers.find(u => u.usn === usn); // Compare with uppercase USNs from latest list
        if (existingUser) {
            setLoading(false);
            throw new Error("USN already registered.");
        }

        if (!passwordInput || passwordInput.length < 6) {
            setLoading(false);
            throw new Error("Password must be at least 6 characters long.");
        }

        // Allow null semester, but validate numbers are between 1 and 8
         if (semester !== null && (isNaN(semester) || semester < 1 || semester > 8)) {
            setLoading(false);
            throw new Error("Invalid semester. Must be between 1 and 8, or null.");
        }


        const newUser: User = {
            usn: usn, // Already uppercase
            role: 'student',
            semester: semester, // Assign semester (can be null)
            password: hashPassword(passwordInput), // Store HASHED password
        };

        const updatedUsers = [...currentMockUsers, newUser];
        saveMockUsers(updatedUsers); // Saves to state and localStorage (WITH hashed pw), handles uppercase & semester

        // --- Load the *latest* task list from storage within the function ---
        const storedTasksString = localStorage.getItem('uniTaskTasks');
        const currentTasks = deserializeTasks(storedTasksString || '[]'); // Use deserialize
        // ---

        // --- Retroactively assign existing 'all' tasks for the new user's semester ---
        const newTasksForUser: Task[] = [];
        // Find existing "template" tasks for the semester (assigned to 'all' concept)
        const tasksForSemester = currentTasks.filter(t => t.semester === newUser.semester);
        const uniqueTaskAssignments = new Map<string, Task>();

        tasksForSemester.forEach(task => {
            // Create a key based on title, description, assignedBy, semester (to identify the core assignment)
            const assignmentKey = `${task.title}-${task.description}-${task.assignedBy}-${task.semester}`;
            // Store only one instance of each unique assignment 'template'
            if (!uniqueTaskAssignments.has(assignmentKey)) {
                uniqueTaskAssignments.set(assignmentKey, task);
            }
        });

        uniqueTaskAssignments.forEach(templateTask => {
             // Check if this user already has this specific task (e.g., if registration somehow retried)
             const userAlreadyHasTask = currentTasks.some(t =>
                 t.usn === newUser.usn &&
                 t.title === templateTask.title &&
                 t.description === templateTask.description &&
                 t.assignedBy === templateTask.assignedBy &&
                 t.semester === templateTask.semester
             );

             if (!userAlreadyHasTask) {
                 const taskIdBase = String(Date.now()); // Simple unique ID base
                 newTasksForUser.push({
                     ...templateTask, // Copy details from the template task
                     id: `${taskIdBase}-${newUser.usn}-${templateTask.assignedBy}`, // Create a new unique ID for this user's instance
                     usn: newUser.usn, // Assign to the new user
                     status: TaskStatus.ToBeStarted, // Start in the initial state
                     submissionUrl: undefined, // Clear submission details
                     submittedAt: undefined,
                     completedAt: undefined,
                 });
             }
        });


       if (newTasksForUser.length > 0) {
           console.log(`Retroactively assigning ${newTasksForUser.length} tasks to new user ${newUser.usn}`);
           const updatedTasks = [...currentTasks, ...newTasksForUser];
           saveTasks(updatedTasks); // Save updated tasks list
       }
       // --- End of retroactive assignment ---

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
     // Prevent changing MASTER_ADMIN's role
     if (usn === MASTER_ADMIN_USN) {
         throw new Error("The master administrator's role cannot be changed.");
     }

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300));

    const userIndex = mockUsers.findIndex(u => u.usn === usn); // Find using uppercase USN

    if (userIndex === -1) {
      setLoading(false);
      throw new Error("User not found.");
    }

    const updatedUsers = [...mockUsers];
    // Preserve hashed password and semester when changing role initially
    updatedUsers[userIndex] = { ...updatedUsers[userIndex], role: role };

    // If becoming a student, ensure they have a valid semester (or null if allowed)
    // If becoming admin, semester might be removed later by master admin
    if (role === 'student' && (updatedUsers[userIndex].semester === undefined || (updatedUsers[userIndex].semester !== null && (updatedUsers[userIndex].semester! < 1 || updatedUsers[userIndex].semester! > 8)))) {
        // Assign a default semester (e.g., 1) or throw error if semester is strictly required
        // For now, let's allow null if it was null, otherwise default to 1 if invalid number
         updatedUsers[userIndex].semester = updatedUsers[userIndex].semester === null ? null : 1;
         // Or: throw new Error(`User ${usn} needs a valid semester (1-8) to become a student.`);
    }


    saveMockUsers(updatedUsers); // Handles uppercase, preserves hashed password, handles semester

    setLoading(false);
  };

  const removeAdminSemester = async (usnToRemoveSemesterInput: string): Promise<void> => {
      const usnToRemoveSemester = usnToRemoveSemesterInput.toUpperCase();
      // Only MASTER ADMIN can remove semester from OTHER admins
      if (user?.usn !== MASTER_ADMIN_USN) {
          throw new Error("Permission denied. Only the master administrator can remove semesters from admins.");
      }
      if (usnToRemoveSemester === MASTER_ADMIN_USN) {
          throw new Error("Master administrator cannot have their semester removed (it's always 0).");
      }
      if (user?.usn === usnToRemoveSemester) {
         throw new Error("Cannot remove semester from yourself.");
      }


      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 300));

      const userIndex = mockUsers.findIndex(u => u.usn === usnToRemoveSemester);

      if (userIndex === -1) {
        setLoading(false);
        throw new Error("User not found.");
      }

      if (mockUsers[userIndex].role !== 'admin') {
          setLoading(false);
          throw new Error("Can only remove semester from users with the 'admin' role.");
      }

      const updatedUsers = [...mockUsers];
      // Set semester to null for the target admin
      updatedUsers[userIndex] = { ...updatedUsers[userIndex], semester: null };

      saveMockUsers(updatedUsers); // Handles uppercase, saves null semester

      setLoading(false);
  };


  const getAllUsers = async (): Promise<User[]> => {
    // Allow any admin to view users
    if (user?.role !== 'admin') {
        throw new Error("Permission denied. Only administrators can view user list.");
    }
     await new Promise(resolve => setTimeout(resolve, 300));
     // --- Fetch latest from storage ---
     const storedUsersString = localStorage.getItem('uniTaskMockUsers');
     const currentMockUsers = deserializeUsers(storedUsersString || '[]');
     // ---
     // Return users without passwords from the latest list
     return currentMockUsers.map(({ password, ...userWithoutPassword }) => userWithoutPassword);
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

    saveMockUsers(updatedUsers); // Save the updated user list (handles uppercase, semester)

     // If the current logged-in user is a student *in the promoted semester*, update their session
    if (user && user.role === 'student' && user.semester === semesterToPromote) {
        const updatedLoggedInUser = updatedUsers.find(u => u.usn === user.usn); // Find using uppercase USN
        if (updatedLoggedInUser) {
            const { password: _, ...userToStore } = updatedLoggedInUser; // Remove hashed password for session
            setUser(userToStore); // Update runtime user state (USN & semester handled)
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
      saveMockUsers(updatedUsers); // Saves runtime state and localStorage (with hashed passwords, handled semesters)

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

   // Explicit function to re-fetch tasks from storage
   const fetchTasks = useCallback(async () => {
      setTasksLoading(true);
      await new Promise(resolve => setTimeout(resolve, 100)); // Short delay simulation
      try {
         const storedTasks = localStorage.getItem('uniTaskTasks');
         const loadedTasks = deserializeTasks(storedTasks); // Deserializes dates, USNs, semester, assignedByName
         setTasks(loadedTasks); // Update the state
      } catch (error) {
         console.error("Failed to re-fetch tasks from storage:", error);
         // Optionally set an error state or show a toast
      } finally {
         setTasksLoading(false);
      }
   }, []); // Dependency array is empty as it only reads from storage


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
    // Preserve assignedByName if not explicitly updated
    const updatedAssignedByName = updates.assignedByName ?? updatedTasks[taskIndex].assignedByName;


    updatedTasks[taskIndex] = {
        ...updatedTasks[taskIndex],
        ...updates,
        usn: updatedUsn, // Ensure USN is uppercase
        assignedBy: updatedAssignedBy, // Ensure assignedBy is uppercase
        assignedByName: updatedAssignedByName, // Include assignedByName
        // Preserve semester if not explicitly updated, handle null
        semester: updates.semester !== undefined ? updates.semester : currentSemester,
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


    saveTasks(updatedTasks); // Handles uppercase for tasks, semester validity, and assignedByName
    setTasksLoading(false);
  };

  const addTask = async (newTask: Task): Promise<void> => {
      if (user?.role !== 'admin') {
          throw new Error("Permission denied. Only administrators can create tasks.");
      }
      // Allow null semester, but validate numbers are between 1 and 8
       if (newTask.semester !== null && (typeof newTask.semester !== 'number' || newTask.semester < 1 || newTask.semester > 8)) {
            throw new Error("Invalid or missing semester for the new task.");
        }
       if (!newTask.assignedByName) { // Validate assignedByName
           throw new Error("Missing 'Assigned By Name' for the new task.");
       }
      setTasksLoading(true);
      await new Promise(resolve => setTimeout(resolve, 200)); // Simulate creation delay

       // Ensure new task USN and assignedBy are uppercase, semester is number or null
      const taskToAdd = {
        ...newTask,
        usn: newTask.usn.toUpperCase(),
        assignedBy: newTask.assignedBy.toUpperCase(),
        assignedByName: newTask.assignedByName, // Already validated
        semester: typeof newTask.semester === 'number' ? newTask.semester : (newTask.semester === null ? null : 0),
      };

      // Basic validation: check if ID already exists
      if (tasks.some(task => task.id === taskToAdd.id)) {
          console.warn(`Task with ID ${taskToAdd.id} already exists. Skipping.`);
          setTasksLoading(false);
          // Optionally throw an error or handle differently
          return;
      }

      const updatedTasks = [...tasks, taskToAdd];
      saveTasks(updatedTasks); // Handles uppercase, semester validity, and assignedByName
      setTasksLoading(false);
  }

   const addMultipleTasks = async (newTasks: Task[]): Promise<void> => {
      if (user?.role !== 'admin') {
          throw new Error("Permission denied. Only administrators can create tasks.");
      }
      if (newTasks.length === 0) return;

       // Ensure all new tasks have uppercase USNs and assignedBy, valid semesters, and assignedByName
       const tasksToAdd: Task[] = [];
       for (const task of newTasks) {
            if (task.semester !== null && (typeof task.semester !== 'number' || task.semester < 1 || task.semester > 8)) {
               throw new Error(`Invalid or missing semester for task "${task.title}". Must be 1-8 or null.`);
           }
            if (!task.assignedByName) { // Validate assignedByName for each task
                throw new Error(`Missing 'Assigned By Name' for task "${task.title}".`);
            }
           tasksToAdd.push({
            ...task,
            usn: task.usn.toUpperCase(),
            assignedBy: task.assignedBy.toUpperCase(),
            assignedByName: task.assignedByName, // Already validated
            semester: typeof task.semester === 'number' ? task.semester : (task.semester === null ? null : 0), // Ensure correct type
            });
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
          saveTasks(updatedTasks); // Handles uppercase, semester validity, and assignedByName
      }

      setTasksLoading(false);
  };


   const deleteTask = async (taskIdToDelete: string, deleteAllInstances: boolean = false): Promise<void> => {
       // Allow any admin to delete for now
       if (user?.role !== 'admin') {
           throw new Error("Permission denied. Only administrators can delete tasks.");
       }
       setTasksLoading(true);
       await new Promise(resolve => setTimeout(resolve, 200)); // Simulate deletion delay

       let updatedTasks = [...tasks];
       const taskToDelete = updatedTasks.find(t => t.id === taskIdToDelete);

       if (!taskToDelete) {
           console.warn(`Task with ID ${taskIdToDelete} not found for deletion.`);
           setTasksLoading(false);
           return; // Task doesn't exist
       }

        if (deleteAllInstances) {
            // Identify all instances of the same assignment (same title, description, assignedBy, semester)
            updatedTasks = updatedTasks.filter(task =>
                !(task.title === taskToDelete.title &&
                  task.description === taskToDelete.description &&
                  task.assignedBy === taskToDelete.assignedBy &&
                  task.semester === taskToDelete.semester)
            );
             console.log(`Deleting all instances of assignment: "${taskToDelete.title}"`);
        } else {
            // Delete only the specific task instance by its ID
            updatedTasks = updatedTasks.filter(task => task.id !== taskIdToDelete);
             console.log(`Deleting specific task instance: ID ${taskIdToDelete}`);
        }


       saveTasks(updatedTasks); // Handles uppercase & semester validity
       setTasksLoading(false);
   };

   // Add a helper to check if the current user is the master admin
  const isMasterAdmin = user?.usn === MASTER_ADMIN_USN;


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
    promoteSpecificSemester, // Expose specific promote
    deleteUser, // Expose delete user
    removeAdminSemester, // Expose remove semester for admin
    updateTask,
    addTask,
    addMultipleTasks,
    deleteTask,
    fetchTasks, // Expose fetchTasks
    isMasterAdmin, // Expose master admin check
   };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

    