import { describe, expect, it } from 'vitest';
import { PERMISSIONS } from '../permissions';
import { canAccessRoute, getRequiredPermissions } from '../routeAccess';

describe('routeAccess', () => {
  it('returns required permissions for restricted routes', () => {
    expect(getRequiredPermissions('/users')).toEqual([PERMISSIONS.USERS_READ]);
    expect(getRequiredPermissions('/appointments')).toEqual([PERMISSIONS.APPOINTMENTS_READ]);
    expect(getRequiredPermissions('/commercial/pricing')).toEqual([PERMISSIONS.PRICING_READ]);
    expect(getRequiredPermissions('/settings/global')).toEqual([
      PERMISSIONS.SETTINGS_WRITE,
    ]);
  });

  it('allows unrestricted routes', () => {
    expect(canAccessRoute('/unlisted-route', { role: 'cleaner' })).toBe(true);
  });

  it('enforces permission checks for restricted routes', () => {
    expect(canAccessRoute('/users', { role: 'manager' })).toBe(true);
    expect(canAccessRoute('/appointments', { role: 'manager' })).toBe(true);
    expect(canAccessRoute('/appointments', { role: 'cleaner' })).toBe(false);
    expect(canAccessRoute('/settings/global', { role: 'manager' })).toBe(false);
    expect(canAccessRoute('/users', { role: 'admin' })).toBe(true);
  });
});
