import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import Sidebar from '../Sidebar';
import { useAuthStore } from '../../../stores/authStore';

describe('Sidebar RBAC', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      logout: vi.fn(),
    });
  });

  it('hides global settings for manager role', () => {
    useAuthStore.setState({
      user: {
        id: 'manager-1',
        email: 'manager@example.com',
        fullName: 'Manager User',
        role: 'manager',
      },
      token: 'token',
      isAuthenticated: true,
    });

    render(<Sidebar isOpen />);

    expect(screen.getAllByRole('link', { name: 'Users' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Area Templates' }).length).toBeGreaterThan(0);
  });

  it('shows route when explicit user permissions grant access', () => {
    useAuthStore.setState({
      user: {
        id: 'cleaner-1',
        email: 'cleaner@example.com',
        fullName: 'Cleaner User',
        role: 'cleaner',
        permissions: {
          users_read: true,
        },
      },
      token: 'token',
      isAuthenticated: true,
    });

    render(<Sidebar isOpen />);

    expect(screen.getAllByRole('link', { name: 'Users' }).length).toBeGreaterThan(0);
  });
});
