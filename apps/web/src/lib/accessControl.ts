export type UserRole = 'owner' | 'admin' | 'manager' | 'cleaner';

const RESTRICTED_ROUTE_ROLES: Record<string, UserRole[]> = {
  '/area-templates': ['owner', 'admin', 'manager'],
  '/settings/global': ['owner', 'admin'],
  '/settings/proposal-templates': ['owner', 'admin', 'manager'],
  '/users': ['owner', 'admin'],
  '/users/:id': ['owner', 'admin'],
};

export function getRequiredRoles(routePath: string): UserRole[] | undefined {
  return RESTRICTED_ROUTE_ROLES[routePath];
}

export function isUserRole(role: string): role is UserRole {
  return ['owner', 'admin', 'manager', 'cleaner'].includes(role);
}

export function canAccessRoute(routePath: string, role?: string | null): boolean {
  const requiredRoles = getRequiredRoles(routePath);
  if (!requiredRoles) {
    return true;
  }

  if (!role || !isUserRole(role)) {
    return false;
  }

  return requiredRoles.includes(role);
}
