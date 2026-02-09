import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import ContractDetail from '../contracts/ContractDetail';
import type { Contract } from '../../types/contract';

let mockParams: { id?: string } = { id: 'contract-1' };
const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => navigateMock,
  };
});

const getContractMock = vi.fn();
const updateContractStatusMock = vi.fn();
const signContractMock = vi.fn();
const terminateContractMock = vi.fn();
const archiveContractMock = vi.fn();
const restoreContractMock = vi.fn();
const canRenewContractMock = vi.fn();
const renewContractMock = vi.fn();
const assignContractTeamMock = vi.fn();
const getContractActivitiesMock = vi.fn();
const listTeamsMock = vi.fn();

vi.mock('../../lib/contracts', () => ({
  getContract: (...args: unknown[]) => getContractMock(...args),
  updateContractStatus: (...args: unknown[]) => updateContractStatusMock(...args),
  signContract: (...args: unknown[]) => signContractMock(...args),
  terminateContract: (...args: unknown[]) => terminateContractMock(...args),
  archiveContract: (...args: unknown[]) => archiveContractMock(...args),
  restoreContract: (...args: unknown[]) => restoreContractMock(...args),
  canRenewContract: (...args: unknown[]) => canRenewContractMock(...args),
  renewContract: (...args: unknown[]) => renewContractMock(...args),
  assignContractTeam: (...args: unknown[]) => assignContractTeamMock(...args),
  getContractActivities: (...args: unknown[]) => getContractActivitiesMock(...args),
}));

vi.mock('../../lib/teams', () => ({
  listTeams: (...args: unknown[]) => listTeamsMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const draftContract: Contract = {
  id: 'contract-1',
  contractNumber: 'CONT-202602-0001',
  title: 'Office Cleaning Agreement',
  status: 'draft',
  contractSource: 'proposal',
  renewedFromContractId: null,
  renewalNumber: 0,
  startDate: '2026-02-01',
  endDate: null,
  serviceFrequency: 'monthly',
  serviceSchedule: null,
  autoRenew: false,
  renewalNoticeDays: 30,
  monthlyValue: 2500,
  totalValue: null,
  billingCycle: 'monthly',
  paymentTerms: 'Net 30',
  termsAndConditions: 'Standard terms',
  specialInstructions: 'Special instructions',
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
  account: { id: 'account-1', name: 'Acme Corporation', type: 'commercial' },
  facility: null,
  proposal: { id: 'proposal-1', proposalNumber: 'PROP-001', title: 'Proposal Title' },
  renewedFromContract: null,
  renewedToContract: null,
  approvedByUser: null,
  createdByUser: { id: 'user-1', fullName: 'Admin User', email: 'admin@example.com' },
};

describe('ContractDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { id: 'contract-1' };
    navigateMock.mockReset();
    getContractMock.mockResolvedValue(draftContract);
    updateContractStatusMock.mockResolvedValue({ ...draftContract, status: 'active' });
    archiveContractMock.mockResolvedValue({ ...draftContract, archivedAt: new Date().toISOString() });
    getContractActivitiesMock.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });
    listTeamsMock.mockResolvedValue({
      data: [{ id: 'team-1', name: 'Alpha Team' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders contract detail', async () => {
    render(<ContractDetail />);

    expect(await screen.findByText('CONT-202602-0001')).toBeInTheDocument();
    expect(screen.getByText('Office Cleaning Agreement')).toBeInTheDocument();
    expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
  });

  it('activates draft contract', async () => {
    const user = userEvent.setup();
    render(<ContractDetail />);

    await user.click(await screen.findByRole('button', { name: /activate/i }));

    await waitFor(() => {
      expect(updateContractStatusMock).toHaveBeenCalledWith('contract-1', 'active');
    });
  });

  it('archives draft contract', async () => {
    const user = userEvent.setup();
    render(<ContractDetail />);

    await user.click(await screen.findByRole('button', { name: /archive/i }));

    await waitFor(() => {
      expect(archiveContractMock).toHaveBeenCalledWith('contract-1');
    });
  });
});
