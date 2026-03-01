import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import LeadsList from '../leads/LeadsList';
import type { Lead, LeadSource, Account } from '../../types/crm';
import type { User } from '../../types/user';
import type { Facility } from '../../types/facility';
import { useAuthStore } from '../../stores/authStore';

const listLeadsMock = vi.fn();
const createLeadMock = vi.fn();
const archiveLeadMock = vi.fn();
const restoreLeadMock = vi.fn();
const listLeadSourcesMock = vi.fn();
const canConvertLeadMock = vi.fn();
const convertLeadMock = vi.fn();
const listUsersMock = vi.fn();
const listAccountsMock = vi.fn();
const listFacilitiesMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('../../lib/leads', () => ({
  listLeads: (...args: unknown[]) => listLeadsMock(...args),
  createLead: (...args: unknown[]) => createLeadMock(...args),
  archiveLead: (...args: unknown[]) => archiveLeadMock(...args),
  restoreLead: (...args: unknown[]) => restoreLeadMock(...args),
  listLeadSources: (...args: unknown[]) => listLeadSourcesMock(...args),
  canConvertLead: (...args: unknown[]) => canConvertLeadMock(...args),
  convertLead: (...args: unknown[]) => convertLeadMock(...args),
}));

vi.mock('../../lib/users', () => ({
  listUsers: (...args: unknown[]) => listUsersMock(...args),
}));

vi.mock('../../lib/accounts', () => ({
  listAccounts: (...args: unknown[]) => listAccountsMock(...args),
}));

