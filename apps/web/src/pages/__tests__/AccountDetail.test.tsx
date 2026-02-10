import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import AccountDetail from '../accounts/AccountDetail';
import type { Account } from '../../types/crm';
import type { Facility } from '../../types/facility';
import type { Proposal } from '../../types/proposal';
import type { Contract } from '../../types/contract';
import type { User } from '../../types/user';
import { useAuthStore } from '../../stores/authStore';

let mockParams: { id?: string } = { id: 'account-1' };
const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
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
  qboCustomerId: null,
  taxId: null,
  paymentTerms: 'NET30',
  creditLimit: '10000',
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
  contractSource: 'proposal',
  renewedFromContractId: null,
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
  renewedFromContract: null,
  renewedToContract: null,
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

describe('AccountDetail', () => {
  beforeEach(() => {
    mockParams = { id: 'account-1' };
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders account details and related records', async () => {
    render(<AccountDetail />);

    expect(await screen.findByRole('heading', { name: 'Acme Corporation' })).toBeInTheDocument();
    expect(screen.getByText('Client requested morning shift.')).toBeInTheDocument();
    expect(screen.getByText('Main Office')).toBeInTheDocument();
    expect(screen.getByText('PROP-001')).toBeInTheDocument();
    expect(screen.getByText('CONT-001')).toBeInTheDocument();
  });

  it('updates account from edit modal', async () => {
    const userEventInstance = userEvent.setup();
    render(<AccountDetail />);

    await screen.findByRole('heading', { name: 'Acme Corporation' });
    await userEventInstance.click(screen.getByRole('button', { name: /edit account/i }));

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
    listContractsMock.mockResolvedValueOnce({
      data: [activeContract],
      pagination: { page: 1, limit: 5, total: 1, totalPages: 1 },
    });

    render(<AccountDetail />);

    expect(await screen.findByText('Team: Alpha Team')).toBeInTheDocument();
  });
});
