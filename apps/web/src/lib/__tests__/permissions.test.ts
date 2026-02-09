import { describe, expect, it } from 'vitest';
import {
  PERMISSIONS,
  canUserAnyPermission,
  hasUserPermission,
} from '../permissions';

describe('permissions', () => {
  it('falls back to role permissions when explicit permissions are not provided', () => {
    expect(
      hasUserPermission(PERMISSIONS.USERS_READ, { role: 'admin' })
    ).toBe(true);
    expect(
      hasUserPermission(PERMISSIONS.USERS_WRITE, { role: 'manager' })
    ).toBe(false);
  });

  it('uses explicit permissions when provided on the user payload', () => {
    const subject = {
      role: 'cleaner',
      permissions: {
        users_read: true,
      },
    };

    expect(hasUserPermission(PERMISSIONS.USERS_READ, subject)).toBe(true);
    expect(hasUserPermission(PERMISSIONS.USERS_WRITE, subject)).toBe(false);
  });

  it('canUserAnyPermission returns true when at least one permission is granted', () => {
    expect(
      canUserAnyPermission(
        [PERMISSIONS.USERS_WRITE, PERMISSIONS.USERS_READ],
        { role: 'manager' }
      )
    ).toBe(true);
  });
});
