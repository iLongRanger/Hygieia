import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import ContactDetail from '../contacts/ContactDetail';
import type { Contact, Account } from '../../types/crm';
import { useAuthStore } from '../../stores/authStore';

let mockParams: { id?: string } = { id: 'contact-1' };
const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => navigateMock,
  };
});

const getContactMock = vi.fn();
const updateContactMock = vi.fn();
const archiveContactMock = vi.fn();
const restoreContactMock = vi.fn();
const listAccountsMock = vi.fn();

vi.mock('../../lib/contacts', () => ({
  getContact: (...args: unknown[]) => getContactMock(...args),
  updateContact: (...args: unknown[]) => updateContactMock(...args),
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
  accountManager: null,
  createdByUser: {
    id: 'admin-1',
    fullName: 'Admin User',
  },
  _count: {
    contacts: 1,
    facilities: 1,
  },
};

const contact: Contact = {
  id: 'contact-1',
  name: 'Jane Doe',
  email: 'jane@acme.com',
  phone: '123-456-7890',
  mobile: null,
  title: 'Operations Manager',
  department: 'Operations',
  isPrimary: true,
  isBilling: false,
  notes: 'Primary point of contact',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  archivedAt: null,
  account: {
    id: 'account-1',
    name: 'Acme Corporation',
    type: 'commercial',
  },
  createdByUser: {
    id: 'admin-1',
    fullName: 'Admin User',
  },
};

describe('ContactDetail', () => {
  beforeEach(() => {
    mockParams = { id: 'contact-1' };
    navigateMock.mockReset();
    useAuthStore.setState({
      user: { id: 'owner-1', email: 'owner@example.com', fullName: 'Owner User', role: 'owner' },
      token: 'token',
      refreshToken: null,
      isAuthenticated: true,
    });

    getContactMock.mockResolvedValue(contact);
    updateContactMock.mockResolvedValue(contact);
    archiveContactMock.mockResolvedValue({ ...contact, archivedAt: new Date().toISOString() });
    restoreContactMock.mockResolvedValue(contact);
    listAccountsMock.mockResolvedValue({
      data: [account],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders contact details', async () => {
    render(<ContactDetail />);

    expect(await screen.findByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument();
    expect((await screen.findAllByText('Operations Manager')).length).toBeGreaterThan(0);
    expect(screen.getByText('Primary Contact')).toBeInTheDocument();
  });

  it('updates contact from edit modal', async () => {
    const userEventInstance = userEvent.setup();
    render(<ContactDetail />);

    await screen.findByRole('heading', { name: 'Jane Doe' });
    await userEventInstance.click(screen.getByRole('button', { name: /edit contact/i }));

    const nameInput = await screen.findByLabelText(/contact name/i);
    await userEventInstance.clear(nameInput);
    await userEventInstance.type(nameInput, 'Jane Updated');

    await userEventInstance.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(updateContactMock).toHaveBeenCalledWith(
        'contact-1',
        expect.objectContaining({ name: 'Jane Updated' })
      );
    });
  });
});
