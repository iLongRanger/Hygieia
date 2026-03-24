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
  {
    path: '/jobs',
    requiredPermissions: [PERMISSIONS.JOBS_READ],
  },
  {
    path: '/appointments',
    requiredPermissions: [PERMISSIONS.APPOINTMENTS_READ],
  },
  {
    path: '/appointments/:id',
    requiredPermissions: [PERMISSIONS.APPOINTMENTS_READ],
  },
  {
    path: '/inspections',
    requiredPermissions: [PERMISSIONS.INSPECTIONS_READ],
  },
  {
    path: '/inspections/new',
    requiredPermissions: [PERMISSIONS.INSPECTIONS_WRITE],
  },
  {
    path: '/inspections/:id/edit',
    requiredPermissions: [PERMISSIONS.INSPECTIONS_WRITE],
  },
  {
    path: '/inspection-templates',
    requiredPermissions: [PERMISSIONS.INSPECTIONS_ADMIN],
  },
  {
    path: '/time-tracking',
    requiredPermissions: [PERMISSIONS.TIME_TRACKING_READ],
  },
  {
    path: '/timesheets',
    requiredPermissions: [PERMISSIONS.TIME_TRACKING_APPROVE],
  },
  {
    path: '/invoices',
    requiredPermissions: [PERMISSIONS.INVOICES_READ],
  },
  {
    path: '/leads',
    requiredPermissions: [PERMISSIONS.LEADS_READ],
  },
  {
    path: '/accounts',
    requiredPermissions: [PERMISSIONS.ACCOUNTS_READ],
  },
  {
    path: '/residential/accounts/:id',
    requiredPermissions: [PERMISSIONS.ACCOUNTS_READ],
  },
  {
    path: '/contacts',
    requiredPermissions: [PERMISSIONS.CONTACTS_READ],
  },
  {
    path: '/proposals',
    requiredPermissions: [PERMISSIONS.PROPOSALS_READ],
  },
  {
    path: '/quotations',
    requiredPermissions: [PERMISSIONS.QUOTATIONS_READ],
  },
  {
    path: '/quotations/catalog',
    requiredPermissions: [PERMISSIONS.QUOTATIONS_ADMIN],
  },
  {
    path: '/contracts',
    requiredPermissions: [PERMISSIONS.CONTRACTS_READ],
  },
  {
    path: '/pricing',
    requiredPermissions: [PERMISSIONS.PRICING_READ],
  },
  {
    path: '/residential/pricing',
    requiredPermissions: [PERMISSIONS.PRICING_READ],
  },
  {
    path: '/residential/quotes',
    requiredPermissions: [PERMISSIONS.QUOTATIONS_READ],
  },
  {
    path: '/teams',
    requiredPermissions: [PERMISSIONS.TEAMS_READ],
  },
  {
    path: '/tasks',
    requiredPermissions: [PERMISSIONS.TASK_TEMPLATES_READ],
  },
  { path: '/finance', requiredPermissions: [PERMISSIONS.FINANCE_REPORTS_READ] },
  { path: '/finance/expenses', requiredPermissions: [PERMISSIONS.EXPENSES_READ] },
  { path: '/finance/payroll', requiredPermissions: [PERMISSIONS.PAYROLL_READ] },
  { path: '/finance/reports', requiredPermissions: [PERMISSIONS.FINANCE_REPORTS_READ] },
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
