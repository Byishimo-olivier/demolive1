import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type RoleGuardProps = {
  children: React.ReactNode;
  permissions: string[];
  requireAll?: boolean; // If true, requires all permissions; if false (default), requires any permission
  fallback?: React.ReactNode;
};

export function RoleGuard({ 
  children, 
  permissions,
  requireAll = false,
  fallback 
}: RoleGuardProps) {
  const { user, can } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Check permissions based on requireAll flag
  const hasAccess = requireAll 
    ? permissions.every(permission => can(permission))
    : permissions.some(permission => can(permission));

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">
            You don't have permission to access this content.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
