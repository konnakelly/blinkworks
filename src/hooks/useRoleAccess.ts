"use client";

import { useEffect, useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { getUserByEmail, getUserById, createUser, User } from '@/lib/firestore';

export const useRoleAccess = () => {
  const { user: authUser, loading: authLoading } = useAuthContext();
  const [userRole, setUserRole] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!authUser) {
        setUserRole(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // First try to get user by UID (more reliable)
        let user = await getUserById(authUser.uid);
        
        // If not found by UID, try by email
        if (!user) {
          user = await getUserByEmail(authUser.email!);
        }
        
        // If still not found, create a default user with CLIENT role
        if (!user) {
          console.log('User not found in Firestore, creating default user...');
          const defaultUser = {
            id: authUser.uid,
            email: authUser.email!,
            name: authUser.displayName || 'User',
            role: 'CLIENT' as const,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          // Create user in Firestore
          await createUser(defaultUser);
          setUserRole(defaultUser);
        } else {
          setUserRole(user);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching user role:', err);
        setError('Failed to load user permissions');
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [authUser]);

  const hasRole = (requiredRole: User['role']): boolean => {
    if (!userRole || !userRole.isActive) return false;
    return userRole.role === requiredRole;
  };

  const hasAnyRole = (roles: User['role'][]): boolean => {
    if (!userRole || !userRole.isActive) return false;
    return roles.includes(userRole.role);
  };

  const isAdmin = (): boolean => hasRole('ADMIN');
  const isDesigner = (): boolean => hasRole('DESIGNER');
  const isClient = (): boolean => hasRole('CLIENT');
  const isDesignerOrAdmin = (): boolean => hasAnyRole(['DESIGNER', 'ADMIN']);

  return {
    userRole,
    loading: authLoading || loading,
    error,
    hasRole,
    hasAnyRole,
    isAdmin,
    isDesigner,
    isClient,
    isDesignerOrAdmin
  };
};
