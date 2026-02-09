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
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
