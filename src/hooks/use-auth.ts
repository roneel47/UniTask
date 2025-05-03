"use client";

import { useContext } from 'react';
import { AuthContext } from '@/components/auth/auth-provider';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  // Ensure all functions are returned, including task-related ones
  const {
    user,
    loading,
    login,
    logout,
    register,
    updateUserRole,
    getAllUsers,
    tasks, // Added
    tasksLoading, // Added
    updateTask, // Added
    addTask, // Added
    addMultipleTasks, // Added
    deleteTask, // Added
  } = context;

  return {
    user,
    loading,
    login,
    logout,
    register,
    updateUserRole,
    getAllUsers,
    tasks,
    tasksLoading,
    updateTask,
    addTask,
    addMultipleTasks,
    deleteTask,
  };
};
