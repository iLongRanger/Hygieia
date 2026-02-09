export type UserRole = 'owner' | 'admin' | 'manager' | 'cleaner';

export interface RolePermissions {
  [key: string]: boolean;
}

export const rolePermissions: Record<UserRole, RolePermissions> = {
  owner: {
    all: true,
    users: true,
    users_read: true,
    users_write: true,
    settings: true,
    settings_read: true,
    settings_write: true,
    billing: true,
    pricing_read: true,
    pricing_write: true,
    teams_read: true,
    teams_write: true,
    proposal_templates_read: true,
    proposal_templates_write: true,
    area_types_manage: true,
    lead_sources_read: true,
    lead_sources_write: true,
    fixture_types_read: true,
    fixture_types_write: true,
    task_templates_read: true,
    task_templates_write: true,
    crm: true,
    proposals: true,
    contracts: true,
    reporting: true,
    estimates: true,
    facilities: true,
    tasks: true,
    cleaners: true,
  },
  admin: {
    crm: true,
    proposals: true,
    contracts: true,
    reporting: true,
    users_read: true,
    users_write: true,
    settings_read: true,
    settings_write: true,
    pricing_read: true,
    pricing_write: true,
    teams_read: true,
    teams_write: true,
    proposal_templates_read: true,
    proposal_templates_write: true,
    area_types_manage: true,
    lead_sources_read: true,
    lead_sources_write: true,
    fixture_types_read: true,
    fixture_types_write: true,
    task_templates_read: true,
    task_templates_write: true,
    facilities: true,
    estimates: true,
  },
  manager: {
    estimates: true,
    facilities: true,
    tasks: true,
    cleaners: true,
    reports_read: true,
    users_read: true,
    settings_read: true,
    pricing_read: true,
    teams_read: true,
    teams_write: true,
    proposal_templates_read: true,
    proposal_templates_write: true,
    area_types_manage: true,
    lead_sources_read: true,
    fixture_types_read: true,
    task_templates_read: true,
    task_templates_write: true,
  },
  cleaner: {
    work_orders: true,
    own_tasks_only: true,
    facilities_read: true,
  },
};

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 100,
  admin: 75,
  manager: 50,
  cleaner: 25,
};

export function hasPermission(role: UserRole, permission: string): boolean {
  const permissions = rolePermissions[role];
  return permissions.all === true || permissions[permission] === true;
}

export function isRoleAtLeast(
  userRole: UserRole,
  requiredRole: UserRole
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function resolveHighestRole(roles: UserRole[]): UserRole {
  if (roles.length === 0) {
    return 'cleaner';
  }

  return roles.reduce((highest, current) =>
    ROLE_HIERARCHY[current] > ROLE_HIERARCHY[highest] ? current : highest
  );
}

const VALID_ROLES: UserRole[] = ['owner', 'admin', 'manager', 'cleaner'];

export function isValidRole(role: unknown): role is UserRole {
  return typeof role === 'string' && VALID_ROLES.includes(role as UserRole);
}
