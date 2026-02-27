import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test/test-utils';
import NotificationsPage from '../notifications/NotificationsPage';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const listNotificationsMock = vi.fn();
const markNotificationReadMock = vi.fn();
const markAllNotificationsReadMock = vi.fn();

vi.mock('../../lib/notifications', () => ({
  listNotifications: (...args: unknown[]) => listNotificationsMock(...args),
  markNotificationRead: (...args: unknown[]) => markNotificationReadMock(...args),
  markAllNotificationsRead: (...args: unknown[]) => markAllNotificationsReadMock(...args),
}));

const connectRealtimeMock = vi.fn();
const subscribeCreatedMock = vi.fn();
const subscribeUpdatedMock = vi.fn();
const subscribeAllReadMock = vi.fn();

vi.mock('../../lib/realtimeNotifications', () => ({
  connectNotificationsRealtime: (...args: unknown[]) => connectRealtimeMock(...args),
  subscribeNotificationCreated: (...args: unknown[]) => subscribeCreatedMock(...args),
  subscribeNotificationUpdated: (...args: unknown[]) => subscribeUpdatedMock(...args),
  subscribeNotificationAllRead: (...args: unknown[]) => subscribeAllReadMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockReset();

    listNotificationsMock.mockResolvedValue([
      {
        id: 'n-1',
        type: 'proposal_accepted',
        title: 'Proposal accepted',
        body: 'Acme accepted your proposal',
        metadata: { proposalId: 'proposal-1' },
        readAt: null,
        emailSent: false,
        createdAt: new Date().toISOString(),
      },
    ]);
    markNotificationReadMock.mockResolvedValue({});
    markAllNotificationsReadMock.mockResolvedValue(1);

    subscribeCreatedMock.mockReturnValue(() => {});
    subscribeUpdatedMock.mockReturnValue(() => {});
    subscribeAllReadMock.mockReturnValue(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders notifications and initializes realtime subscriptions', async () => {
    render(<NotificationsPage />);

    expect(await screen.findByText('Proposal accepted')).toBeInTheDocument();
    expect(connectRealtimeMock).toHaveBeenCalled();
    expect(subscribeCreatedMock).toHaveBeenCalled();
    expect(subscribeUpdatedMock).toHaveBeenCalled();
    expect(subscribeAllReadMock).toHaveBeenCalled();
  });

  it('marks all notifications as read', async () => {
    const user = userEvent.setup();
    render(<NotificationsPage />);

    await screen.findByText('Proposal accepted');
    await user.click(screen.getByRole('button', { name: /mark all read/i }));

    await waitFor(() => {
      expect(markAllNotificationsReadMock).toHaveBeenCalled();
    });
  });

  it('marks single notification as read and navigates by metadata', async () => {
    const user = userEvent.setup();
    render(<NotificationsPage />);

    await screen.findByText('Proposal accepted');
    await user.click(screen.getByText('Proposal accepted'));

    await waitFor(() => {
      expect(markNotificationReadMock).toHaveBeenCalledWith('n-1', true);
      expect(navigateMock).toHaveBeenCalledWith('/proposals/proposal-1');
    });
  });

  it('renders near-end no-checkin job alert type and navigates to job', async () => {
    const user = userEvent.setup();
    listNotificationsMock.mockResolvedValueOnce([
      {
        id: 'n-job-1',
        type: 'job_no_checkin_near_end',
        title: 'No check-in yet for WO-2026-0100',
        body: 'Job is nearing end time with no check-in',
        metadata: { jobId: 'job-99' },
        readAt: null,
        emailSent: false,
        createdAt: new Date().toISOString(),
      },
    ]);

    render(<NotificationsPage />);

    expect(await screen.findByText('No check-in yet for WO-2026-0100')).toBeInTheDocument();
    expect(screen.getByText('Job No Checkin Near End')).toBeInTheDocument();

    await user.click(screen.getByText('No check-in yet for WO-2026-0100'));

    await waitFor(() => {
      expect(markNotificationReadMock).toHaveBeenCalledWith('n-job-1', true);
      expect(navigateMock).toHaveBeenCalledWith('/jobs/job-99');
    });
  });

  it('navigates to contract detail for contract assignment notifications', async () => {
    const user = userEvent.setup();
    listNotificationsMock.mockResolvedValueOnce([
      {
        id: 'n-contract-1',
        type: 'contract_assignment_required',
        title: 'Contract assigned to you',
        body: 'Please review in app',
        metadata: { contractId: 'contract-1' },
        readAt: null,
        emailSent: false,
        createdAt: new Date().toISOString(),
      },
    ]);

    render(<NotificationsPage />);
    await user.click(await screen.findByText('Contract assigned to you'));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/contracts/contract-1');
    });
  });

  it('handles stringified metadata payloads when navigating', async () => {
    const user = userEvent.setup();
    listNotificationsMock.mockResolvedValueOnce([
      {
        id: 'n-contract-2',
        type: 'contract_team_assigned',
        title: 'Contract assigned to your team',
        body: 'Please review in app',
        metadata: JSON.stringify({ contract_id: 'contract-2' }),
        readAt: null,
        emailSent: false,
        createdAt: new Date().toISOString(),
      },
    ]);

    render(<NotificationsPage />);
    await user.click(await screen.findByText('Contract assigned to your team'));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/contracts/contract-2');
    });
  });
});
