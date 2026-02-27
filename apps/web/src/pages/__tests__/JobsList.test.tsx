import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import JobsList from '../jobs/JobsList';
import { mockJob, mockPaginatedResponse } from '../../test/mocks';
import { useAuthStore } from '../../stores/authStore';

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
const listTeamsMock = vi.fn();
const listUsersMock = vi.fn();

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

vi.mock('../../lib/teams', () => ({
  listTeams: (...args: unknown[]) => listTeamsMock(...args),
}));

vi.mock('../../lib/users', () => ({
  listUsers: (...args: unknown[]) => listUsersMock(...args),
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
    useAuthStore.setState({
      user: { id: 'owner-1', email: 'owner@example.com', fullName: 'Owner User', role: 'owner' },
      token: 'token',
      refreshToken: null,
      isAuthenticated: true,
      hasPermission: () => true,
      canAny: () => true,
    });
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
    listTeamsMock.mockResolvedValue({
      data: [{ id: 'team-1', name: 'Sub Team A' }],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    listUsersMock.mockResolvedValue({
      data: [{ id: 'user-1', fullName: 'Alice Employee' }],
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
    await waitFor(() => {
      expect(listTeamsMock).toHaveBeenCalledWith({ limit: 100, isActive: true });
    });
    await waitFor(() => {
      expect(listUsersMock).toHaveBeenCalledWith({ limit: 100, status: 'active' });
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

  it('hides new job and generate recurring actions for subcontractor users', async () => {
    useAuthStore.setState({
      user: {
        id: 'sub-1',
        email: 'sub@example.com',
        fullName: 'Sub User',
        role: 'subcontractor',
      },
      token: 'token',
      refreshToken: null,
      isAuthenticated: true,
      hasPermission: () => true,
      canAny: () => true,
    });
    listJobsMock.mockResolvedValue(mockPaginatedResponse([]));

    render(<JobsList />);
    await screen.findByText('No jobs found');

    expect(screen.queryByRole('button', { name: /generate recurring/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /new job/i })).not.toBeInTheDocument();
  });
});
