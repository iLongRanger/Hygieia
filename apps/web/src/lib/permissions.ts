export const PERMISSIONS = {
  USERS_READ: 'users_read',
  USERS_WRITE: 'users_write',
  SETTINGS_READ: 'settings_read',
  SETTINGS_WRITE: 'settings_write',
  PRICING_READ: 'pricing_read',
  PRICING_WRITE: 'pricing_write',
  TEAMS_READ: 'teams_read',
  TEAMS_WRITE: 'teams_write',
  PROPOSAL_TEMPLATES_READ: 'proposal_templates_read',
  PROPOSAL_TEMPLATES_WRITE: 'proposal_templates_write',
  AREA_TYPES_MANAGE: 'area_types_manage',
  LEAD_SOURCES_READ: 'lead_sources_read',
  LEAD_SOURCES_WRITE: 'lead_sources_write',
  FIXTURE_TYPES_READ: 'fixture_types_read',
  FIXTURE_TYPES_WRITE: 'fixture_types_write',
  TASK_TEMPLATES_READ: 'task_templates_read',
  TASK_TEMPLATES_WRITE: 'task_templates_write',
  AREAS_READ: 'areas_read',
  AREAS_WRITE: 'areas_write',
  AREAS_ADMIN: 'areas_admin',
  AREA_TEMPLATES_READ: 'area_templates_read',
  AREA_TEMPLATES_READ_BY_TYPE: 'area_templates_read_by_type',
  AREA_TEMPLATES_WRITE: 'area_templates_write',
  LEADS_READ: 'leads_read',
  LEADS_WRITE: 'leads_write',
  LEADS_ADMIN: 'leads_admin',
  CONTACTS_READ: 'contacts_read',
  CONTACTS_WRITE: 'contacts_write',
  CONTACTS_ADMIN: 'contacts_admin',
  ACCOUNTS_READ: 'accounts_read',
  ACCOUNTS_WRITE: 'accounts_write',
  ACCOUNTS_ADMIN: 'accounts_admin',
  DASHBOARD_READ: 'dashboard_read',
  FACILITIES_READ: 'facilities_read',
  FACILITIES_WRITE: 'facilities_write',
  FACILITIES_ADMIN: 'facilities_admin',
  FACILITY_TASKS_READ: 'facility_tasks_read',
  FACILITY_TASKS_WRITE: 'facility_tasks_write',
  FACILITY_TASKS_ADMIN: 'facility_tasks_admin',
  TEAMS_ADMIN: 'teams_admin',
  TASK_TEMPLATES_ADMIN: 'task_templates_admin',
  PROPOSAL_TEMPLATES_ADMIN: 'proposal_templates_admin',
  PROPOSAL_TEMPLATES_DELETE: 'proposal_templates_delete',
  PROPOSALS_READ: 'proposals_read',
  PROPOSALS_WRITE: 'proposals_write',
  PROPOSALS_ADMIN: 'proposals_admin',
  PROPOSALS_DELETE: 'proposals_delete',
  CONTRACTS_READ: 'contracts_read',
  CONTRACTS_WRITE: 'contracts_write',
  CONTRACTS_ADMIN: 'contracts_admin',
  JOBS_READ: 'jobs_read',
  JOBS_WRITE: 'jobs_write',
  JOBS_ADMIN: 'jobs_admin',
  INSPECTIONS_READ: 'inspections_read',
  INSPECTIONS_WRITE: 'inspections_write',
  INSPECTIONS_ADMIN: 'inspections_admin',
  TIME_TRACKING_READ: 'time_tracking_read',
  TIME_TRACKING_WRITE: 'time_tracking_write',
  TIME_TRACKING_APPROVE: 'time_tracking_approve',
  INVOICES_READ: 'invoices_read',
  INVOICES_WRITE: 'invoices_write',
  INVOICES_ADMIN: 'invoices_admin',
  QUOTATIONS_READ: 'quotations_read',
  QUOTATIONS_WRITE: 'quotations_write',
  QUOTATIONS_ADMIN: 'quotations_admin',
  QUOTATIONS_DELETE: 'quotations_delete',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export type UserRole = 'owner' | 'admin' | 'manager' | 'cleaner';
export type PermissionMap = Record<string, boolean>;

export interface PermissionSubject {
  role?: string | null;
  permissions?: PermissionMap | null;
}

const rolePermissionMap: Record<UserRole, PermissionMap> = {
  owner: {
    all: true,
  },
  admin: {
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
    areas_read: true,
    areas_write: true,
    areas_admin: true,
    area_templates_read: true,
    area_templates_read_by_type: true,
    area_templates_write: true,
    leads_read: true,
    leads_write: true,
    leads_admin: true,
    contacts_read: true,
    contacts_write: true,
    contacts_admin: true,
    accounts_read: true,
    accounts_write: true,
    accounts_admin: true,
    dashboard_read: true,
    facilities_read: true,
    facilities_write: true,
    facilities_admin: true,
    facility_tasks_read: true,
    facility_tasks_write: true,
    facility_tasks_admin: true,
    teams_admin: true,
    task_templates_admin: true,
    proposal_templates_admin: true,
    proposals_read: true,
    proposals_write: true,
    proposals_admin: true,
    contracts_read: true,
    contracts_write: true,
    contracts_admin: true,
    jobs_read: true,
    jobs_write: true,
    jobs_admin: true,
    inspections_read: true,
    inspections_write: true,
    inspections_admin: true,
    time_tracking_read: true,
    time_tracking_write: true,
    time_tracking_approve: true,
    invoices_read: true,
    invoices_write: true,
    invoices_admin: true,
    quotations_read: true,
    quotations_write: true,
    quotations_admin: true,
  },
  manager: {
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
    areas_read: true,
    areas_write: true,
    area_templates_read_by_type: true,
    leads_read: true,
    leads_write: true,
    contacts_read: true,
    contacts_write: true,
    accounts_read: true,
    accounts_write: true,
    dashboard_read: true,
    facilities_read: true,
    facilities_write: true,
    facility_tasks_read: true,
    facility_tasks_write: true,
    proposals_read: true,
    proposals_write: true,
    contracts_read: true,
    contracts_write: true,
    jobs_read: true,
    jobs_write: true,
    inspections_read: true,
    inspections_write: true,
    time_tracking_read: true,
    time_tracking_write: true,
    time_tracking_approve: true,
    invoices_read: true,
    invoices_write: true,
    quotations_read: true,
    quotations_write: true,
  },
  cleaner: {
    facilities_read: true,
    jobs_read: true,
    inspections_read: true,
    inspections_write: true,
    time_tracking_read: true,
    time_tracking_write: true,
  },
};

export function isUserRole(role: string): role is UserRole {
  return ['owner', 'admin', 'manager', 'cleaner'].includes(role);
}

function getRolePermissions(role?: string | null): PermissionMap {
  if (!role || !isUserRole(role)) {
    return {};
  }

  return rolePermissionMap[role];
}

function hasPermissionInMap(permission: string, permissions: PermissionMap): boolean {
  return permissions.all === true || permissions[permission] === true;
}

export function hasUserPermission(permission: string, subject?: PermissionSubject | null): boolean {
  if (!subject) {
    return false;
  }

  const explicitPermissions = subject.permissions;
  if (explicitPermissions && Object.keys(explicitPermissions).length > 0) {
    return hasPermissionInMap(permission, explicitPermissions);
  }

  const rolePermissions = getRolePermissions(subject.role);
  return hasPermissionInMap(permission, rolePermissions);
}

export function canUserAnyPermission(
  permissions: string[],
  subject?: PermissionSubject | null
): boolean {
  if (permissions.length === 0) {
    return true;
  }

  return permissions.some((permission) => hasUserPermission(permission, subject));
}

export function canUserAllPermissions(
  permissions: string[],
  subject?: PermissionSubject | null
): boolean {
  if (permissions.length === 0) {
    return true;
  }

  return permissions.every((permission) => hasUserPermission(permission, subject));
}
