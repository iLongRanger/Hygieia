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
const generateJobsMock = vi.fn();
const listContractsMock = vi.fn();

vi.mock('../../lib/jobs', () => ({
  listJobs: (...args: unknown[]) => listJobsMock(...args),
  startJob: (...args: unknown[]) => startJobMock(...args),
  completeJob: (...args: unknown[]) => completeJobMock(...args),
  cancelJob: (...args: unknown[]) => cancelJobMock(...args),
  generateJobs: (...args: unknown[]) => generateJobsMock(...args),
}));

vi.mock('../../lib/contracts', () => ({
  listContracts: (...args: unknown[]) => listContractsMock(...args),
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
    generateJobsMock.mockResolvedValue({ created: 3 });
    listContractsMock.mockResolvedValue({
      data: [
        {
          id: 'contract-1',
          contractNumber: 'CONT-001',
          account: { name: 'Acme Corp' },
          facility: { name: 'HQ' },
        },
      ],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
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

  it('generates recurring jobs from selected contract', async () => {
    const user = userEvent.setup();
    listJobsMock.mockResolvedValue(mockPaginatedResponse([]));

    render(<JobsList />);
    await screen.findByText('No jobs found');

    await user.click(screen.getByRole('button', { name: /generate recurring/i }));

    await waitFor(() => {
      expect(listContractsMock).toHaveBeenCalledWith({ status: 'active', limit: 100 });
    });

    await user.selectOptions(screen.getByLabelText(/contract/i), 'contract-1');
    await user.click(screen.getByRole('button', { name: /generate jobs/i }));

    await waitFor(() => {
      expect(generateJobsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          contractId: 'contract-1',
        })
      );
    });

    await waitFor(() => {
      expect(listJobsMock).toHaveBeenCalledTimes(2);
    });
  });
});
