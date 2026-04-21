import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import ContractForm from '../contracts/ContractForm';
import type { Contract } from '../../types/contract';

let mockParams: { id?: string } = {};
let mockSearchParams = new URLSearchParams();
const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => navigateMock,
    useSearchParams: () => [mockSearchParams, vi.fn()],
  };
});

const getContractMock = vi.fn();
const updateContractMock = vi.fn();
const createContractFromProposalMock = vi.fn();
const listContractsMock = vi.fn();
const getProposalsAvailableForContractMock = vi.fn();
const getProposalMock = vi.fn();

vi.mock('../../lib/contracts', () => ({
  getContract: (...args: unknown[]) => getContractMock(...args),
  updateContract: (...args: unknown[]) => updateContractMock(...args),
  createContractFromProposal: (...args: unknown[]) => createContractFromProposalMock(...args),
  listContracts: (...args: unknown[]) => listContractsMock(...args),
}));

vi.mock('../../lib/proposals', () => ({
  getProposalsAvailableForContract: (...args: unknown[]) => getProposalsAvailableForContractMock(...args),
  getProposal: (...args: unknown[]) => getProposalMock(...args),
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
  title: 'Existing Draft Contract',
  status: 'draft',
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
  account: { id: 'account-1', name: 'Acme Corporation', type: 'commercial' },
  facility: null,
  proposal: { id: 'proposal-1', proposalNumber: 'PROP-001', title: 'Accepted Proposal' },
  approvedByUser: null,
  createdByUser: { id: 'user-1', fullName: 'Admin User', email: 'admin@example.com' },
};

describe('ContractForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = {};
    mockSearchParams = new URLSearchParams();
    navigateMock.mockReset();

    getProposalsAvailableForContractMock.mockResolvedValue([
      {
        id: 'proposal-1',
        proposalNumber: 'PROP-001',
        title: 'Accepted Proposal',
        totalAmount: '2500',
        acceptedAt: new Date().toISOString(),
        account: { id: 'account-1', name: 'Acme Corporation' },
        facility: { id: 'facility-1', name: 'HQ' },
      },
    ]);
    getProposalMock.mockResolvedValue({
      id: 'proposal-1',
      serviceFrequency: '5x_week',
      serviceSchedule: null,
      facility: { id: 'facility-1', name: 'HQ' },
      termsAndConditions: 'Standard terms',
      notes: 'Special note',
    });
    listContractsMock.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
    });
    getContractMock.mockResolvedValue(draftContract);
    updateContractMock.mockResolvedValue(draftContract);
    createContractFromProposalMock.mockResolvedValue({ id: 'contract-2' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads available proposals in create mode', async () => {
    render(<ContractForm />);

    expect(await screen.findByText('New Contract')).toBeInTheDocument();
    expect(await screen.findByText('Select Proposal')).toBeInTheDocument();
    expect(getProposalsAvailableForContractMock).toHaveBeenCalled();
  });

  it('creates contract from selected proposal', async () => {
    const user = userEvent.setup();
    render(<ContractForm />);

    await screen.findByText('New Contract');
    await user.selectOptions(
      await screen.findByLabelText(/accepted proposal/i),
      'proposal-1'
    );
    await user.click(screen.getByRole('button', { name: /create contract/i }));

    await waitFor(() => {
      expect(listContractsMock).toHaveBeenCalledWith({
        facilityId: 'facility-1',
        status: 'active',
        limit: 5,
      });
      expect(createContractFromProposalMock).toHaveBeenCalledWith(
        'proposal-1',
        expect.objectContaining({
          title: 'Accepted Proposal',
          paymentTerms: 'Net 30',
        })
      );
      expect(navigateMock).toHaveBeenCalledWith('/contracts');
    });
  });

  it('blocks contract creation when the service location already has an active contract', async () => {
    const user = userEvent.setup();
    listContractsMock.mockResolvedValue({
      data: [
        {
          ...draftContract,
          id: 'contract-9',
          contractNumber: 'CONT-202602-0009',
          status: 'active',
          facility: { id: 'facility-1', name: 'HQ' },
        },
      ],
      pagination: { page: 1, limit: 5, total: 1, totalPages: 1 },
    });

    render(<ContractForm />);

    await screen.findByText('New Contract');
    await user.selectOptions(
      await screen.findByLabelText(/accepted proposal/i),
      'proposal-1'
    );

    expect(await screen.findByText(/active contract already exists for this service location/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create contract/i })).toBeDisabled();
    expect(createContractFromProposalMock).not.toHaveBeenCalled();
  });

  it('updates existing draft contract in edit mode', async () => {
    const user = userEvent.setup();
    mockParams = { id: 'contract-1' };

    render(<ContractForm />);

    const titleInput = await screen.findByLabelText(/contract title/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Contract Title');
    await user.click(screen.getByRole('button', { name: /update contract/i }));

    await waitFor(() => {
      expect(updateContractMock).toHaveBeenCalledWith(
        'contract-1',
        expect.objectContaining({
          title: 'Updated Contract Title',
        })
      );
      expect(navigateMock).toHaveBeenCalledWith('/contracts');
    });
  });
});
