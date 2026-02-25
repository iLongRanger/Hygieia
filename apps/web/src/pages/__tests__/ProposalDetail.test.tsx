import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import ProposalDetail from '../proposals/ProposalDetail';
import type { Proposal } from '../../types/proposal';
import { useAuthStore } from '../../stores/authStore';

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
  getProposalVersions: vi.fn().mockResolvedValue([]),
  getProposalVersion: vi.fn().mockResolvedValue(null),
  getProposalActivities: vi.fn().mockResolvedValue({ data: [], pagination: {} }),
  remindProposal: vi.fn().mockResolvedValue(undefined),
  downloadProposalPdf: vi.fn().mockResolvedValue(undefined),
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
    useAuthStore.setState({
      user: { id: 'owner-1', email: 'owner@example.com', fullName: 'Owner User', role: 'owner' },
      token: 'token',
      refreshToken: null,
      isAuthenticated: true,
    });
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

  it('opens send modal when send button clicked', async () => {
    const user = userEvent.setup();

    render(<ProposalDetail />);

    // Click the Send button in the action bar
    const sendButton = await screen.findByRole('button', { name: /send/i });
    await user.click(sendButton);

    // Modal should be open — the heading "Send Proposal" appears
    expect(screen.getByRole('heading', { name: /send proposal/i })).toBeInTheDocument();
  });

  it('deletes proposal when confirmed via dropdown menu', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<ProposalDetail />);

    // Wait for page to render
    await screen.findByText('Cleaning Services');

    // Find and click the MoreHorizontal dropdown button (the one with no text content in the actions bar)
    const actionsDiv = screen.getByText('Edit').closest('div.flex.items-center.gap-2');
    const actionButtons = actionsDiv!.querySelectorAll('button');
    // The more menu button is the last button in the actions area
    const menuButton = actionButtons[actionButtons.length - 1];
    await user.click(menuButton);

    // Click Delete in the dropdown
    const deleteOption = await screen.findByText('Delete');
    await user.click(deleteOption);

    expect(deleteProposalMock).toHaveBeenCalledWith('proposal-1');
    expect(navigateMock).toHaveBeenCalledWith('/proposals');
    confirmSpy.mockRestore();
  });

  it('renders tasks grouped by frequency category', async () => {
    getProposalMock.mockResolvedValueOnce({
      ...proposal,
      proposalServices: [
        {
          id: 'service-1',
          serviceName: 'Main Floor',
          serviceType: 'weekly',
          frequency: 'weekly',
          estimatedHours: null,
          hourlyRate: null,
          monthlyPrice: 500,
          description:
            '1000 sq ft tile floor\nDaily: Empty trash\nWeekly: Mop floors\nAs Needed: Spot clean walls\nAnnual: Strip and wax',
          includedTasks: ['Daily: Empty trash', 'Weekly: Mop floors', 'As Needed: Spot clean walls', 'Annual: Strip and wax'],
          sortOrder: 0,
        },
      ],
    });

    render(<ProposalDetail />);

    expect(await screen.findByText('Daily')).toBeInTheDocument();
    expect(screen.getByText('Weekly')).toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();
    expect(screen.getByText('Yearly')).toBeInTheDocument();
    expect(screen.getByText('Strip and wax')).toBeInTheDocument();
  });

  it('hides tasks with zero quantity suffix', async () => {
    getProposalMock.mockResolvedValueOnce({
      ...proposal,
      proposalServices: [
        {
          id: 'service-1',
          serviceName: 'Main Floor',
          serviceType: 'weekly',
          frequency: 'weekly',
          estimatedHours: null,
          hourlyRate: null,
          monthlyPrice: 500,
          description: '1000 sq ft tile floor\nDaily: Desk x0, Mop floors',
          includedTasks: ['Desk x0', 'Mop floors'],
          sortOrder: 0,
        },
      ],
    });

    render(<ProposalDetail />);

    expect((await screen.findAllByText('Mop floors')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Desk x0')).not.toBeInTheDocument();
  });

  it('uses proposal-level service frequency in services summary table', async () => {
    getProposalMock.mockResolvedValueOnce({
      ...proposal,
      serviceFrequency: '5x_week',
      facility: {
        id: 'facility-1',
        name: 'HQ',
        address: null,
      },
      proposalServices: [
        {
          id: 'service-1',
          serviceName: 'Main Floor',
          serviceType: 'weekly',
          frequency: 'weekly',
          estimatedHours: null,
          hourlyRate: null,
          monthlyPrice: 500,
          description: '1000 sq ft tile floor\nWeekly: Mop floors',
          includedTasks: ['Weekly: Mop floors'],
          sortOrder: 0,
        },
      ],
    });

    render(<ProposalDetail />);

    expect(await screen.findByText('5x Week')).toBeInTheDocument();
  });
});
