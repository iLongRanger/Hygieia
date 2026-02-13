import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/test-utils';
import ProposalTimeline from '../ProposalTimeline';

const getProposalActivitiesMock = vi.fn();

vi.mock('../../../lib/proposals', () => ({
  getProposalActivities: (...args: unknown[]) =>
    getProposalActivitiesMock(...args),
}));

describe('ProposalTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows empty state when no proposal activity exists', async () => {
    getProposalActivitiesMock.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    render(<ProposalTimeline proposalId="proposal-1" />);

    expect(await screen.findByText('No activity recorded yet.')).toBeInTheDocument();
    expect(getProposalActivitiesMock).toHaveBeenCalledWith('proposal-1');
  });

  it('renders action details for proposal events', async () => {
    getProposalActivitiesMock.mockResolvedValue({
      data: [
        {
          id: 'activity-1',
          action: 'rejected',
          metadata: { rejectionReason: 'Budget constraints' },
          ipAddress: null,
          createdAt: '2026-02-11T09:00:00.000Z',
          performedByUser: {
            id: 'user-1',
            fullName: 'Manager One',
            email: 'manager@example.com',
          },
        },
        {
          id: 'activity-2',
          action: 'sent',
          metadata: { emailTo: 'client@example.com' },
          ipAddress: null,
          createdAt: '2026-02-11T10:00:00.000Z',
          performedByUser: null,
        },
      ],
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
    });

    render(<ProposalTimeline proposalId="proposal-1" />);

    expect(await screen.findByText('Proposal rejected')).toBeInTheDocument();
    expect(screen.getByText('“Budget constraints”')).toBeInTheDocument();
    expect(screen.getByText('Proposal sent')).toBeInTheDocument();
    expect(screen.getByText('Sent to client@example.com')).toBeInTheDocument();
    expect(screen.getByText(/by Manager One/)).toBeInTheDocument();
  });

  it('logs errors and falls back to empty state', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    getProposalActivitiesMock.mockRejectedValue(new Error('fetch failed'));

    render(<ProposalTimeline proposalId="proposal-1" />);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalled();
    });
    expect(await screen.findByText('No activity recorded yet.')).toBeInTheDocument();
  });
});
