import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import AccountDetail from '../accounts/AccountDetail';
import type { Account, Appointment } from '../../types/crm';
import type { Facility } from '../../types/facility';
import type { Proposal } from '../../types/proposal';
import type { Contract } from '../../types/contract';
import type { User } from '../../types/user';
import { useAuthStore } from '../../stores/authStore';

let mockParams: { id?: string } = { id: 'account-1' };
let mockPathname = '/accounts/account-1';
const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
    useLocation: () => ({ pathname: mockPathname }),
    useNavigate: () => navigateMock,
  };
});

const getAccountMock = vi.fn();
const listAccountActivitiesMock = vi.fn();
const createAccountActivityMock = vi.fn();
const updateAccountMock = vi.fn();
const archiveAccountMock = vi.fn();
const restoreAccountMock = vi.fn();
const listFacilitiesMock = vi.fn();
const createFacilityMock = vi.fn();
const listUsersMock = vi.fn();
const listProposalsMock = vi.fn();
const listContractsMock = vi.fn();
const listContactsMock = vi.fn();
const listJobsMock = vi.fn();
const listResidentialQuotesMock = vi.fn();
const listAppointmentsMock = vi.fn();

vi.mock('../../lib/accounts', () => ({
  getAccount: (...args: unknown[]) => getAccountMock(...args),
  listAccountActivities: (...args: unknown[]) => listAccountActivitiesMock(...args),
  createAccountActivity: (...args: unknown[]) => createAccountActivityMock(...args),
  updateAccount: (...args: unknown[]) => updateAccountMock(...args),
  archiveAccount: (...args: unknown[]) => archiveAccountMock(...args),
  restoreAccount: (...args: unknown[]) => restoreAccountMock(...args),
}));

vi.mock('../../lib/facilities', () => ({
  listFacilities: (...args: unknown[]) => listFacilitiesMock(...args),
  createFacility: (...args: unknown[]) => createFacilityMock(...args),
}));

vi.mock('../../lib/users', () => ({
  listUsers: (...args: unknown[]) => listUsersMock(...args),
}));

vi.mock('../../lib/proposals', () => ({
  listProposals: (...args: unknown[]) => listProposalsMock(...args),
}));

vi.mock('../../lib/contracts', () => ({
  listContracts: (...args: unknown[]) => listContractsMock(...args),
}));

vi.mock('../../lib/contacts', () => ({
  listContacts: (...args: unknown[]) => listContactsMock(...args),
}));

vi.mock('../../lib/jobs', () => ({
  listJobs: (...args: unknown[]) => listJobsMock(...args),
}));

vi.mock('../../lib/appointments', () => ({
  listAppointments: (...args: unknown[]) => listAppointmentsMock(...args),
}));

