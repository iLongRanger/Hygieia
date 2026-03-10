import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import LeadsList from '../leads/LeadsList';
import type { Lead, LeadSource } from '../../types/crm';
import type { User } from '../../types/user';
import { useAuthStore } from '../../stores/authStore';

const listLeadsMock = vi.fn();
const createLeadMock = vi.fn();
const archiveLeadMock = vi.fn();
const restoreLeadMock = vi.fn();
const listLeadSourcesMock = vi.fn();
const listUsersMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('../../lib/leads', () => ({
  listLeads: (...args: unknown[]) => listLeadsMock(...args),
  createLead: (...args: unknown[]) => createLeadMock(...args),
  archiveLead: (...args: unknown[]) => archiveLeadMock(...args),
  restoreLead: (...args: unknown[]) => restoreLeadMock(...args),
  listLeadSources: (...args: unknown[]) => listLeadSourcesMock(...args),
}));

vi.mock('../../lib/users', () => ({
  listUsers: (...args: unknown[]) => listUsersMock(...args),
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
    createLeadMock.mockResolvedValue({ id: 'lead-2' });
    archiveLeadMock.mockResolvedValue({ ...lead, archivedAt: new Date().toISOString() });
    restoreLeadMock.mockResolvedValue(lead);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders leads from API', async () => {
    render(<LeadsList />);

    expect((await screen.findAllByText('Jane Smith')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Acme Corporation')).length).toBeGreaterThan(0);
  });

  it('shows pipeline stages and filters to stage when clicked', async () => {
    const userEventInstance = userEvent.setup();
    render(<LeadsList />);

    expect(await screen.findByText(/lead pipeline/i)).toBeInTheDocument();
    await userEventInstance.click(screen.getByRole('button', { name: /walk through booked/i }));

    await waitFor(() => {
      expect(listLeadsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'walk_through_booked' })
      );
    });
  });

  it('uses the user-facing label for multi-word statuses in the table', async () => {
    listLeadsMock.mockResolvedValueOnce({
      data: [
        {
          ...lead,
          id: 'lead-2',
          status: 'walk_through_booked',
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    render(<LeadsList />);

    expect(await screen.findByText('Walk Through Booked')).toBeInTheDocument();
    expect(screen.queryByText('Walk_through_booked')).not.toBeInTheDocument();
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

    const rows = await screen.findAllByRole('row');
    const row = rows.find((candidate) => within(candidate).queryByText('Jane Smith')) || null;
    expect(row).toBeTruthy();
    const rowButtons = within(row as HTMLElement).getAllByRole('button');
    await userEventInstance.click(rowButtons[rowButtons.length - 1]);

    await waitFor(() => {
      expect(archiveLeadMock).toHaveBeenCalledWith('lead-1');
    });
  });

  it('does not show convert action in table rows', async () => {
    render(<LeadsList />);

    await screen.findAllByText('Jane Smith');
    expect(screen.queryByTitle(/convert to account/i)).not.toBeInTheDocument();
  });
});
