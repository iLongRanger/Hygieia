import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/test-utils';
import ContractTimeline from '../ContractTimeline';

const getContractActivitiesMock = vi.fn();

vi.mock('../../../lib/contracts', () => ({
  getContractActivities: (...args: unknown[]) =>
    getContractActivitiesMock(...args),
}));

describe('ContractTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows empty state when no activities are returned', async () => {
    getContractActivitiesMock.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    render(<ContractTimeline contractId="contract-1" />);

    expect(await screen.findByText('No activity recorded yet.')).toBeInTheDocument();
    expect(getContractActivitiesMock).toHaveBeenCalledWith('contract-1');
  });

  it('renders activity rows with metadata details', async () => {
    getContractActivitiesMock.mockResolvedValue({
      data: [
        {
          id: 'activity-1',
          action: 'status_changed',
          metadata: { newStatus: 'pending_signature' },
          createdAt: '2026-02-11T10:00:00.000Z',
          performedByUser: {
            id: 'user-1',
            fullName: 'Jane Doe',
            email: 'jane@example.com',
          },
        },
        {
          id: 'activity-2',
          action: 'signed',
          metadata: { signedByName: 'John Client' },
          createdAt: '2026-02-11T11:00:00.000Z',
          performedByUser: null,
        },
      ],
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
    });

    render(<ContractTimeline contractId="contract-1" />);

    expect(await screen.findByText('Status changed')).toBeInTheDocument();
    expect(screen.getByText('New status: pending signature')).toBeInTheDocument();
    expect(screen.getByText(/by Jane Doe/)).toBeInTheDocument();
    expect(screen.getByText('Contract signed')).toBeInTheDocument();
    expect(screen.getByText('Signed by John Client')).toBeInTheDocument();
    expect(screen.getByText(/System/)).toBeInTheDocument();
  });

  it('logs fetch errors and falls back to empty state', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    getContractActivitiesMock.mockRejectedValue(new Error('network error'));

    render(<ContractTimeline contractId="contract-1" />);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalled();
    });
    expect(await screen.findByText('No activity recorded yet.')).toBeInTheDocument();
  });
});
