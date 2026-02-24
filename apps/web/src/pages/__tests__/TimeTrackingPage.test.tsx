import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test/test-utils';
import TimeTrackingPage from '../timeTracking/TimeTrackingPage';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const listTimeEntriesMock = vi.fn();
const getActiveEntryMock = vi.fn();
const clockInMock = vi.fn();
const clockOutMock = vi.fn();
const startBreakMock = vi.fn();
const endBreakMock = vi.fn();
const approveTimeEntryMock = vi.fn();
const listJobsMock = vi.fn();
const getJobMock = vi.fn();
const completeJobMock = vi.fn();

vi.mock('../../lib/timeTracking', () => ({
  listTimeEntries: (...args: unknown[]) => listTimeEntriesMock(...args),
  getActiveEntry: (...args: unknown[]) => getActiveEntryMock(...args),
  clockIn: (...args: unknown[]) => clockInMock(...args),
  clockOut: (...args: unknown[]) => clockOutMock(...args),
  startBreak: (...args: unknown[]) => startBreakMock(...args),
  endBreak: (...args: unknown[]) => endBreakMock(...args),
  approveTimeEntry: (...args: unknown[]) => approveTimeEntryMock(...args),
}));

vi.mock('../../lib/jobs', () => ({
  listJobs: (...args: unknown[]) => listJobsMock(...args),
  getJob: (...args: unknown[]) => getJobMock(...args),
  completeJob: (...args: unknown[]) => completeJobMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const entry = {
  id: 'entry-1',
  user: { id: 'user-1', fullName: 'Jane Worker' },
  clockIn: '2026-02-01T09:00:00.000Z',
  clockOut: '2026-02-01T12:00:00.000Z',
  breakMinutes: 0,
  totalHours: '3',
  status: 'completed',
  notes: null,
  facility: { id: 'facility-1', name: 'HQ' },
  job: null,
  contract: null,
  approvedByUser: null,
  editedByUser: null,
  approvedAt: null,
  editReason: null,
  timesheetId: null,
  entryType: 'clock_in',
  createdAt: '2026-02-01T12:00:00.000Z',
};

describe('TimeTrackingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockReset();
    listTimeEntriesMock.mockResolvedValue({
      data: [entry],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    getActiveEntryMock.mockResolvedValue(null);
    clockInMock.mockResolvedValue({ ...entry, status: 'active', clockOut: null });
    clockOutMock.mockResolvedValue({ ...entry, status: 'completed' });
    startBreakMock.mockResolvedValue(entry);
    endBreakMock.mockResolvedValue(entry);
    approveTimeEntryMock.mockResolvedValue({ ...entry, status: 'approved' });
    listJobsMock.mockResolvedValue({
      data: [
        {
          id: 'job-1',
          jobNumber: 'WO-2026-0001',
          facility: { id: 'facility-1', name: 'HQ' },
          assignedToUser: { id: 'user-1', fullName: 'Jane Worker', email: 'jane@example.com' },
          assignedTeam: null,
        },
      ],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    getJobMock.mockResolvedValue({ id: 'job-1', status: 'in_progress' });
    completeJobMock.mockResolvedValue({ id: 'job-1', status: 'completed' });

    Object.defineProperty(global.navigator, 'geolocation', {
      value: {
        getCurrentPosition: (success: PositionCallback) =>
          success({
            coords: {
              latitude: 43.7,
              longitude: -79.4,
              accuracy: 15,
            } as GeolocationCoordinates,
            timestamp: Date.now(),
          } as GeolocationPosition),
      },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders time entries from API data', async () => {
    render(<TimeTrackingPage />);

    expect(await screen.findByText('Time Tracking')).toBeInTheDocument();
    expect(screen.getByText('Jane Worker')).toBeInTheDocument();
    expect(listTimeEntriesMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 })
    );
  });

  it('clocks in when no active entry exists', async () => {
    const user = userEvent.setup();
    render(<TimeTrackingPage />);

    await screen.findByText('Not Clocked In');
    await user.click(screen.getByRole('button', { name: /clock in/i }));
    await screen.findByRole('heading', { name: /clock in/i });
    await user.selectOptions(screen.getByLabelText(/job/i), 'job-1');
    await user.click(screen.getByRole('button', { name: /confirm clock in/i }));

    await waitFor(() => {
      expect(clockInMock).toHaveBeenCalled();
    });
  });

  it('approves completed entries from the table action', async () => {
    const user = userEvent.setup();
    render(<TimeTrackingPage />);

    await screen.findByText('Jane Worker');
    await user.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      expect(approveTimeEntryMock).toHaveBeenCalledWith('entry-1');
    });
  });
});
