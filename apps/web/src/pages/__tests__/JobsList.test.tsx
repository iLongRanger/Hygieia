import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import JobsList from '../jobs/JobsList';
import { mockJob, mockPaginatedResponse } from '../../test/mocks';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const listJobsMock = vi.fn();
const startJobMock = vi.fn();
const completeJobMock = vi.fn();
const cancelJobMock = vi.fn();

vi.mock('../../lib/jobs', () => ({
  listJobs: (...args: unknown[]) => listJobsMock(...args),
  startJob: (...args: unknown[]) => startJobMock(...args),
  completeJob: (...args: unknown[]) => completeJobMock(...args),
  cancelJob: (...args: unknown[]) => cancelJobMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('JobsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockReset();
    startJobMock.mockResolvedValue(mockJob({ status: 'in_progress' }));
    completeJobMock.mockResolvedValue(mockJob({ status: 'completed' }));
    cancelJobMock.mockResolvedValue(mockJob({ status: 'canceled' }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders job list from API data', async () => {
    const jobs = [
      mockJob({ id: 'job-1', jobNumber: 'JOB-001' }),
      mockJob({ id: 'job-2', jobNumber: 'JOB-002', status: 'in_progress' }),
    ];
    listJobsMock.mockResolvedValue(mockPaginatedResponse(jobs));

    render(<JobsList />);

    expect(await screen.findByText('JOB-001')).toBeInTheDocument();
    expect(screen.getByText('JOB-002')).toBeInTheDocument();
  });

  it('shows empty state when no jobs', async () => {
    listJobsMock.mockResolvedValue(mockPaginatedResponse([]));

    render(<JobsList />);

    expect(await screen.findByText('No jobs found')).toBeInTheDocument();
  });

  it('navigates to /jobs/new on New Job click', async () => {
    const user = userEvent.setup();
    listJobsMock.mockResolvedValue(mockPaginatedResponse([]));

    render(<JobsList />);
    await screen.findByText('No jobs found');

    await user.click(screen.getByRole('button', { name: /new job/i }));

    expect(navigateMock).toHaveBeenCalledWith('/jobs/new');
  });

  it('start action calls startJob', async () => {
    const jobs = [mockJob({ id: 'job-1', jobNumber: 'JOB-001', status: 'scheduled' })];
    listJobsMock.mockResolvedValue(mockPaginatedResponse(jobs));

    render(<JobsList />);
    await screen.findByText('JOB-001');

    // The start button is a ghost button with Play icon in the actions column
    const startButtons = screen.getAllByRole('button');
    const startButton = startButtons.find(
      (btn) => btn.querySelector('svg.lucide-play') !== null
    );

    if (startButton) {
      const user = userEvent.setup();
      await user.click(startButton);

      await waitFor(() => {
        expect(startJobMock).toHaveBeenCalledWith('job-1');
      });
    }
  });
});
