import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import ContractsList from '../contracts/ContractsList';
import type { Contract } from '../../types/contract';
import { useAuthStore } from '../../stores/authStore';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

const listContractsMock = vi.fn();
const archiveContractMock = vi.fn();
const restoreContractMock = vi.fn();
const updateContractStatusMock = vi.fn();

vi.mock('../../lib/contracts', () => ({
  listContracts: (...args: unknown[]) => listContractsMock(...args),
  archiveContract: (...args: unknown[]) => archiveContractMock(...args),
  restoreContract: (...args: unknown[]) => restoreContractMock(...args),
  updateContractStatus: (...args: unknown[]) => updateContractStatusMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const contract: Contract = {
  id: 'contract-1',
  contractNumber: 'CONT-202602-0001',
  title: 'Office Cleaning Agreement',
  status: 'draft',
  contractSource: 'proposal',
  renewedFromContractId: null,
  renewalNumber: 0,
  startDate: new Date('2026-02-01').toISOString(),
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
    id: 'user-1',
    fullName: 'Admin User',
    email: 'admin@example.com',
  },
};

describe('ContractsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockReset();
    useAuthStore.setState({
      user: { id: 'owner-1', email: 'owner@example.com', fullName: 'Owner User', role: 'owner' },
      token: 'token',
      refreshToken: null,
      isAuthenticated: true,
    });
    listContractsMock.mockResolvedValue({
      data: [contract],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    archiveContractMock.mockResolvedValue({ ...contract, archivedAt: new Date().toISOString() });
    restoreContractMock.mockResolvedValue(contract);
    updateContractStatusMock.mockResolvedValue({ ...contract, status: 'active' });
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders contracts from API', async () => {
    render(<ContractsList />);

    expect(await screen.findByText('CONT-202602-0001')).toBeInTheDocument();
    expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
  });

  it('archives a draft contract from row action', async () => {
    const user = userEvent.setup();
    render(<ContractsList />);

    const contractNumber = await screen.findByText('CONT-202602-0001');
    const row = contractNumber.closest('tr');
    expect(row).toBeTruthy();
    const rowButtons = within(row as HTMLElement).getAllByRole('button');
    await user.click(rowButtons[rowButtons.length - 1]);

    await waitFor(() => {
      expect(archiveContractMock).toHaveBeenCalledWith('contract-1');
    });
  });

  it('activates draft contract', async () => {
    const user = userEvent.setup();
    render(<ContractsList />);

    const activateButton = await screen.findByRole('button', { name: /activate/i });
    await user.click(activateButton);

    await waitFor(() => {
      expect(updateContractStatusMock).toHaveBeenCalledWith('contract-1', 'active');
    });
  });
});
