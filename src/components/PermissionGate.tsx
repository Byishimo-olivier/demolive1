import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface CanProps {
  // Accept a single permission string OR an array (any match = granted)
  permission: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

export function Can({
  permission,
  children,
  fallback,
  showFallback = false,
}: CanProps) {
  const { can } = useAuth();

  const hasPermission = Array.isArray(permission)
    ? permission.some((p) => can(p))   // OR logic — any permission grants access
    : can(permission);

  if (!hasPermission) {
    if (showFallback && fallback) {
      return <>{fallback}</>;
    }
    return null;
  }

  return <>{children}</>;
}
