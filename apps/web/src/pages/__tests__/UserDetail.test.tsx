import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import UserDetail from '../users/UserDetail';
import type { User, Role } from '../../types/user';

let mockParams: { id?: string } = { id: 'user-1' };
const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => navigateMock,
  };
});

const getUserMock = vi.fn();
const updateUserMock = vi.fn();
const deleteUserMock = vi.fn();
const listRolesMock = vi.fn();
const assignRoleMock = vi.fn();
const removeRoleMock = vi.fn();
const changePasswordMock = vi.fn();

vi.mock('../../lib/users', () => ({
  getUser: (...args: unknown[]) => getUserMock(...args),
  updateUser: (...args: unknown[]) => updateUserMock(...args),
  deleteUser: (...args: unknown[]) => deleteUserMock(...args),
  listRoles: (...args: unknown[]) => listRolesMock(...args),
  assignRole: (...args: unknown[]) => assignRoleMock(...args),
  removeRole: (...args: unknown[]) => removeRoleMock(...args),
  changePassword: (...args: unknown[]) => changePasswordMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const roleCleaner: Role = {
  id: 'role-1',
  key: 'cleaner',
  label: 'Cleaner',
  description: null,
  permissions: {},
  isSystemRole: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const roleManager: Role = {
  id: 'role-2',
  key: 'manager',
  label: 'Manager',
  description: null,
  permissions: {},
  isSystemRole: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const userData: User = {
  id: 'user-1',
  email: 'jane@example.com',
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

describe('UserDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { id: 'user-1' };
    navigateMock.mockReset();
    getUserMock.mockResolvedValue(userData);
    listRolesMock.mockResolvedValue({ data: [roleCleaner, roleManager] });
    updateUserMock.mockResolvedValue(userData);
    deleteUserMock.mockResolvedValue({});
    assignRoleMock.mockResolvedValue(userData);
    removeRoleMock.mockResolvedValue(userData);
    changePasswordMock.mockResolvedValue(userData);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders user detail', async () => {
    render(<UserDetail />);

    expect(await screen.findByRole('heading', { name: 'Jane Cleaner' })).toBeInTheDocument();
    expect((await screen.findAllByText('jane@example.com')).length).toBeGreaterThan(0);
    expect(screen.getByText('Assigned Roles')).toBeInTheDocument();
  });

  it('updates user from edit modal', async () => {
    const user = userEvent.setup();
    render(<UserDetail />);

    await user.click(await screen.findByRole('button', { name: /edit user/i }));
    const fullNameInput = await screen.findByLabelText(/full name/i);
    await user.clear(fullNameInput);
    await user.type(fullNameInput, 'Jane Updated');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(updateUserMock).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          fullName: 'Jane Updated',
        })
      );
    });
  });

  it('assigns role from add role modal', async () => {
    const user = userEvent.setup();
    render(<UserDetail />);

    await user.click(await screen.findByRole('button', { name: /add role/i }));
    await user.selectOptions(await screen.findByLabelText(/select role/i), 'manager');
    await user.click(screen.getByRole('button', { name: /assign role/i }));

    await waitFor(() => {
      expect(assignRoleMock).toHaveBeenCalledWith('user-1', 'manager');
    });
  });
});
