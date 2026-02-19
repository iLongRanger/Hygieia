import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test/test-utils';
import TimesheetsPage from '../timeTracking/TimesheetsPage';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const listTimesheetsMock = vi.fn();
const getTimesheetMock = vi.fn();
const generateTimesheetMock = vi.fn();
const submitTimesheetMock = vi.fn();
const approveTimesheetMock = vi.fn();
const rejectTimesheetMock = vi.fn();

vi.mock('../../lib/timeTracking', () => ({
  listTimesheets: (...args: unknown[]) => listTimesheetsMock(...args),
  getTimesheet: (...args: unknown[]) => getTimesheetMock(...args),
  generateTimesheet: (...args: unknown[]) => generateTimesheetMock(...args),
  submitTimesheet: (...args: unknown[]) => submitTimesheetMock(...args),
  approveTimesheet: (...args: unknown[]) => approveTimesheetMock(...args),
  rejectTimesheet: (...args: unknown[]) => rejectTimesheetMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const timesheetRow = {
  id: 'ts-1',
  user: { id: 'user-1', fullName: 'Jane Worker' },
  periodStart: '2026-02-01T00:00:00.000Z',
  periodEnd: '2026-02-07T23:59:59.000Z',
  status: 'draft',
  totalHours: '42',
  regularHours: '40',
  overtimeHours: '2',
  notes: null,
  approvedByUserId: null,
  approvedAt: null,
  createdAt: '2026-02-08T00:00:00.000Z',
  _count: { entries: 2 },
};

const detail = {
  ...timesheetRow,
  entries: [
    {
      id: 'te-1',
      entryType: 'clock_in',
      clockIn: '2026-02-01T09:00:00.000Z',
      clockOut: '2026-02-01T17:00:00.000Z',
      breakMinutes: 30,
      totalHours: '7.5',
      notes: null,
      status: 'completed',
      facility: { id: 'facility-1', name: 'HQ' },
      job: { id: 'job-1', jobNumber: 'WO-001' },
    },
  ],
};

describe('TimesheetsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockReset();
    listTimesheetsMock.mockResolvedValue({
      data: [timesheetRow],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    getTimesheetMock.mockResolvedValue(detail);
    generateTimesheetMock.mockResolvedValue(detail);
    submitTimesheetMock.mockResolvedValue({ ...detail, status: 'submitted' });
    approveTimesheetMock.mockResolvedValue({ ...detail, status: 'approved' });
    rejectTimesheetMock.mockResolvedValue({ ...detail, status: 'rejected' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders timesheets list', async () => {
    render(<TimesheetsPage />);

    expect(await screen.findByText('Timesheets')).toBeInTheDocument();
    expect(screen.getByText('Jane Worker')).toBeInTheDocument();
    expect(listTimesheetsMock).toHaveBeenCalledWith({ limit: 20 });
  });

  it('validates generate form required fields', async () => {
    const user = userEvent.setup();
    const toast = (await import('react-hot-toast')).default;

    render(<TimesheetsPage />);
    await screen.findByText('Timesheets');

    await user.click(screen.getByRole('button', { name: /^generate$/i }));
    await user.click(screen.getAllByRole('button', { name: /^generate$/i })[1]);

    expect(toast.error).toHaveBeenCalledWith('All fields are required');
    expect(generateTimesheetMock).not.toHaveBeenCalled();
  });

  it('opens detail and submits draft timesheet', async () => {
    const user = userEvent.setup();
    render(<TimesheetsPage />);

    await screen.findByText('Jane Worker');
    await user.click(screen.getByText('Jane Worker'));

    expect(await screen.findByText(/Timesheet/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(submitTimesheetMock).toHaveBeenCalledWith('ts-1');
    });
  });
});
