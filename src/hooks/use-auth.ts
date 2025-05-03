
"use client";

import { useContext } from 'react';
import { AuthContext } from '@/components/auth/auth-provider';

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
    promoteSemesters, // Include promoteSemesters
    tasks,
    tasksLoading,
    updateTask,
    addTask,
    addMultipleTasks,
    deleteTask,
  } = context;

  return {
    user,
    loading,
    login,
    logout,
    register,
    updateUserRole,
    getAllUsers,
    promoteSemesters, // Return promoteSemesters
    tasks,
    tasksLoading,
    updateTask,
    addTask,
    addMultipleTasks,
    deleteTask,
  };
};
