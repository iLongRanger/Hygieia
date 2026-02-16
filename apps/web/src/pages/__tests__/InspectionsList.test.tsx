import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import InspectionsList from '../inspections/InspectionsList';
import { mockInspection, mockPaginatedResponse } from '../../test/mocks';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const listInspectionsMock = vi.fn();

vi.mock('../../lib/inspections', () => ({
  listInspections: (...args: unknown[]) => listInspectionsMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('InspectionsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders list from API data', async () => {
    const inspections = [
      mockInspection(),
      mockInspection({
        id: 'inspection-2',
        inspectionNumber: 'INSP-202602-0002',
        status: 'completed',
        overallScore: '92.5',
        overallRating: 'excellent',
      }),
    ];
    listInspectionsMock.mockResolvedValue(mockPaginatedResponse(inspections));

    render(<InspectionsList />);

    expect(await screen.findByText('INSP-202602-0001')).toBeInTheDocument();
    expect(screen.getByText('INSP-202602-0002')).toBeInTheDocument();
    expect(screen.getByText('93%')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    listInspectionsMock.mockResolvedValue(mockPaginatedResponse([]));

    render(<InspectionsList />);

    // Table should render with no data rows - the header and empty state will be present
    expect(await screen.findByText('Inspections')).toBeInTheDocument();
  });

  it('navigates to /inspections/new on New Inspection click', async () => {
    const user = userEvent.setup();
    listInspectionsMock.mockResolvedValue(mockPaginatedResponse([]));

    render(<InspectionsList />);

    await screen.findByText('Inspections');

    await user.click(screen.getByRole('button', { name: /new inspection/i }));

    expect(navigateMock).toHaveBeenCalledWith('/inspections/new');
  });
});
