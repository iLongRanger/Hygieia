import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import LeadsList from '../leads/LeadsList';
import type { Account, Lead, LeadSource, Opportunity } from '../../types/crm';
import type { Contract } from '../../types/contract';
import type { Job } from '../../types/job';
import type { ResidentialQuote } from '../../types/residential';
import type { User } from '../../types/user';
import { useAuthStore } from '../../stores/authStore';

const listLeadsMock = vi.fn();
const createLeadMock = vi.fn();
const archiveLeadMock = vi.fn();
const restoreLeadMock = vi.fn();
const listLeadSourcesMock = vi.fn();
const listOpportunitiesMock = vi.fn();
const listAccountsMock = vi.fn();
const listResidentialQuotesMock = vi.fn();
const listContractsMock = vi.fn();
const listJobsMock = vi.fn();
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

vi.mock('../../lib/opportunities', () => ({
  listOpportunities: (...args: unknown[]) => listOpportunitiesMock(...args),
}));

vi.mock('../../lib/accounts', () => ({
  listAccounts: (...args: unknown[]) => listAccountsMock(...args),
}));

vi.mock('../../lib/residential', () => ({
  listResidentialQuotes: (...args: unknown[]) => listResidentialQuotesMock(...args),
}));

vi.mock('../../lib/contracts', () => ({
  listContracts: (...args: unknown[]) => listContractsMock(...args),
}));

