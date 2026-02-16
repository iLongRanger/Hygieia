import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import InspectionDetail from '../inspections/InspectionDetail';
import { mockInspectionDetail, mockInspectionItem } from '../../test/mocks';

let mockParams: { id?: string } = { id: 'inspection-1' };
const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => navigateMock,
  };
});

const getInspectionMock = vi.fn();
const startInspectionMock = vi.fn();
const completeInspectionMock = vi.fn();
const cancelInspectionMock = vi.fn();

vi.mock('../../lib/inspections', () => ({
  getInspection: (...args: unknown[]) => getInspectionMock(...args),
  startInspection: (...args: unknown[]) => startInspectionMock(...args),
  completeInspection: (...args: unknown[]) => completeInspectionMock(...args),
  cancelInspection: (...args: unknown[]) => cancelInspectionMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('InspectionDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { id: 'inspection-1' };
    navigateMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders inspection details', async () => {
    getInspectionMock.mockResolvedValue(
      mockInspectionDetail({
        inspectionNumber: 'INSP-202602-0001',
        items: [mockInspectionItem()],
      })
    );

    render(<InspectionDetail />);

    expect(await screen.findByText('INSP-202602-0001')).toBeInTheDocument();
    expect(screen.getByText('Main Office')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('shows Edit button for scheduled inspections', async () => {
    getInspectionMock.mockResolvedValue(
      mockInspectionDetail({ status: 'scheduled' })
    );

    render(<InspectionDetail />);

    expect(await screen.findByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('hides Edit button for completed inspections', async () => {
    getInspectionMock.mockResolvedValue(
      mockInspectionDetail({ status: 'completed' })
    );

    render(<InspectionDetail />);

    await screen.findByText('INSP-202602-0001');
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('Start button calls startInspection', async () => {
    const user = userEvent.setup();
    getInspectionMock.mockResolvedValue(
      mockInspectionDetail({ status: 'scheduled' })
    );
    startInspectionMock.mockResolvedValue(
      mockInspectionDetail({ status: 'in_progress' })
    );

    render(<InspectionDetail />);

    const startButton = await screen.findByRole('button', { name: /start/i });
    await user.click(startButton);

    await waitFor(() => {
      expect(startInspectionMock).toHaveBeenCalledWith('inspection-1');
    });
  });

  it('Cancel button calls cancelInspection', async () => {
    const user = userEvent.setup();
    getInspectionMock.mockResolvedValue(
      mockInspectionDetail({ status: 'scheduled' })
    );
    cancelInspectionMock.mockResolvedValue(
      mockInspectionDetail({ status: 'canceled' })
    );

    render(<InspectionDetail />);

    const cancelButton = await screen.findByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(cancelInspectionMock).toHaveBeenCalledWith('inspection-1');
    });
  });
});
