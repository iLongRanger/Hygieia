import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ProtectedRoute from '../ProtectedRoute';
import { useAuthStore } from '../../../stores/authStore';
import { PERMISSIONS } from '../../../lib/permissions';

const verifyTokenMock = vi.fn();
const loggerInfoMock = vi.fn();
const loggerDebugMock = vi.fn();
const loggerWarnMock = vi.fn();
const loggerErrorMock = vi.fn();

let mockPathname = '/protected';

vi.mock('../../../lib/auth', () => ({
  verifyToken: (...args: unknown[]) => verifyTokenMock(...args),
}));

vi.mock('../../../lib/logger', () => ({
  logger: {
    info: (...args: unknown[]) => loggerInfoMock(...args),
    debug: (...args: unknown[]) => loggerDebugMock(...args),
    warn: (...args: unknown[]) => loggerWarnMock(...args),
    error: (...args: unknown[]) => loggerErrorMock(...args),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom'
  );

  return {
    ...actual,
    useLocation: () => ({ pathname: mockPathname }),
    Navigate: ({ to, state }: any) => (
      <div
        data-testid="navigate"
        data-to={String(to)}
        data-state={JSON.stringify(state ?? null)}
      />
    ),
  };
});

describe('ProtectedRoute', () => {
  const originalClearAuth = useAuthStore.getState().clearAuth;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/protected';
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      clearAuth: originalClearAuth,
    });
  });

  afterEach(() => {
    useAuthStore.setState({
      clearAuth: originalClearAuth,
    });
  });

  it('redirects to /login when token is missing', async () => {
    render(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login');
    });
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated, token valid, and permissions satisfied', async () => {
    verifyTokenMock.mockResolvedValue(true);
    useAuthStore.setState({
      user: {
        id: 'user-1',
        email: 'admin@example.com',
        fullName: 'Admin User',
        role: 'admin',
      },
      token: 'valid-token',
      isAuthenticated: true,
    });

    render(
      <ProtectedRoute requiredPermissions={[PERMISSIONS.USERS_READ]}>
        <div>Secret Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText('Secret Content')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
  });

  it('redirects to /unauthorized when required permissions are missing', async () => {
    verifyTokenMock.mockResolvedValue(true);
    useAuthStore.setState({
      user: {
        id: 'user-2',
        email: 'cleaner@example.com',
        fullName: 'Cleaner User',
        role: 'cleaner',
      },
      token: 'valid-token',
      isAuthenticated: true,
    });

    render(
      <ProtectedRoute requiredPermissions={[PERMISSIONS.USERS_WRITE]}>
        <div>Secret Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByTestId('navigate')).toHaveAttribute(
        'data-to',
        '/unauthorized'
      );
    });

    const state = JSON.parse(
      screen.getByTestId('navigate').getAttribute('data-state') || '{}'
    );
    expect(state).toEqual(
      expect.objectContaining({
        from: '/protected',
        missingPermissions: [PERMISSIONS.USERS_WRITE],
      })
    );
  });

  it('clears auth and redirects when token validation fails', async () => {
    const clearAuthMock = vi.fn();
    verifyTokenMock.mockResolvedValue(false);
    useAuthStore.setState({
      user: {
        id: 'user-3',
        email: 'manager@example.com',
        fullName: 'Manager User',
        role: 'manager',
      },
      token: 'expired-token',
      isAuthenticated: true,
      clearAuth: clearAuthMock,
    });

    render(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(clearAuthMock).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login');
    });
  });
});
