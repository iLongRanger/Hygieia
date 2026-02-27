import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/test-utils';
import Header from '../Header';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../../stores/authStore', () => ({
  useAuthStore: (selector: any) =>
    selector({
      user: { id: 'user-1', fullName: 'Owner User', role: 'owner' },
    }),
}));

const toggleThemeMock = vi.fn();

vi.mock('../../../stores/themeStore', () => ({
  useThemeStore: () => ({
    theme: 'light',
    toggleTheme: toggleThemeMock,
  }),
}));

const listNotificationsMock = vi.fn();
const getUnreadCountMock = vi.fn();
const markNotificationReadMock = vi.fn();
const markAllNotificationsReadMock = vi.fn();

vi.mock('../../../lib/notifications', () => ({
  listNotifications: (...args: unknown[]) => listNotificationsMock(...args),
  getUnreadCount: (...args: unknown[]) => getUnreadCountMock(...args),
  markNotificationRead: (...args: unknown[]) => markNotificationReadMock(...args),
  markAllNotificationsRead: (...args: unknown[]) => markAllNotificationsReadMock(...args),
}));

const connectRealtimeMock = vi.fn();
const disconnectRealtimeMock = vi.fn();
const subscribeCreatedMock = vi.fn();
const subscribeUpdatedMock = vi.fn();
const subscribeAllReadMock = vi.fn();

vi.mock('../../../lib/realtimeNotifications', () => ({
  connectNotificationsRealtime: (...args: unknown[]) => connectRealtimeMock(...args),
  disconnectNotificationsRealtime: (...args: unknown[]) => disconnectRealtimeMock(...args),
  subscribeNotificationCreated: (...args: unknown[]) => subscribeCreatedMock(...args),
  subscribeNotificationUpdated: (...args: unknown[]) => subscribeUpdatedMock(...args),
  subscribeNotificationAllRead: (...args: unknown[]) => subscribeAllReadMock(...args),
}));

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockReset();
    listNotificationsMock.mockResolvedValue([
      {
        id: 'n-1',
        type: 'proposal_accepted',
        title: 'Proposal accepted',
        body: null,
        metadata: { proposalId: 'proposal-1' },
        readAt: null,
        emailSent: false,
        createdAt: new Date().toISOString(),
      },
    ]);
    getUnreadCountMock.mockResolvedValue(1);
    markNotificationReadMock.mockResolvedValue({});
    markAllNotificationsReadMock.mockResolvedValue(1);
    subscribeCreatedMock.mockReturnValue(() => {});
    subscribeUpdatedMock.mockReturnValue(() => {});
    subscribeAllReadMock.mockReturnValue(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders user info and unread badge', async () => {
    render(<Header />);

    expect(await screen.findByText('Owner User')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(connectRealtimeMock).toHaveBeenCalled();
  });

  it('toggles theme from header action', async () => {
    const user = userEvent.setup();
    render(<Header />);

    await user.click(screen.getByRole('button', { name: /switch to dark mode/i }));
    expect(toggleThemeMock).toHaveBeenCalled();
  });

  it('opens notifications and navigates on notification click', async () => {
    const user = userEvent.setup();
    render(<Header />);

    await user.click(screen.getByRole('button', { name: /open notifications/i }));
    await user.click(await screen.findByText('Proposal accepted'));

    await waitFor(() => {
      expect(markNotificationReadMock).toHaveBeenCalledWith('n-1', true);
      expect(navigateMock).toHaveBeenCalledWith('/proposals/proposal-1');
    });
  });

  it('navigates to contract detail for contract assignment notifications', async () => {
    const user = userEvent.setup();
    listNotificationsMock.mockResolvedValue([
      {
        id: 'n-contract-1',
        type: 'contract_assignment_required',
        title: 'Contract assigned to you',
        body: null,
        metadata: { contractId: 'contract-1' },
        readAt: null,
        emailSent: false,
        createdAt: new Date().toISOString(),
      },
    ]);

    render(<Header />);

    await user.click(screen.getByRole('button', { name: /open notifications/i }));
    await user.click(await screen.findByText('Contract assigned to you'));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/contracts/contract-1');
    });
  });
});
