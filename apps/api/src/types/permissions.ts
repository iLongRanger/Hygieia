export const PERMISSIONS = {
  USERS_READ: 'users_read',
  USERS_WRITE: 'users_write',
  SETTINGS_READ: 'settings_read',
  SETTINGS_WRITE: 'settings_write',
  PRICING_READ: 'pricing_read',
  PRICING_WRITE: 'pricing_write',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
