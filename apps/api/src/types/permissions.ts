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
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
