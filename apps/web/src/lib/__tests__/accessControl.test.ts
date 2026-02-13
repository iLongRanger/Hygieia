import { describe, expect, it } from 'vitest';
import {
  getRequiredRoles,
  isUserRole,
  canAccessRoute,
} from '../accessControl';

describe('accessControl', () => {
  it('returns required roles for configured restricted routes', () => {
    expect(getRequiredRoles('/users')).toEqual(['owner', 'admin']);
    expect(getRequiredRoles('/settings/global')).toEqual(['owner', 'admin']);
  });

  it('returns undefined for unrestricted routes', () => {
    expect(getRequiredRoles('/dashboard')).toBeUndefined();
  });

  it('validates allowed user roles', () => {
    expect(isUserRole('owner')).toBe(true);
    expect(isUserRole('admin')).toBe(true);
    expect(isUserRole('manager')).toBe(true);
    expect(isUserRole('cleaner')).toBe(true);
    expect(isUserRole('superadmin')).toBe(false);
    expect(isUserRole('')).toBe(false);
  });

  it('allows access to unrestricted routes regardless of role', () => {
    expect(canAccessRoute('/dashboard', undefined)).toBe(true);
    expect(canAccessRoute('/dashboard', null)).toBe(true);
    expect(canAccessRoute('/dashboard', 'not-a-role')).toBe(true);
  });

  it('enforces role checks for restricted routes', () => {
    expect(canAccessRoute('/users', 'admin')).toBe(true);
    expect(canAccessRoute('/users', 'owner')).toBe(true);
    expect(canAccessRoute('/users', 'manager')).toBe(false);
    expect(canAccessRoute('/users', 'cleaner')).toBe(false);
    expect(canAccessRoute('/users', null)).toBe(false);
    expect(canAccessRoute('/users', 'invalid')).toBe(false);
  });
});