vi.mock('../../lib/jobs', () => ({
  listJobs: (...args: unknown[]) => listJobsMock(...args),
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
  type: 'commercial',
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

const opportunity: Opportunity = {
  id: 'opp-1',
  title: 'Acme Opportunity',
  status: 'walk_through_booked',
  source: 'Website',
  estimatedValue: '5000',
  probability: 50,
  expectedCloseDate: null,
  lostReason: null,
  wonAt: null,
  lostAt: null,
  closedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  archivedAt: null,
  lead: {
    id: 'lead-1',
    companyName: 'Acme Corporation',
    contactName: 'Jane Smith',
    status: 'walk_through_booked',
  },
  account: {
    id: 'account-1',
    name: 'Acme Corporation',
    type: 'commercial',
  },
  facility: {
    id: 'facility-1',
    name: 'Acme HQ',
  },
  primaryContact: {
    id: 'contact-1',
    name: 'Jane Smith',
    email: 'jane@example.com',
  },
  ownerUser: {
    id: 'user-1',
    fullName: 'Sales Rep',
    email: 'rep@example.com',
  },
  _count: {
    appointments: 1,
    proposals: 0,
    contracts: 0,
  },
};

const residentialAccount: Account = {
  id: 'account-res-1',
  name: 'Maple Property Group',
  type: 'residential',
  industry: null,
  website: null,
  billingEmail: 'maple@example.com',
  billingPhone: '555-1111',
  billingAddress: null,
  serviceAddress: null,
  qboCustomerId: null,
  taxId: null,
  paymentTerms: 'NET30',
  creditLimit: null,
  residentialProfile: null,
  residentialProperties: [
    {
      id: 'property-1',
      accountId: 'account-res-1',
      name: 'Maple Street House',
      serviceAddress: null,
      homeProfile: null,
      accessNotes: null,
      parkingAccess: null,
      entryNotes: null,
      pets: null,
      isPrimary: true,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archivedAt: null,
    },
  ],
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  archivedAt: null,
  accountManagerId: 'user-1',
  accountManager: { id: 'user-1', fullName: 'Sales Rep', email: 'rep@example.com' },
  createdByUser: { id: 'user-2', fullName: 'Admin User' },
  _count: { contacts: 1, facilities: 0 },
};

const residentialQuote: ResidentialQuote = {
  id: 'rq-1',
  quoteNumber: 'RQ-001',
  title: 'Maple Street Quote',
  status: 'sent',
  accountId: 'account-res-1',
  propertyId: 'property-1',
  serviceType: 'recurring_standard',
  frequency: 'weekly',
  customerName: 'Pat Owner',
  customerEmail: 'pat@example.com',
  customerPhone: null,
  subtotal: '250',
  addOnTotal: '0',
  recurringDiscount: '0',
  firstCleanSurcharge: '0',
  totalAmount: '250',
  estimatedHours: '3',
  confidenceLevel: 'high',
  manualReviewRequired: false,
  preferredStartDate: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  archivedAt: null,
  pricingPlan: { id: 'plan-1', name: 'Residential Standard' },
  account: {
    id: 'account-res-1',
    name: 'Maple Property Group',
    type: 'residential',
    billingEmail: 'maple@example.com',
    billingPhone: '555-1111',
    billingAddress: null,
    serviceAddress: null,
    residentialProfile: null,
  },
  property: {
    id: 'property-1',
    name: 'Maple Street House',
    serviceAddress: null,
    homeProfile: {
      homeType: 'single_family',
      squareFeet: 1800,
      bedrooms: 3,
      fullBathrooms: 2,
      halfBathrooms: 0,
      levels: 1,
      occupiedStatus: 'occupied',
      condition: 'standard',
    },
    accessNotes: null,
    parkingAccess: null,
    entryNotes: null,
    pets: null,
    isPrimary: true,
    status: 'active',
  },
  addOns: [],
};

const residentialContract: Contract = {
  id: 'contract-res-1',
  contractNumber: 'C-RES-001',
  title: 'Maple Residential Service',
  status: 'draft',
  residentialPropertyId: 'property-1',
  renewalNumber: 0,
  startDate: new Date().toISOString(),
  endDate: null,
  serviceFrequency: 'weekly',
  serviceSchedule: null,
  autoRenew: false,
  renewalNoticeDays: null,
  monthlyValue: 250,
  totalValue: null,
  billingCycle: 'monthly',
  residentialServiceType: 'recurring_standard',
  residentialFrequency: 'weekly',
  paymentTerms: 'NET30',
  subcontractorTier: null,
  subcontractorPayout: null,
  pendingAssignedTeamId: null,
  pendingAssignedToUserId: null,
  pendingSubcontractorTier: null,
  assignmentOverrideEffectiveDate: null,
  assignmentOverrideSetAt: null,
  termsAndConditions: null,
  termsDocumentName: null,
  termsDocumentMimeType: null,
  specialInstructions: null,
  sentAt: null,
  viewedAt: null,
  publicToken: null,
  signedDocumentUrl: null,
  signedDate: null,
  signedByName: null,
  signedByEmail: null,
  approvedAt: null,
  terminationReason: null,
  terminatedAt: null,
  includesInitialClean: false,
  initialCleanCompleted: false,
  initialCleanCompletedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  archivedAt: null,
  account: { id: 'account-res-1', name: 'Maple Property Group', type: 'residential' },
  facility: null,
  proposal: null,
  assignedTeam: null,
  assignedToUser: null,
  pendingAssignedTeam: null,
  pendingAssignedToUser: null,
  approvedByUser: null,
  createdByUser: { id: 'user-1', fullName: 'Sales Rep', email: 'rep@example.com' },
};

const residentialJob: Job = {
  id: 'job-1',
  jobNumber: 'JOB-001',
  jobType: 'scheduled_service',
  jobCategory: 'recurring',
  status: 'scheduled',
  scheduledDate: new Date().toISOString(),
  scheduledStartTime: null,
  scheduledEndTime: null,
  actualStartTime: null,
  actualEndTime: null,
  estimatedHours: null,
  actualHours: null,
  notes: null,
  completionNotes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  contract: {
    id: 'contract-res-1',
    contractNumber: 'C-RES-001',
    title: 'Maple Residential Service',
  },
  facility: { id: 'property-1', name: 'Maple Street House' },
  account: { id: 'account-res-1', name: 'Maple Property Group' },
  assignedTeam: null,
  assignedToUser: null,
  createdByUser: { id: 'user-1', fullName: 'Sales Rep' },
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
    listOpportunitiesMock.mockResolvedValue({
      data: [opportunity],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    listAccountsMock.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 100, total: 0, totalPages: 1 },
    });
    listResidentialQuotesMock.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 100, total: 0, totalPages: 1 },
    });
    listContractsMock.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 100, total: 0, totalPages: 1 },
    });
    listJobsMock.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 100, total: 0, totalPages: 1 },
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

    expect(await screen.findByText(/opportunity pipeline/i)).toBeInTheDocument();
    await userEventInstance.click(screen.getByRole('button', { name: /walk through booked/i }));

    await waitFor(() => {
      expect(listLeadsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'walk_through_booked' })
      );
    });
  });

  it('includes residential properties in the shared opportunity pipeline', async () => {
    listAccountsMock.mockResolvedValue({
      data: [residentialAccount],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    listResidentialQuotesMock.mockResolvedValue({
      data: [residentialQuote],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    listContractsMock.mockResolvedValue({
      data: [residentialContract],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    listJobsMock.mockResolvedValue({
      data: [residentialJob],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });

    render(<LeadsList />);

    expect(await screen.findByText('2 active opportunities')).toBeInTheDocument();
    expect(listAccountsMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'residential' })
    );
    expect(listResidentialQuotesMock).toHaveBeenCalled();
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
    await userEventInstance.selectOptions(await screen.findByLabelText(/lead type/i), 'commercial');
    await userEventInstance.type(await screen.findByLabelText(/contact name/i), 'John Prospect');
    expect(screen.queryByLabelText(/assigned to/i)).not.toBeInTheDocument();
    await userEventInstance.click(screen.getByRole('button', { name: /create lead/i }));

    expect(createLeadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'commercial',
        contactName: 'John Prospect',
      })
    );
  });

  it('captures custom source when Others is selected', async () => {
    const userEventInstance = userEvent.setup();
    render(<LeadsList />);

    await userEventInstance.click(screen.getByRole('button', { name: /add new lead/i }));
    await userEventInstance.selectOptions(await screen.findByLabelText(/lead type/i), 'residential');
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
        type: 'residential',
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
