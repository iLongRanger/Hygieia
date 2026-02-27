import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import JobDetail from '../jobs/JobDetail';
import { mockJobDetail, mockJobTask, mockJobNote, mockJobActivity } from '../../test/mocks';

let mockParams: { id?: string } = {};
const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => navigateMock,
  };
});

const getJobMock = vi.fn();
const startJobMock = vi.fn();
const completeJobMock = vi.fn();
const cancelJobMock = vi.fn();
const createJobTaskMock = vi.fn();
const updateJobTaskMock = vi.fn();
const deleteJobTaskMock = vi.fn();
const createJobNoteMock = vi.fn();

vi.mock('../../lib/jobs', () => ({
  getJob: (...args: unknown[]) => getJobMock(...args),
  startJob: (...args: unknown[]) => startJobMock(...args),
  completeJob: (...args: unknown[]) => completeJobMock(...args),
  cancelJob: (...args: unknown[]) => cancelJobMock(...args),
  createJobTask: (...args: unknown[]) => createJobTaskMock(...args),
  updateJobTask: (...args: unknown[]) => updateJobTaskMock(...args),
  deleteJobTask: (...args: unknown[]) => deleteJobTaskMock(...args),
  createJobNote: (...args: unknown[]) => createJobNoteMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const scheduledJob = mockJobDetail({
  id: 'job-1',
  jobNumber: 'JOB-202602-0001',
  status: 'scheduled',
  scheduledDate: '2026-02-15',
  tasks: [mockJobTask({ id: 'task-1', taskName: 'Vacuum floors' })],
  notes_: [mockJobNote({ id: 'note-1', content: 'Test note' })],
  activities: [mockJobActivity({ id: 'act-1', action: 'job_created' })],
});

describe('JobDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { id: 'job-1' };
    navigateMock.mockReset();
    getJobMock.mockResolvedValue(scheduledJob);
    startJobMock.mockResolvedValue({});
    completeJobMock.mockResolvedValue({});
    createJobTaskMock.mockResolvedValue({});
    updateJobTaskMock.mockResolvedValue({});
    deleteJobTaskMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders job details from API data', async () => {
    render(<JobDetail />);

    expect(await screen.findByText('JOB-202602-0001')).toBeInTheDocument();
    expect(screen.getByText('Vacuum floors')).toBeInTheDocument();
    expect(screen.getByText('Test note')).toBeInTheDocument();
  });

  it('shows Edit button for scheduled jobs', async () => {
    render(<JobDetail />);

    expect(await screen.findByText('JOB-202602-0001')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('hides Edit button for completed jobs', async () => {
    getJobMock.mockResolvedValue(
      mockJobDetail({ ...scheduledJob, status: 'completed' })
    );

    render(<JobDetail />);

    await screen.findByText('JOB-202602-0001');
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('hides Edit button for canceled jobs', async () => {
    getJobMock.mockResolvedValue(
      mockJobDetail({ ...scheduledJob, status: 'canceled' })
    );

    render(<JobDetail />);

    await screen.findByText('JOB-202602-0001');
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('Start button calls startJob', async () => {
    const user = userEvent.setup();

    render(<JobDetail />);

    const startBtn = await screen.findByRole('button', { name: /start job/i });
    await user.click(startBtn);

    await waitFor(() => {
      expect(startJobMock).toHaveBeenCalledWith('job-1', {
        geoLocation: null,
      });
    });
  });

  it('Complete flow works', async () => {
    getJobMock.mockResolvedValue(
      mockJobDetail({ ...scheduledJob, status: 'in_progress' })
    );
    const user = userEvent.setup();

    render(<JobDetail />);

    const completeBtn = await screen.findByRole('button', { name: /complete/i });
    await user.click(completeBtn);

    // Complete form should appear
    const textarea = await screen.findByPlaceholderText(/completion notes/i);
    await user.type(textarea, 'Job done');

    const confirmBtn = screen.getByRole('button', { name: /confirm complete/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(completeJobMock).toHaveBeenCalledWith('job-1', {
        completionNotes: 'Job done',
        geoLocation: null,
      });
    });
  });

  it('task add works', async () => {
    const user = userEvent.setup();

    render(<JobDetail />);
    await screen.findByText('JOB-202602-0001');

    // Click Add Task button
    const addTaskBtn = screen.getByRole('button', { name: /add task/i });
    await user.click(addTaskBtn);

    // Type task name and submit
    const taskInput = screen.getByPlaceholderText('Task name');
    await user.type(taskInput, 'Mop floors{enter}');

    await waitFor(() => {
      expect(createJobTaskMock).toHaveBeenCalledWith('job-1', {
        taskName: 'Mop floors',
      });
    });
  });
});
