import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import AccountsList from '../accounts/AccountsList';
import type { Account } from '../../types/crm';
import type { User } from '../../types/user';

const listAccountsMock = vi.fn();
const createAccountMock = vi.fn();
const archiveAccountMock = vi.fn();
const restoreAccountMock = vi.fn();
const listUsersMock = vi.fn();

vi.mock('../../lib/accounts', () => ({
  listAccounts: (...args: unknown[]) => listAccountsMock(...args),
  createAccount: (...args: unknown[]) => createAccountMock(...args),
  archiveAccount: (...args: unknown[]) => archiveAccountMock(...args),
  restoreAccount: (...args: unknown[]) => restoreAccountMock(...args),
}));

vi.mock('../../lib/users', () => ({
  listUsers: (...args: unknown[]) => listUsersMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const account: Account = {
  id: 'account-1',
  name: 'Acme Corporation',
  type: 'commercial',
  industry: 'office',
  website: null,
  billingEmail: null,
  billingPhone: null,
  billingAddress: null,
  qboCustomerId: null,
  taxId: null,
  paymentTerms: 'NET30',
  creditLimit: null,
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  archivedAt: null,
  accountManager: {
    id: 'user-1',
    fullName: 'Account Manager',
    email: 'manager@example.com',
  },
  createdByUser: {
    id: 'user-99',
    fullName: 'Admin User',
  },
  _count: {
    contacts: 2,
    facilities: 1,
  },
};

const user: User = {
  id: 'user-1',
  email: 'manager@example.com',
  fullName: 'Account Manager',
  phone: null,
  avatarUrl: null,
  status: 'active',
  lastLoginAt: null,
  preferences: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  roles: [],
};

describe('AccountsList', () => {
  beforeEach(() => {
    listAccountsMock.mockResolvedValue({
      data: [account],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    listUsersMock.mockResolvedValue({
      data: [user],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    createAccountMock.mockResolvedValue({ id: 'account-2' });
    archiveAccountMock.mockResolvedValue({ ...account, archivedAt: new Date().toISOString() });
    restoreAccountMock.mockResolvedValue(account);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders accounts from API', async () => {
    render(<AccountsList />);

    const accountName = await screen.findByText('Acme Corporation');
    expect(accountName).toBeInTheDocument();
    const row = accountName.closest('tr');
    expect(row).toBeTruthy();
    expect(within(row as HTMLElement).getByText('Account Manager')).toBeInTheDocument();
  });

  it('creates an account from modal', async () => {
    const userEventInstance = userEvent.setup();
    render(<AccountsList />);

    await userEventInstance.click(screen.getByRole('button', { name: /add new account/i }));
    await userEventInstance.type(await screen.findByLabelText(/account name/i), 'New Account');
    await userEventInstance.click(screen.getByRole('button', { name: /create account/i }));

    expect(createAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Account',
        type: 'commercial',
      })
    );
  });

  it('archives an account from list action', async () => {
    const userEventInstance = userEvent.setup();
    render(<AccountsList />);

    const accountName = await screen.findByText('Acme Corporation');
    const row = accountName.closest('tr');
    expect(row).toBeTruthy();
    const rowButtons = within(row as HTMLElement).getAllByRole('button');
    await userEventInstance.click(rowButtons[1]);

    await waitFor(() => {
      expect(archiveAccountMock).toHaveBeenCalledWith('account-1');
    });
  });
});
