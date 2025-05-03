
"use client";

import { useContext } from 'react';
import { AuthContext } from '@/components/auth/auth-provider';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  // Ensure all functions are returned
  const { user, loading, login, logout, register, updateUserRole, getAllUsers } = context;
  return { user, loading, login, logout, register, updateUserRole, getAllUsers };
};
