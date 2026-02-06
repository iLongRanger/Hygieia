import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import ProposalDetail from '../proposals/ProposalDetail';
import type { Proposal } from '../../types/proposal';

let mockParams: { id?: string } = { id: 'proposal-1' };
const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => navigateMock,
  };
});

const getProposalMock = vi.fn();
const sendProposalMock = vi.fn();
const acceptProposalMock = vi.fn();
const rejectProposalMock = vi.fn();
const archiveProposalMock = vi.fn();
const restoreProposalMock = vi.fn();
const deleteProposalMock = vi.fn();

vi.mock('../../lib/proposals', () => ({
  getProposal: (...args: unknown[]) => getProposalMock(...args),
  sendProposal: (...args: unknown[]) => sendProposalMock(...args),
  acceptProposal: (...args: unknown[]) => acceptProposalMock(...args),
  rejectProposal: (...args: unknown[]) => rejectProposalMock(...args),
  archiveProposal: (...args: unknown[]) => archiveProposalMock(...args),
  restoreProposal: (...args: unknown[]) => restoreProposalMock(...args),
  deleteProposal: (...args: unknown[]) => deleteProposalMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const proposal: Proposal = {
  id: 'proposal-1',
  proposalNumber: 'PROP-001',
  title: 'Cleaning Services',
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
    name: 'Acme Corp',
    type: 'commercial',
  },
  facility: null,
  createdByUser: {
    id: 'user-1',
    fullName: 'Admin User',
    email: 'admin@example.com',
  },
  proposalItems: [],
  proposalServices: [],
};

describe('ProposalDetail', () => {
  beforeEach(() => {
    mockParams = { id: 'proposal-1' };
    navigateMock.mockReset();
    getProposalMock.mockResolvedValue(proposal);
    sendProposalMock.mockResolvedValue(proposal);
    deleteProposalMock.mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders proposal detail', async () => {
    render(<ProposalDetail />);

    expect(await screen.findByText('Cleaning Services')).toBeInTheDocument();
    expect(screen.getByText('PROP-001')).toBeInTheDocument();
  });

  it('sends proposal when confirmed', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<ProposalDetail />);

    const sendButton = await screen.findByRole('button', { name: /send/i });
    await user.click(sendButton);

    expect(sendProposalMock).toHaveBeenCalledWith('proposal-1');
    confirmSpy.mockRestore();
  });

  it('deletes proposal when confirmed', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<ProposalDetail />);

    const deleteButton = await screen.findByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    expect(deleteProposalMock).toHaveBeenCalledWith('proposal-1');
    expect(navigateMock).toHaveBeenCalledWith('/proposals');
    confirmSpy.mockRestore();
  });
});
