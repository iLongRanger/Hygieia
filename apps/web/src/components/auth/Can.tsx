import React from 'react';
import { useAuthStore } from '../../stores/authStore';

interface CanProps {
  permission: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

interface CanAnyProps {
  permissions: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({ permission, fallback = null, children }) => {
  const hasPermission = useAuthStore((state) => state.hasPermission);

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export const CanAny: React.FC<CanAnyProps> = ({ permissions, fallback = null, children }) => {
  const canAny = useAuthStore((state) => state.canAny);

  if (!canAny(permissions)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default Can;
