import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import ProposalsList from '../proposals/ProposalsList';
import { useAuthStore } from '../../stores/authStore';

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
  downloadProposalPdf: vi.fn().mockResolvedValue(undefined),
  remindProposal: vi.fn().mockResolvedValue(undefined),
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
    useAuthStore.setState({
      user: { id: 'owner-1', email: 'owner@example.com', fullName: 'Owner User', role: 'owner' },
      token: 'token',
      refreshToken: null,
      isAuthenticated: true,
    });
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

  it('opens send modal when send button clicked', async () => {
    const user = userEvent.setup();

    render(<ProposalsList />);

    const sendButton = await screen.findByTitle('Send Proposal');
    await user.click(sendButton);

    // Modal should be open with the "Send Proposal" heading
    expect(await screen.findByRole('heading', { name: /send proposal/i })).toBeInTheDocument();
  });
});
