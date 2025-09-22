"use client";

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { User } from '@/lib/firestore';
import Link from 'next/link';
import { ArrowLeft, Shield, AlertCircle } from 'lucide-react';

interface RoleGuardProps {
  children: ReactNode;
  requiredRole?: User['role'];
  requiredRoles?: User['role'][];
  fallbackPath?: string;
  showAccessDenied?: boolean;
}

export const RoleGuard = ({ 
  children, 
  requiredRole, 
  requiredRoles,
  fallbackPath = '/dashboard',
  showAccessDenied = true 
}: RoleGuardProps) => {
  const { userRole, loading, isAdmin, isDesigner, isClient } = useRoleAccess();
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            background: 'var(--primary-light-bg)', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 16px',
            animation: 'pulse 2s infinite'
          }}>
            <Shield size={24} color="var(--primary)" />
          </div>
          <p style={{ fontSize: '18px', color: 'var(--text)', margin: 0 }}>Checking permissions...</p>
        </div>
      </div>
    );
  }

  const hasAccess = () => {
    // If requiredRoles is provided, check if user has any of those roles
    if (requiredRoles && requiredRoles.length > 0) {
      return requiredRoles.some(role => {
        switch (role) {
          case 'ADMIN':
            return isAdmin();
          case 'DESIGNER':
            return isDesigner();
          case 'CLIENT':
            return isClient();
          default:
            return false;
        }
      });
    }
    
    // If requiredRole is provided, check that specific role
    if (requiredRole) {
      switch (requiredRole) {
        case 'ADMIN':
          return isAdmin();
        case 'DESIGNER':
          return isDesigner();
        case 'CLIENT':
          return isClient();
        default:
          return false;
      }
    }
    
    return false;
  };

  if (!hasAccess()) {
    if (!showAccessDenied) {
      router.push(fallbackPath);
      return null;
    }

    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <div style={{ 
            width: '72px', 
            height: '72px', 
            background: 'var(--error-light-bg)', 
            borderRadius: '20px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 24px' 
          }}>
            <AlertCircle size={36} color="var(--error)" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '12px' }}>
            Access Denied
          </h1>
          <p style={{ fontSize: '16px', color: 'var(--text-light)', marginBottom: '32px' }}>
            You don't have permission to access this page. 
            {userRole && (
              <span style={{ display: 'block', marginTop: '8px', fontSize: '14px' }}>
                Your role: <strong>{userRole.role}</strong>
              </span>
            )}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link href={fallbackPath} className="btn-primary">
              <ArrowLeft size={16} />
              Go Back
            </Link>
            <Link href="/" className="btn-outline">
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
