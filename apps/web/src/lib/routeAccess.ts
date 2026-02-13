import {
  PERMISSIONS,
  type Permission,
  type PermissionSubject,
  canUserAllPermissions,
} from './permissions';

export interface RouteAccessConfig {
  path: string;
  requiredPermissions?: Permission[];
}

export const ROUTE_ACCESS_CONFIG: RouteAccessConfig[] = [
  {
    path: '/area-templates',
    requiredPermissions: [PERMISSIONS.AREA_TEMPLATES_READ_BY_TYPE],
  },
  {
    path: '/settings/global',
    requiredPermissions: [PERMISSIONS.SETTINGS_WRITE],
  },
  {
    path: '/settings/proposal-templates',
    requiredPermissions: [PERMISSIONS.PROPOSAL_TEMPLATES_READ],
  },
  {
    path: '/users',
    requiredPermissions: [PERMISSIONS.USERS_READ],
  },
  {
    path: '/users/:id',
    requiredPermissions: [PERMISSIONS.USERS_READ],
  },
];

const routeAccessMap = new Map<string, RouteAccessConfig>(
  ROUTE_ACCESS_CONFIG.map((config) => [config.path, config])
);

export function getRouteAccess(routePath: string): RouteAccessConfig | undefined {
  return routeAccessMap.get(routePath);
}

export function getRequiredPermissions(routePath: string): Permission[] | undefined {
  return getRouteAccess(routePath)?.requiredPermissions;
}

export function canAccessRoute(routePath: string, subject?: PermissionSubject | null): boolean {
  const requiredPermissions = getRequiredPermissions(routePath);
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }

  return canUserAllPermissions(requiredPermissions, subject);
}
