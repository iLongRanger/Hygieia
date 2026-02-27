import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import JobForm from '../jobs/JobForm';
import { mockJob, mockJobDetail, mockPaginatedResponse } from '../../test/mocks';
import { useAuthStore } from '../../stores/authStore';

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

vi.mock('../../components/ui/Select', () => ({
  Select: ({ label, value, onChange, options, disabled }: any) => (
    <label>
      {label}
      <select
        aria-label={label}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
      >
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  ),
}));

const listContractsMock = vi.fn();
const listTeamsMock = vi.fn();
const listUsersMock = vi.fn();
const createJobMock = vi.fn();
const updateJobMock = vi.fn();
const getJobMock = vi.fn();

vi.mock('../../lib/contracts', () => ({
  listContracts: (...args: unknown[]) => listContractsMock(...args),
}));

vi.mock('../../lib/teams', () => ({
  listTeams: (...args: unknown[]) => listTeamsMock(...args),
}));

vi.mock('../../lib/users', () => ({
  listUsers: (...args: unknown[]) => listUsersMock(...args),
}));

vi.mock('../../lib/jobs', () => ({
  createJob: (...args: unknown[]) => createJobMock(...args),
  updateJob: (...args: unknown[]) => updateJobMock(...args),
  getJob: (...args: unknown[]) => getJobMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockContract = {
  id: 'contract-1',
  contractNumber: 'CONT-202602-0001',
  title: 'Monthly Cleaning',
  status: 'active',
  account: { id: 'account-1', name: 'Acme Corporation', type: 'commercial' },
  facility: { id: 'facility-1', name: 'Main Office', address: null },
};

describe('JobForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = {};
    navigateMock.mockReset();
    useAuthStore.setState({
      user: { id: 'owner-1', email: 'owner@example.com', fullName: 'Owner User', role: 'owner' },
      token: 'token',
      refreshToken: null,
      isAuthenticated: true,
      hasPermission: () => true,
      canAny: () => true,
    });

    listContractsMock.mockResolvedValue(
      mockPaginatedResponse([mockContract])
    );
    listTeamsMock.mockResolvedValue(
      mockPaginatedResponse([{ id: 'team-1', name: 'Night Crew' }])
    );
    listUsersMock.mockResolvedValue(
      mockPaginatedResponse([
        { id: 'user-1', fullName: 'Test User', email: 'test@example.com' },
      ])
    );
    createJobMock.mockResolvedValue(mockJob());
    updateJobMock.mockResolvedValue(mockJob());
    getJobMock.mockResolvedValue(
      mockJobDetail({
        id: 'job-1',
        status: 'scheduled',
        contract: { id: 'contract-1', contractNumber: 'CONT-202602-0001', title: 'Monthly Cleaning' },
        account: { id: 'account-1', name: 'Acme Corporation' },
        facility: { id: 'facility-1', name: 'Main Office' },
        scheduledDate: '2026-02-20',
        estimatedHours: '3.0',
        notes: 'Test notes',
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders create form with empty fields', async () => {
    render(<JobForm />);

    expect(await screen.findByText('New Job')).toBeInTheDocument();
    expect(screen.getByLabelText(/contract \*/i)).toBeInTheDocument();
  });

  it('validates required fields on submit', async () => {
    const user = userEvent.setup();
    const toast = (await import('react-hot-toast')).default;

    render(<JobForm />);
    await screen.findByText('New Job');

    await user.click(screen.getByRole('button', { name: /create job/i }));

    expect(toast.error).toHaveBeenCalledWith('Please select a contract');
    expect(createJobMock).not.toHaveBeenCalled();
  });

  it('creates job with valid data', async () => {
    const user = userEvent.setup();
    render(<JobForm />);

    await screen.findByText('New Job');

    // Select contract
    await user.selectOptions(
      screen.getByLabelText(/contract \*/i),
      'contract-1'
    );

    // Set scheduled date
    const dateInput = screen.getByLabelText(/scheduled date/i);
    await user.clear(dateInput);
    await user.type(dateInput, '2026-03-01');

    // Submit
    await user.click(screen.getByRole('button', { name: /create job/i }));

    await waitFor(() => {
      expect(createJobMock).toHaveBeenCalledWith(
        expect.objectContaining({
          contractId: 'contract-1',
          accountId: 'account-1',
          facilityId: 'facility-1',
          scheduledDate: '2026-03-01',
        })
      );
      expect(navigateMock).toHaveBeenCalledWith('/jobs');
    });
  });

  it('loads existing job in edit mode', async () => {
    mockParams = { id: 'job-1' };

    render(<JobForm />);

    expect(await screen.findByText('Edit Job')).toBeInTheDocument();
    expect(getJobMock).toHaveBeenCalledWith('job-1');
  });

  it('updates job in edit mode', async () => {
    const user = userEvent.setup();
    mockParams = { id: 'job-1' };

    render(<JobForm />);
    await screen.findByText('Edit Job');

    // Change estimated hours
    const hoursInput = screen.getByLabelText(/estimated hours/i);
    await user.clear(hoursInput);
    await user.type(hoursInput, '5');

    await user.click(screen.getByRole('button', { name: /update job/i }));

    await waitFor(() => {
      expect(updateJobMock).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          estimatedHours: 5,
        })
      );
      expect(navigateMock).toHaveBeenCalledWith('/jobs');
    });
  });

  it('redirects subcontractor users away from job form', async () => {
    const toast = (await import('react-hot-toast')).default;
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

    render(<JobForm />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Subcontractors cannot edit jobs');
      expect(navigateMock).toHaveBeenCalledWith('/jobs');
    });
    expect(listContractsMock).not.toHaveBeenCalled();
  });
});
