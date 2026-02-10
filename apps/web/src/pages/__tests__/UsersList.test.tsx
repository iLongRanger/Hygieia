import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import UsersList from '../users/UsersList';
import type { User, Role } from '../../types/user';
import { useAuthStore } from '../../stores/authStore';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const listUsersMock = vi.fn();
const createUserMock = vi.fn();
const listRolesMock = vi.fn();

vi.mock('../../lib/users', () => ({
  listUsers: (...args: unknown[]) => listUsersMock(...args),
  createUser: (...args: unknown[]) => createUserMock(...args),
  listRoles: (...args: unknown[]) => listRolesMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const role: Role = {
  id: 'role-1',
  key: 'cleaner',
  label: 'Cleaner',
  description: null,
  permissions: {},
  isSystemRole: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const user: User = {
  id: 'user-1',
  email: 'cleaner@example.com',
  fullName: 'Jane Cleaner',
  phone: '(555) 123-4567',
  avatarUrl: null,
  status: 'active',
  lastLoginAt: null,
  preferences: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  roles: [
    {
      id: 'user-role-1',
      assignedAt: new Date().toISOString(),
      expiresAt: null,
      role: { id: 'role-1', key: 'cleaner', label: 'Cleaner' },
    },
  ],
};

describe('UsersList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockReset();
    useAuthStore.setState({
      user: { id: 'owner-1', email: 'owner@example.com', fullName: 'Owner User', role: 'owner' },
      token: 'token',
      refreshToken: null,
      isAuthenticated: true,
    });
    listUsersMock.mockResolvedValue({
      data: [user],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    listRolesMock.mockResolvedValue({ data: [role] });
    createUserMock.mockResolvedValue({ id: 'user-2' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders users from API', async () => {
    render(<UsersList />);

    expect(await screen.findByText('Jane Cleaner')).toBeInTheDocument();
    expect(screen.getByText('cleaner@example.com')).toBeInTheDocument();
  });

  it('creates a user from modal', async () => {
    const userEventInstance = userEvent.setup();
    render(<UsersList />);

    await userEventInstance.click(screen.getByRole('button', { name: /add new user/i }));
    await userEventInstance.type(await screen.findByLabelText(/full name/i), 'New User');
    await userEventInstance.type(screen.getByLabelText(/^email$/i), 'new.user@example.com');
    await userEventInstance.type(screen.getByLabelText(/password/i), 'Password123');
    await userEventInstance.click(screen.getByRole('button', { name: /create user/i }));

    expect(createUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'New User',
        email: 'new.user@example.com',
      })
    );
  });

  it('navigates to user detail on view action', async () => {
    const userEventInstance = userEvent.setup();
    render(<UsersList />);

    await userEventInstance.click(await screen.findByRole('button', { name: /view/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/users/user-1');
    });
  });
});
