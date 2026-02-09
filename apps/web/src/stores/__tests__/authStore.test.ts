import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '../authStore';
import { PERMISSIONS } from '../../lib/permissions';

describe('authStore permission helpers', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  });

  it('hasPermission falls back to role-based permissions when user permissions are missing', () => {
    useAuthStore.setState({
      user: {
        id: 'user-1',
        email: 'manager@example.com',
        fullName: 'Manager User',
        role: 'manager',
      },
      token: 'token',
      isAuthenticated: true,
    });

    expect(useAuthStore.getState().hasPermission(PERMISSIONS.TEAMS_WRITE)).toBe(true);
    expect(useAuthStore.getState().hasPermission(PERMISSIONS.USERS_WRITE)).toBe(false);
  });

  it('canAny returns true when any provided permission is available', () => {
    useAuthStore.setState({
      user: {
        id: 'user-2',
        email: 'custom@example.com',
        fullName: 'Custom User',
        role: 'cleaner',
        permissions: {
          users_read: true,
        },
      },
      token: 'token',
      isAuthenticated: true,
    });

    expect(
      useAuthStore
        .getState()
        .canAny([PERMISSIONS.USERS_WRITE, PERMISSIONS.USERS_READ])
    ).toBe(true);
  });
});