vi.mock('../../lib/residential', () => ({
  listResidentialQuotes: (...args: unknown[]) => listResidentialQuotesMock(...args),
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
  website: 'https://acme.com',
  billingEmail: 'billing@acme.com',
  billingPhone: '123-456-7890',
  billingAddress: null,
  serviceAddress: null,
  qboCustomerId: null,
  taxId: null,
  paymentTerms: 'NET30',
  creditLimit: '10000',
  residentialProfile: null,
  notes: 'Priority client',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  archivedAt: null,
  accountManager: {
    id: 'user-1',
    fullName: 'Account Manager',
    email: 'manager@example.com',
  },
  createdByUser: {
    id: 'admin-1',
    fullName: 'Admin User',
  },
  _count: {
    contacts: 2,
    facilities: 1,
  },
};

const facility: Facility = {
  id: 'facility-1',
  name: 'Main Office',
  address: { city: 'Newport', state: 'CA' },
  squareFeet: '1000',
  buildingType: 'office',
  accessInstructions: null,
  parkingInfo: null,
  specialRequirements: null,
  status: 'active',
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  archivedAt: null,
  account: {
    id: 'account-1',
    name: 'Acme Corporation',
    type: 'commercial',
  },
  facilityManager: null,
  createdByUser: {
    id: 'admin-1',
    fullName: 'Admin User',
  },
  areas: [],
  _count: {
    areas: 1,
    facilityTasks: 1,
  },
};

const proposal: Proposal = {
  id: 'proposal-1',
  proposalNumber: 'PROP-001',
  title: 'Monthly Cleaning',
  status: 'draft',
  description: null,
  subtotal: 100,
  taxRate: 0,
  taxAmount: 0,
  totalAmount: 100,
  validUntil: null,
  sentAt: null,
  viewedAt: null,
  acceptedAt: null,
  rejectedAt: null,
  rejectionReason: null,
  notes: null,
  termsAndConditions: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  archivedAt: null,
  pricingStrategyKey: 'sqft_settings_v1',
  pricingStrategyVersion: '1.0.0',
  pricingSnapshot: null,
  pricingLocked: false,
  pricingLockedAt: null,
  account: {
    id: 'account-1',
    name: 'Acme Corporation',
    type: 'commercial',
  },
  facility: null,
  createdByUser: {
    id: 'admin-1',
    fullName: 'Admin User',
    email: 'admin@example.com',
  },
  proposalItems: [],
  proposalServices: [],
};

const contract: Contract = {
  id: 'contract-1',
  contractNumber: 'CONT-001',
  title: 'Cleaning Contract',
  status: 'draft',
  renewalNumber: 0,
  startDate: new Date().toISOString(),
  endDate: null,
  serviceFrequency: 'monthly',
  serviceSchedule: null,
  autoRenew: false,
  renewalNoticeDays: 30,
  monthlyValue: 500,
  totalValue: null,
  billingCycle: 'monthly',
  paymentTerms: 'Net 30',
  residentialServiceType: null,
  residentialFrequency: null,
  termsAndConditions: null,
  specialInstructions: null,
  signedDocumentUrl: null,
  signedDate: null,
  signedByName: null,
  signedByEmail: null,
  approvedAt: null,
  terminationReason: null,
  terminatedAt: null,
  includesInitialClean: true,
  initialCleanCompleted: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  archivedAt: null,
  account: {
    id: 'account-1',
    name: 'Acme Corporation',
    type: 'commercial',
  },
  facility: null,
  proposal: null,
  approvedByUser: null,
  createdByUser: {
    id: 'admin-1',
    fullName: 'Admin User',
    email: 'admin@example.com',
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

const upcomingAppointment: Appointment = {
  id: 'appt-upcoming',
  type: 'walk_through',
  status: 'scheduled',
  scheduledStart: '2026-04-18T16:00:00.000Z',
  scheduledEnd: '2026-04-18T17:00:00.000Z',
  timezone: 'America/Los_Angeles',
  location: null,
  notes: null,
  completionNotes: null,
  actualDuration: null,
  completedAt: null,
  reminderSentAt: null,
  rescheduledFromId: null,
  lead: null,
  account: {
    id: 'account-1',
    name: 'Acme Corporation',
    type: 'commercial',
  },
  facility: { id: 'facility-1', name: 'Main Office' },
  assignedToUser: { id: 'user-1', fullName: 'Account Manager', email: 'manager@example.com' },
  assignedTeam: null,
  createdByUser: { id: 'admin-1', fullName: 'Admin User' },
  inspectionId: null,
  inspection: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const completedAppointment: Appointment = {
  ...upcomingAppointment,
  id: 'appt-complete',
  status: 'completed',
  scheduledStart: '2026-04-10T16:00:00.000Z',
  scheduledEnd: '2026-04-10T17:00:00.000Z',
  completedAt: '2026-04-10T17:00:00.000Z',
};

describe('AccountDetail', () => {
  beforeEach(() => {
    mockParams = { id: 'account-1' };
    mockPathname = '/accounts/account-1';
    navigateMock.mockReset();
    useAuthStore.setState({
      user: { id: 'owner-1', email: 'owner@example.com', fullName: 'Owner User', role: 'owner' },
      token: 'token',
      refreshToken: null,
      isAuthenticated: true,
    });

    getAccountMock.mockResolvedValue(account);
    updateAccountMock.mockResolvedValue(account);
    archiveAccountMock.mockResolvedValue({ ...account, archivedAt: new Date().toISOString() });
    restoreAccountMock.mockResolvedValue(account);
    createFacilityMock.mockResolvedValue(facility);
    listAccountActivitiesMock.mockResolvedValue({
      data: [
        {
          id: 'activity-1',
          entryType: 'request',
          note: 'Client requested morning shift.',
          createdAt: new Date().toISOString(),
          performedByUser: {
            id: 'user-1',
            fullName: 'Account Manager',
            email: 'manager@example.com',
          },
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
    });
    createAccountActivityMock.mockResolvedValue({
      id: 'activity-2',
      entryType: 'complaint',
      note: 'Client reported missed trash bins.',
      createdAt: new Date().toISOString(),
      performedByUser: {
        id: 'user-1',
        fullName: 'Account Manager',
        email: 'manager@example.com',
      },
    });
    listUsersMock.mockResolvedValue({ data: [user], pagination: { page: 1, limit: 100, total: 1, totalPages: 1 } });
    listFacilitiesMock.mockResolvedValue({ data: [facility], pagination: { page: 1, limit: 100, total: 1, totalPages: 1 } });
    listProposalsMock.mockResolvedValue({ data: [proposal], pagination: { page: 1, limit: 5, total: 1, totalPages: 1 } });
    listContractsMock.mockResolvedValue({ data: [contract], pagination: { page: 1, limit: 5, total: 1, totalPages: 1 } });
    listContactsMock.mockResolvedValue({ data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } });
    listJobsMock.mockResolvedValue({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
    listResidentialQuotesMock.mockResolvedValue({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
    listAppointmentsMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders account details and related records', async () => {
    const userEventInstance = userEvent.setup();
    listAppointmentsMock.mockResolvedValue([upcomingAppointment, completedAppointment]);
    render(<AccountDetail />);

    expect(await screen.findByRole('heading', { name: 'Acme Corporation' })).toBeInTheDocument();
    // Overview tab (default) shows facilities and financials
    expect(screen.getByText('Main Office')).toBeInTheDocument();
    expect(screen.getByText('PROP-001')).toBeInTheDocument();
    expect(screen.getByText('CONT-001')).toBeInTheDocument();

    // Service tab shows bookings
    await userEventInstance.click(screen.getByRole('button', { name: /^service$/i }));
    expect(screen.getByRole('heading', { name: /bookings/i })).toBeInTheDocument();
    expect(screen.getAllByText('Walkthrough').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Apr 18, 2026').length).toBeGreaterThan(0);

    // History tab shows activities
    await userEventInstance.click(screen.getByRole('button', { name: /^history$/i }));
    expect(screen.getByText('Client requested morning shift.')).toBeInTheDocument();
  });

  it('updates account from edit modal', async () => {
    const userEventInstance = userEvent.setup();
    render(<AccountDetail />);

    await screen.findByRole('heading', { name: 'Acme Corporation' });
    await userEventInstance.click(screen.getByRole('button', { name: /^edit$/i }));

    const accountNameInput = await screen.findByLabelText(/account name/i);
    await userEventInstance.clear(accountNameInput);
    await userEventInstance.type(accountNameInput, 'Acme Updated');

    await userEventInstance.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(updateAccountMock).toHaveBeenCalledWith(
        'account-1',
        expect.objectContaining({ name: 'Acme Updated' })
      );
    });
  });

  it('adds account history note', async () => {
    const userEventInstance = userEvent.setup();
    render(<AccountDetail />);

    await screen.findByRole('heading', { name: 'Acme Corporation' });
    await userEventInstance.click(screen.getByRole('button', { name: /^history$/i }));
    await userEventInstance.selectOptions(screen.getByLabelText(/entry type/i), 'complaint');
    await userEventInstance.type(
      screen.getByPlaceholderText(/log customer call, request, complaint/i),
      'Client reported missed trash bins.'
    );
    await userEventInstance.click(screen.getByRole('button', { name: /add history note/i }));

    await waitFor(() => {
      expect(createAccountActivityMock).toHaveBeenCalledWith(
        'account-1',
        expect.objectContaining({
          entryType: 'complaint',
          note: 'Client reported missed trash bins.',
        })
      );
    });
  });

  it('shows assigned team for active contracts', async () => {
    const userEventInstance = userEvent.setup();
    const activeContract: Contract = {
      ...contract,
      status: 'active',
      assignedTeam: {
        id: 'team-1',
        name: 'Alpha Team',
        contactName: null,
        contactEmail: null,
        contactPhone: null,
      },
    };
    listContractsMock.mockResolvedValue({
      data: [activeContract],
      pagination: { page: 1, limit: 5, total: 1, totalPages: 1 },
    });

    render(<AccountDetail />);

    const alphaTeamElements = await screen.findAllByText('Alpha Team');
    expect(alphaTeamElements.length).toBeGreaterThan(0);

    await userEventInstance.click(screen.getByRole('button', { name: /^edit$/i }));
    expect(await screen.findByLabelText(/assigned team/i)).toHaveValue('Alpha Team');
  });

  it('does not show a square feet field when adding a facility from the account page', async () => {
    const userEventInstance = userEvent.setup();
    render(<AccountDetail />);

    await screen.findByRole('heading', { name: 'Acme Corporation' });
    await userEventInstance.click(screen.getByRole('button', { name: /add facility/i }));

    expect(screen.queryByLabelText(/square feet/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/total square feet will be auto-calculated from the areas added to this facility/i)
    ).toBeInTheDocument();
  });

  it('limits service day selection to the chosen facility frequency on the account add-facility modal', async () => {
    const userEventInstance = userEvent.setup();
    render(<AccountDetail />);

    await screen.findByRole('heading', { name: 'Acme Corporation' });
    await userEventInstance.click(screen.getByRole('button', { name: /add facility/i }));
    await userEventInstance.selectOptions(await screen.findByLabelText(/service frequency/i), '3x_week');

    const monday = screen.getByLabelText(/mon/i) as HTMLInputElement;
    const wednesday = screen.getByLabelText(/wed/i) as HTMLInputElement;
    const friday = screen.getByLabelText(/fri/i) as HTMLInputElement;
    const sunday = screen.getByLabelText(/sun/i) as HTMLInputElement;

    expect(monday.checked).toBe(true);
    expect(wednesday.checked).toBe(true);
    expect(friday.checked).toBe(true);
    expect(sunday.disabled).toBe(true);

    await userEventInstance.click(friday);
    expect(sunday.disabled).toBe(false);
  });

  it('shows the residential journey state for residential accounts', async () => {
    mockPathname = '/residential/accounts/account-res-1';
    const residentialAccount: Account = {
      ...account,
      id: 'account-res-1',
      name: 'Jane Doe Residence',
      type: 'residential',
      industry: null,
      website: null,
      creditLimit: null,
      serviceAddress: {
        street: '123 Pine St',
        city: 'Vancouver',
        state: 'BC',
        postalCode: 'V6B 1A1',
      },
      residentialProfile: {
        homeType: 'single_family',
        squareFeet: 1800,
        bedrooms: 3,
        fullBathrooms: 2,
        halfBathrooms: 1,
        levels: 2,
        occupiedStatus: 'occupied',
        condition: 'standard',
        hasPets: true,
        lastProfessionalCleaning: null,
        parkingAccess: 'Driveway',
        entryNotes: 'Keypad on side door',
        specialInstructions: null,
        isFirstVisit: true,
      },
      _count: {
        contacts: 1,
        facilities: 0,
      },
    };

    getAccountMock.mockResolvedValue(residentialAccount);
    listFacilitiesMock.mockResolvedValue({ data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } });
    listContractsMock
      .mockResolvedValueOnce({ data: [], pagination: { page: 1, limit: 5, total: 0, totalPages: 0 } })
      .mockResolvedValueOnce({ data: [], pagination: { page: 1, limit: 1, total: 0, totalPages: 0 } });
    listResidentialQuotesMock.mockResolvedValue({
      data: [
        {
          id: 'rq-1',
          quoteNumber: 'RQ-20260321-0001',
          title: 'Biweekly Home Cleaning',
          status: 'accepted',
          accountId: 'account-res-1',
          serviceType: 'recurring_standard',
          frequency: 'biweekly',
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
          customerPhone: '1234567890',
          homeAddress: residentialAccount.serviceAddress,
          homeProfile: residentialAccount.residentialProfile!,
          pricingPlan: null,
          subtotal: 240,
          addOnTotal: 0,
          recurringDiscount: 0,
          firstCleanSurcharge: 0,
          totalAmount: 240,
          estimatedHours: 4,
          confidenceLevel: 'high',
          manualReviewRequired: false,
          manualReviewReasons: [],
          preferredStartDate: null,
          notes: null,
          sentAt: null,
          viewedAt: null,
          acceptedAt: new Date().toISOString(),
          declinedAt: null,
          declineReason: null,
          convertedAt: null,
          convertedContractId: null,
          signatureName: null,
          signatureDate: null,
          publicToken: null,
          publicTokenExpiresAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          archivedAt: null,
          account: {
            id: 'account-res-1',
            name: 'Jane Doe Residence',
            type: 'residential',
            billingEmail: 'jane@example.com',
            billingPhone: '1234567890',
            billingAddress: null,
            serviceAddress: residentialAccount.serviceAddress,
            residentialProfile: residentialAccount.residentialProfile,
          },
          addOns: [],
          createdByUser: {
            id: 'owner-1',
            fullName: 'Owner User',
            email: 'owner@example.com',
          },
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    render(<AccountDetail />);

    expect(await screen.findByRole('heading', { name: 'Jane Doe Residence' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /residential journey/i })).toBeInTheDocument();
    expect(screen.getAllByText('Quote Accepted').length).toBeGreaterThan(0);
    expect(screen.getByText(/convert the accepted quote into a residential contract/i)).toBeInTheDocument();
  });

  it('shows review-required residential journey stages when approval is needed', async () => {
    mockPathname = '/residential/accounts/account-res-review';
    const residentialAccount: Account = {
      ...account,
      id: 'account-res-review',
      name: 'Review Household',
      type: 'residential',
      industry: null,
      website: null,
      creditLimit: null,
      serviceAddress: {
        street: '55 Cedar Ave',
        city: 'Vancouver',
        state: 'BC',
        postalCode: 'V6C 1A1',
      },
      residentialProfile: {
        homeType: 'single_family',
        squareFeet: 3200,
        bedrooms: 4,
        fullBathrooms: 3,
        halfBathrooms: 1,
        levels: 2,
        occupiedStatus: 'occupied',
        condition: 'heavy',
        hasPets: true,
        lastProfessionalCleaning: null,
        parkingAccess: 'Garage',
        entryNotes: 'Ring bell first',
        specialInstructions: null,
        isFirstVisit: true,
      },
      _count: {
        contacts: 1,
        facilities: 0,
      },
    };

    getAccountMock.mockResolvedValue(residentialAccount);
    listFacilitiesMock.mockResolvedValue({ data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } });
    listContractsMock
      .mockResolvedValueOnce({ data: [], pagination: { page: 1, limit: 5, total: 0, totalPages: 0 } })
      .mockResolvedValueOnce({ data: [], pagination: { page: 1, limit: 1, total: 0, totalPages: 0 } });
    listResidentialQuotesMock.mockResolvedValue({
      data: [
        {
          id: 'rq-review',
          quoteNumber: 'RQ-20260324-0001',
          title: 'Deep Clean Review',
          status: 'review_required',
          accountId: 'account-res-review',
          serviceType: 'deep_clean',
          frequency: 'one_time',
          customerName: 'Review Household',
          customerEmail: 'review@example.com',
          customerPhone: '1234567890',
          homeAddress: residentialAccount.serviceAddress,
          homeProfile: residentialAccount.residentialProfile!,
          pricingPlan: null,
          subtotal: 420,
          addOnTotal: 0,
          recurringDiscount: 0,
          firstCleanSurcharge: 0,
          totalAmount: 420,
          estimatedHours: 7,
          confidenceLevel: 'medium',
          manualReviewRequired: true,
          manualReviewReasons: ['Heavy condition requires review'],
          preferredStartDate: null,
          notes: null,
          sentAt: null,
          viewedAt: null,
          acceptedAt: null,
          declinedAt: null,
          declineReason: null,
          convertedAt: null,
          convertedContractId: null,
          signatureName: null,
          signatureDate: null,
          publicToken: null,
          publicTokenExpiresAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          archivedAt: null,
          account: {
            id: 'account-res-review',
            name: 'Review Household',
            type: 'residential',
            billingEmail: 'review@example.com',
            billingPhone: '1234567890',
            billingAddress: null,
            serviceAddress: residentialAccount.serviceAddress,
            residentialProfile: residentialAccount.residentialProfile,
          },
          addOns: [],
          createdByUser: {
            id: 'owner-1',
            fullName: 'Owner User',
            email: 'owner@example.com',
          },
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    render(<AccountDetail />);

    expect(await screen.findByRole('heading', { name: 'Review Household' })).toBeInTheDocument();
    expect(screen.getAllByText('Review Required').length).toBeGreaterThan(0);
    expect(screen.getByText(/get internal approval before sending the residential quote to the client/i)).toBeInTheDocument();
  });

  it('shows the commercial journey state for commercial accounts', async () => {
    listContractsMock
      .mockResolvedValueOnce({ data: [contract], pagination: { page: 1, limit: 5, total: 1, totalPages: 1 } })
      .mockResolvedValueOnce({ data: [], pagination: { page: 1, limit: 1, total: 0, totalPages: 0 } });

    render(<AccountDetail />);

    expect(await screen.findByRole('heading', { name: 'Acme Corporation' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /commercial journey/i })).toBeInTheDocument();
    expect(await screen.findAllByText('Proposal Draft')).not.toHaveLength(0);
    expect(screen.getByText(/finish pricing and send the proposal to the client/i)).toBeInTheDocument();
  });

  it('shows the residential service summary for active residential accounts', async () => {
    mockPathname = '/residential/accounts/account-res-2';
    const residentialAccount: Account = {
      ...account,
      id: 'account-res-2',
      name: 'Oak Household',
      type: 'residential',
      industry: null,
      website: null,
      creditLimit: null,
      serviceAddress: {
        street: '12 Oak Street',
        city: 'Newport',
        state: 'CA',
        postalCode: '92660',
      },
      residentialProfile: {
        homeType: 'single_family',
        squareFeet: 2400,
        bedrooms: 4,
        fullBathrooms: 3,
        halfBathrooms: 1,
        levels: 2,
        occupiedStatus: 'occupied',
        condition: 'standard',
        hasPets: true,
        lastProfessionalCleaning: null,
        parkingAccess: 'Driveway',
        entryNotes: 'Use side gate',
        specialInstructions: null,
        isFirstVisit: false,
      },
      _count: {
        contacts: 1,
        facilities: 0,
      },
    };

    getAccountMock.mockResolvedValue(residentialAccount);
    listFacilitiesMock.mockResolvedValue({ data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } });
    listContractsMock
      .mockResolvedValueOnce({
        data: [{
          ...contract,
          status: 'active',
          account: {
            id: 'account-res-2',
            name: 'Oak Household',
            type: 'residential',
          },
          residentialServiceType: 'recurring_standard',
          residentialFrequency: 'weekly',
          assignedToUser: {
            id: 'user-1',
            fullName: 'Account Manager',
            email: 'manager@example.com',
          },
        }],
        pagination: { page: 1, limit: 5, total: 1, totalPages: 1 },
      })
      .mockResolvedValueOnce({
        data: [{
          ...contract,
          status: 'active',
          account: {
            id: 'account-res-2',
            name: 'Oak Household',
            type: 'residential',
          },
          residentialServiceType: 'recurring_standard',
          residentialFrequency: 'weekly',
          assignedToUser: {
            id: 'user-1',
            fullName: 'Account Manager',
            email: 'manager@example.com',
          },
        }],
        pagination: { page: 1, limit: 1, total: 1, totalPages: 1 },
      });
    listResidentialQuotesMock.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });
    listJobsMock.mockResolvedValue({
      data: [
        {
          id: 'job-upcoming',
          jobNumber: 'JOB-100',
          jobType: 'scheduled_service',
          jobCategory: 'recurring',
          status: 'scheduled',
          scheduledDate: '2026-04-15T12:00:00.000Z',
          scheduledStartTime: '09:00',
          scheduledEndTime: '11:00',
          actualStartTime: null,
          actualEndTime: null,
          estimatedHours: '2',
          actualHours: null,
          notes: null,
          completionNotes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          contract: {
            id: 'contract-1',
            contractNumber: 'CONT-001',
            title: 'Cleaning Contract',
          },
          facility: {
            id: 'facility-1',
            name: 'Oak Residence',
          },
          account: {
            id: 'account-res-2',
            name: 'Oak Household',
          },
          assignedTeam: null,
          assignedToUser: {
            id: 'user-1',
            fullName: 'Account Manager',
            email: 'manager@example.com',
          },
          createdByUser: {
            id: 'admin-1',
            fullName: 'Admin User',
          },
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    render(<AccountDetail />);

    await screen.findByRole('heading', { name: 'Oak Household' });
    const userEventInstance = userEvent.setup();
    await userEventInstance.click(screen.getByRole('button', { name: /^service$/i }));
    expect(await screen.findByRole('heading', { name: /service details/i })).toBeInTheDocument();
    expect(screen.getByText('Recurring Standard')).toBeInTheDocument();
    expect(screen.getByText('Weekly')).toBeInTheDocument();
    expect(screen.getAllByText('Apr 15, 2026').length).toBeGreaterThan(0);
    expect(screen.getByText('9:00 AM - 11:00 AM')).toBeInTheDocument();
    expect(screen.getByText('Account Manager')).toBeInTheDocument();
  });

  it('redirects residential accounts to the residential account route', async () => {
    const residentialAccount: Account = {
      ...account,
      id: 'account-res-3',
      name: 'Cedar Residence',
      type: 'residential',
      serviceAddress: {
        street: '10 Cedar Street',
        city: 'Portland',
        state: 'OR',
        postalCode: '97201',
      },
      residentialProfile: {
        homeType: 'single_family',
        squareFeet: 1500,
        bedrooms: 3,
        fullBathrooms: 2,
        halfBathrooms: 0,
        levels: 2,
        occupiedStatus: 'occupied',
        condition: 'standard',
        hasPets: false,
        lastProfessionalCleaning: null,
        parkingAccess: null,
        entryNotes: null,
        specialInstructions: null,
        isFirstVisit: false,
      },
      _count: {
        contacts: 1,
        facilities: 0,
      },
    };

    mockParams = { id: 'account-res-3' };
    mockPathname = '/accounts/account-res-3';
    getAccountMock.mockResolvedValue(residentialAccount);
    listFacilitiesMock.mockResolvedValue({ data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } });
    listResidentialQuotesMock.mockResolvedValue({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });

    render(<AccountDetail />);

    await screen.findByRole('heading', { name: 'Cedar Residence' });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/residential/accounts/account-res-3', { replace: true });
    });
  });

  it('navigates residential property cards to the property detail flow', async () => {
    mockParams = { id: 'account-res-4' };
    mockPathname = '/residential/accounts/account-res-4';

    const residentialAccount: Account = {
      ...account,
      id: 'account-res-4',
      name: 'Birch Residence',
      type: 'residential',
      industry: null,
      website: null,
      creditLimit: null,
      serviceAddress: {
        street: '44 Birch Lane',
        city: 'Seattle',
        state: 'WA',
        postalCode: '98101',
      },
      residentialProfile: {
        homeType: 'single_family',
        squareFeet: 1900,
        bedrooms: 3,
        fullBathrooms: 2,
        halfBathrooms: 1,
        levels: 2,
        occupiedStatus: 'occupied',
        condition: 'standard',
        hasPets: false,
        lastProfessionalCleaning: null,
        parkingAccess: 'Driveway',
        entryNotes: 'Front door keypad',
        specialInstructions: null,
        isFirstVisit: false,
      },
      residentialProperties: [
        {
          id: 'property-1',
          accountId: 'account-res-4',
          name: 'Birch Main Home',
          serviceAddress: {
            street: '44 Birch Lane',
            city: 'Seattle',
            state: 'WA',
            postalCode: '98101',
          },
          homeProfile: {
            homeType: 'single_family',
            squareFeet: 1900,
            bedrooms: 3,
            fullBathrooms: 2,
            halfBathrooms: 1,
            levels: 2,
            occupiedStatus: 'occupied',
            condition: 'standard',
            hasPets: false,
            lastProfessionalCleaning: null,
            parkingAccess: 'Driveway',
            entryNotes: 'Front door keypad',
            specialInstructions: null,
            isFirstVisit: false,
          },
          defaultTasks: ['Vacuum floors'],
          accessNotes: 'Alarm code in CRM',
          parkingAccess: 'Driveway',
          entryNotes: 'Front door keypad',
          pets: false,
          isPrimary: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          archivedAt: null,
        },
      ],
      _count: {
        contacts: 1,
        facilities: 0,
      },
    };

    getAccountMock.mockResolvedValue(residentialAccount);
    listFacilitiesMock.mockResolvedValue({ data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } });
    listContractsMock
      .mockResolvedValueOnce({ data: [], pagination: { page: 1, limit: 5, total: 0, totalPages: 0 } })
      .mockResolvedValueOnce({ data: [], pagination: { page: 1, limit: 1, total: 0, totalPages: 0 } });
    listResidentialQuotesMock.mockResolvedValue({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });

    const userEventInstance = userEvent.setup();
    render(<AccountDetail />);

    await screen.findByRole('heading', { name: 'Birch Residence' });
    await userEventInstance.click(screen.getAllByRole('button', { name: /^open$/i })[0]);

    expect(navigateMock).toHaveBeenCalledWith('/properties/property-1', {
      state: {
        backLabel: 'Birch Residence',
        backPath: '/residential/accounts/account-res-4',
      },
    });
  });
});
