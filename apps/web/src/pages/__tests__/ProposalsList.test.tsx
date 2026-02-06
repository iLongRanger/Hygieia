import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import ProposalsList from '../proposals/ProposalsList';

const listProposalsMock = vi.fn();
const archiveProposalMock = vi.fn();
const restoreProposalMock = vi.fn();
const sendProposalMock = vi.fn();
const acceptProposalMock = vi.fn();
const rejectProposalMock = vi.fn();

vi.mock('../../lib/proposals', () => ({
  listProposals: (...args: unknown[]) => listProposalsMock(...args),
  archiveProposal: (...args: unknown[]) => archiveProposalMock(...args),
  restoreProposal: (...args: unknown[]) => restoreProposalMock(...args),
  sendProposal: (...args: unknown[]) => sendProposalMock(...args),
  acceptProposal: (...args: unknown[]) => acceptProposalMock(...args),
  rejectProposal: (...args: unknown[]) => rejectProposalMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const baseProposal = {
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
  createdAt: new Date('2026-02-01T00:00:00Z').toISOString(),
  updatedAt: new Date('2026-02-01T00:00:00Z').toISOString(),
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

describe('ProposalsList', () => {
  beforeEach(() => {
    listProposalsMock.mockResolvedValue({
      data: [baseProposal],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    archiveProposalMock.mockResolvedValue({});
    restoreProposalMock.mockResolvedValue({});
    sendProposalMock.mockResolvedValue({});
    acceptProposalMock.mockResolvedValue({});
    rejectProposalMock.mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders proposals from the API', async () => {
    render(<ProposalsList />);

    expect(await screen.findByText('Cleaning Services')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(listProposalsMock).toHaveBeenCalled();
  });

  it('sends a draft proposal when confirmed', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<ProposalsList />);

    const sendButton = await screen.findByTitle('Send Proposal');
    await user.click(sendButton);

    expect(sendProposalMock).toHaveBeenCalledWith('proposal-1');
    confirmSpy.mockRestore();
  });
});
