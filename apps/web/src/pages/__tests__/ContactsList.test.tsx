import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import ContactsList from '../contacts/ContactsList';
import type { Contact, Account } from '../../types/crm';
import { useAuthStore } from '../../stores/authStore';

const listContactsMock = vi.fn();
const createContactMock = vi.fn();
const archiveContactMock = vi.fn();
const restoreContactMock = vi.fn();
const listAccountsMock = vi.fn();

vi.mock('../../lib/contacts', () => ({
  listContacts: (...args: unknown[]) => listContactsMock(...args),
  createContact: (...args: unknown[]) => createContactMock(...args),
  archiveContact: (...args: unknown[]) => archiveContactMock(...args),
  restoreContact: (...args: unknown[]) => restoreContactMock(...args),
}));

vi.mock('../../lib/accounts', () => ({
  listAccounts: (...args: unknown[]) => listAccountsMock(...args),
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
  industry: null,
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
  accountManager: null,
  createdByUser: {
    id: 'user-1',
    fullName: 'Admin User',
  },
  _count: {
    contacts: 1,
    facilities: 1,
  },
};

const contact: Contact = {
  id: 'contact-1',
  name: 'Jane Smith',
  email: 'jane@example.com',
  phone: '(555) 123-4567',
  mobile: null,
  title: 'Facility Manager',
  department: 'Operations',
  isPrimary: true,
  isBilling: false,
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  archivedAt: null,
  account: {
    id: 'account-1',
    name: 'Acme Corporation',
    type: 'commercial',
  },
  createdByUser: {
    id: 'user-1',
    fullName: 'Admin User',
  },
};

describe('ContactsList', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 'owner-1', email: 'owner@example.com', fullName: 'Owner User', role: 'owner' },
      token: 'token',
      refreshToken: null,
      isAuthenticated: true,
    });
    listContactsMock.mockResolvedValue({
      data: [contact],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    listAccountsMock.mockResolvedValue({
      data: [account],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    createContactMock.mockResolvedValue({ id: 'contact-2' });
    archiveContactMock.mockResolvedValue({ ...contact, archivedAt: new Date().toISOString() });
    restoreContactMock.mockResolvedValue(contact);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders contacts from API', async () => {
    render(<ContactsList />);

    expect(await screen.findByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
  });

  it('creates a contact from modal', async () => {
    const user = userEvent.setup();
    render(<ContactsList />);

    await user.click(screen.getByRole('button', { name: /add new contact/i }));
    await user.type(await screen.findByLabelText(/full name/i), 'John Contact');
    await user.selectOptions(screen.getByLabelText(/^account$/i), 'account-1');
    await user.click(screen.getByRole('button', { name: /create contact/i }));

    expect(createContactMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'John Contact',
        accountId: 'account-1',
      })
    );
  });

  it('archives a contact from list action', async () => {
    const user = userEvent.setup();
    render(<ContactsList />);

    const contactName = await screen.findByText('Jane Smith');
    const row = contactName.closest('tr');
    expect(row).toBeTruthy();
    const rowButtons = within(row as HTMLElement).getAllByRole('button');
    await user.click(rowButtons[1]);

    await waitFor(() => {
      expect(archiveContactMock).toHaveBeenCalledWith('contact-1');
    });
  });
});
