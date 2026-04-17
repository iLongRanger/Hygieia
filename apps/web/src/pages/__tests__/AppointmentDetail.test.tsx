import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '../../test/test-utils';
import AppointmentDetail from '../appointments/AppointmentDetail';

let mockParams: { id?: string } = { id: 'appt-1' };
const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => navigateMock,
  };
});

const getAppointmentMock = vi.fn();

vi.mock('../../lib/appointments', () => ({
  getAppointment: (...args: unknown[]) => getAppointmentMock(...args),
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: (selector: (state: any) => any) =>
    selector({
      hasPermission: () => true,
    }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
  },
}));

const appointment = {
  id: 'appt-1',
  type: 'walk_through' as const,
  status: 'scheduled' as const,
  scheduledStart: '2026-04-17T16:00:00.000Z',
  scheduledEnd: '2026-04-17T17:00:00.000Z',
  timezone: 'America/Vancouver',
  location: 'On-site',
  notes: 'Bring shoe covers.',
  completionNotes: null,
  actualDuration: null,
  completedAt: null,
  reminderSentAt: null,
  rescheduledFromId: null,
  lead: {
    id: 'lead-1',
    contactName: 'Jane Doe',
    companyName: null,
    status: 'walk_through_booked',
  },
  account: {
    id: 'account-1',
    name: 'Jane Doe Residence',
    type: 'residential',
  },
  facility: {
    id: 'facility-1',
    name: 'Maple Street Home',
  },
  assignedToUser: {
    id: 'user-1',
    fullName: 'Rep One',
    email: 'rep@example.com',
  },
  assignedTeam: null,
  createdByUser: {
    id: 'user-2',
    fullName: 'Admin User',
  },
  inspectionId: null,
  inspection: null,
  createdAt: '2026-04-16T20:00:00.000Z',
  updatedAt: '2026-04-17T18:30:00.000Z',
};

describe('AppointmentDetail', () => {
  beforeEach(() => {
    mockParams = { id: 'appt-1' };
    navigateMock.mockReset();
    getAppointmentMock.mockReset();
    getAppointmentMock.mockResolvedValue(appointment);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the last updated timestamp when the appointment has been edited', async () => {
    render(<AppointmentDetail />);

    expect(await screen.findByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument();
    const activityHeading = screen.getByRole('heading', { name: 'Activity' });
    const activityCard = activityHeading.closest('.p-4');
    expect(activityCard).not.toBeNull();
    expect(within(activityCard as HTMLElement).getByText(/^Created /i)).toBeInTheDocument();
    expect(within(activityCard as HTMLElement).getByText(/^Last updated /i)).toBeInTheDocument();
  });
});
