import api from './api';
import { canUserAnyPermission, hasUserPermission } from './permissions';

interface StoredUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  permissions?: Record<string, boolean>;
}

// Verify token is valid by calling /auth/me
export async function verifyToken(): Promise<boolean> {
  try {
    await api.get('/auth/me');
    return true;
  } catch {
    return false;
  }
}

// Check if user is authenticated (from storage)
export function isAuthenticated(): boolean {
  try {
    const stored = localStorage.getItem('auth-storage');
    if (!stored) return false;
    const parsed = JSON.parse(stored);
    return !!parsed?.state?.token && !!parsed?.state?.isAuthenticated;
  } catch {
    return false;
  }
}

// Get current user from storage
export function getCurrentUser(): StoredUser | null {
  try {
    const stored = localStorage.getItem('auth-storage');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.state?.user || null;
  } catch {
    return null;
  }
}

// Check if current user has a permission
export function hasPermission(permission: string): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  return hasUserPermission(permission, user);
}

// Check if current user has any of the provided permissions
export function canAnyPermission(permissions: string[]): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  return canUserAnyPermission(permissions, user);
}