vi.mock('../../lib/facilities', () => ({
  listFacilities: (...args: unknown[]) => listFacilitiesMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

const leadSource: LeadSource = {
  id: 'source-1',
  name: 'Website',
  description: null,
  color: '#10b981',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  _count: { leads: 1 },
};

const lead: Lead = {
  id: 'lead-1',
  status: 'lead',
  companyName: 'Acme Corporation',
  contactName: 'Jane Smith',
  primaryEmail: 'jane@example.com',
  primaryPhone: '(555) 123-4567',
  secondaryEmail: null,
  secondaryPhone: null,
  address: null,
  estimatedValue: '5000',
  probability: 50,
  expectedCloseDate: null,
  notes: null,
  lostReason: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  archivedAt: null,
  leadSource: { id: 'source-1', name: 'Website', color: '#10b981' },
  assignedToUser: { id: 'user-1', fullName: 'Sales Rep', email: 'rep@example.com' },
  createdByUser: { id: 'user-2', fullName: 'Admin User' },
  convertedToAccountId: null,
  convertedAt: null,
  convertedToAccount: null,
  convertedByUser: null,
};

const user: User = {
  id: 'user-1',
  email: 'rep@example.com',
  fullName: 'Sales Rep',
  phone: null,
  avatarUrl: null,
  status: 'active',
  lastLoginAt: null,
  preferences: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  roles: [],
};

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
  createdByUser: { id: 'user-2', fullName: 'Admin User' },
  _count: { contacts: 1, facilities: 1 },
};

const facility: Facility = {
  id: 'facility-1',
  name: 'HQ',
  address: {},
  squareFeet: null,
  buildingType: null,
  accessInstructions: null,
  parkingInfo: null,
  specialRequirements: null,
  status: 'active',
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  archivedAt: null,
  account: { id: 'account-1', name: 'Acme Corporation', type: 'commercial' },
  facilityManager: null,
  createdByUser: { id: 'user-2', fullName: 'Admin User' },
  _count: { areas: 0, facilityTasks: 0 },
};

describe('LeadsList', () => {
  beforeEach(() => {
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    useAuthStore.setState({
      user: { id: 'owner-1', email: 'owner@example.com', fullName: 'Owner User', role: 'owner' },
      token: 'token',
      refreshToken: null,
      isAuthenticated: true,
    });
    listLeadsMock.mockResolvedValue({
      data: [lead],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    listLeadSourcesMock.mockResolvedValue({ data: [leadSource] });
    listUsersMock.mockResolvedValue({ data: [user], pagination: { page: 1, limit: 100, total: 1, totalPages: 1 } });
    listAccountsMock.mockResolvedValue({ data: [account], pagination: { page: 1, limit: 100, total: 1, totalPages: 1 } });
    listFacilitiesMock.mockResolvedValue({ data: [facility], pagination: { page: 1, limit: 100, total: 1, totalPages: 1 } });
    createLeadMock.mockResolvedValue({ id: 'lead-2' });
    archiveLeadMock.mockResolvedValue({ ...lead, archivedAt: new Date().toISOString() });
    restoreLeadMock.mockResolvedValue(lead);
    canConvertLeadMock.mockResolvedValue({ canConvert: true });
    convertLeadMock.mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders leads from API', async () => {
    render(<LeadsList />);

    expect(await screen.findByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
  });

  it('creates a lead from modal', async () => {
    const userEventInstance = userEvent.setup();
    render(<LeadsList />);

    await userEventInstance.click(screen.getByRole('button', { name: /add new lead/i }));
    await userEventInstance.type(await screen.findByLabelText(/contact name/i), 'John Prospect');
    await userEventInstance.click(screen.getByRole('button', { name: /create lead/i }));

    expect(createLeadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        contactName: 'John Prospect',
        status: 'lead',
      })
    );
  });

  it('captures custom source when Others is selected', async () => {
    const userEventInstance = userEvent.setup();
    render(<LeadsList />);

    await userEventInstance.click(screen.getByRole('button', { name: /add new lead/i }));
    await userEventInstance.type(await screen.findByLabelText(/contact name/i), 'Jane Prospect');

    await userEventInstance.selectOptions(
      screen.getByLabelText(/lead source/i),
      'others'
    );
    await userEventInstance.type(
      screen.getByLabelText(/where did this lead come from/i),
      'Neighborhood event'
    );
    await userEventInstance.click(screen.getByRole('button', { name: /create lead/i }));

    expect(createLeadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        contactName: 'Jane Prospect',
        leadSourceId: null,
        notes: expect.stringContaining('Neighborhood event'),
      })
    );
  });

  it('shows source from notes when leadSource relation is missing', async () => {
    listLeadsMock.mockResolvedValueOnce({
      data: [
        {
          ...lead,
          id: 'lead-2',
          contactName: 'No Source Contact',
          leadSource: null,
          notes: 'Lead source: Website',
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    render(<LeadsList />);

    const contactName = await screen.findByText('No Source Contact');
    const row = contactName.closest('tr');
    expect(row).toBeTruthy();
    expect(within(row as HTMLElement).getByText('Website')).toBeInTheDocument();
  });

  it('opens create modal when loading /leads/new directly', async () => {
    render(<LeadsList />, { initialRoute: '/leads/new' });

    expect(await screen.findByLabelText(/contact name/i)).toBeInTheDocument();
    expect(listLeadSourcesMock).toHaveBeenCalledWith({ isActive: true });
  });

  it('archives a lead from row action', async () => {
    const userEventInstance = userEvent.setup();
    render(<LeadsList />);

    const contactName = await screen.findByText('Jane Smith');
    const row = contactName.closest('tr');
    expect(row).toBeTruthy();
    const rowButtons = within(row as HTMLElement).getAllByRole('button');
    await userEventInstance.click(rowButtons[rowButtons.length - 1]);

    await waitFor(() => {
      expect(archiveLeadMock).toHaveBeenCalledWith('lead-1');
    });
  });

  it('blocks lead conversion when facility street address is missing', async () => {
    const userEventInstance = userEvent.setup();
    render(<LeadsList />);

    await userEventInstance.click(await screen.findByTitle(/convert to account/i));
    const modal = await screen.findByRole('dialog', { name: /convert lead to account/i });
    await userEventInstance.clear(within(modal).getByLabelText(/street address/i));
    await userEventInstance.click(within(modal).getByRole('button', { name: /convert lead/i }));

    expect(convertLeadMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith(
      'Facility address is required before converting this lead'
    );
  });
});
