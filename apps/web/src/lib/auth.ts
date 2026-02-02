import api from './api';

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
export function getCurrentUser(): { id: string; email: string; fullName: string; role: string } | null {
  try {
    const stored = localStorage.getItem('auth-storage');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.state?.user || null;
  } catch {
    return null;
  }
}

// Get current user's role
export function getUserRole(): string | null {
  const user = getCurrentUser();
  return user?.role || null;
}

// Check if user has required role
export function hasRole(requiredRoles: string[]): boolean {
  const role = getUserRole();
  if (!role) return false;
  return requiredRoles.includes(role);
}
