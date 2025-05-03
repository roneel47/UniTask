
"use client";

import { useContext } from 'react';
import { AuthContext } from '@/components/auth/auth-provider';

// Define the master admin USN (must be uppercase) - duplicated here for easy access if needed, though ideally defined centrally
const MASTER_ADMIN_USN = 'RONEEL1244';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  // Ensure all functions are returned, including task-related ones and updated register signature
  const {
    user,
    loading,
    login,
    logout,
    register, // Now expects (usn, semester, password)
    updateUserRole,
    getAllUsers,
    // promoteSemesters, // Removed global promote
    promoteSpecificSemester, // Include specific promote
    deleteUser, // Include deleteUser
    tasks,
    tasksLoading,
    updateTask,
    addTask,
    addMultipleTasks,
    deleteTask,
  } = context;

  // Add a helper to check if the current user is the master admin
  const isMasterAdmin = user?.usn === MASTER_ADMIN_USN;

  return {
    user,
    loading,
    login,
    logout,
    register,
    updateUserRole,
    getAllUsers,
    promoteSpecificSemester, // Return specific promote
    deleteUser, // Return deleteUser
    tasks,
    tasksLoading,
    updateTask,
    addTask,
    addMultipleTasks,
    deleteTask,
    isMasterAdmin, // Return master admin status
  };
};
