import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/test-utils';
import AppointmentsPage from '../appointments/AppointmentsPage';
import { useAuthStore } from '../../stores/authStore';

const listAppointmentsMock = vi.fn();
const createAppointmentMock = vi.fn();
const updateAppointmentMock = vi.fn();
const deleteAppointmentMock = vi.fn();
const listLeadsMock = vi.fn();
const listUsersMock = vi.fn();

vi.mock('../../lib/appointments', () => ({
  listAppointments: (...args: unknown[]) => listAppointmentsMock(...args),
  createAppointment: (...args: unknown[]) => createAppointmentMock(...args),
  updateAppointment: (...args: unknown[]) => updateAppointmentMock(...args),
  deleteAppointment: (...args: unknown[]) => deleteAppointmentMock(...args),
}));

vi.mock('../../lib/leads', () => ({
  listLeads: (...args: unknown[]) => listLeadsMock(...args),
}));

vi.mock('../../lib/users', () => ({
  listUsers: (...args: unknown[]) => listUsersMock(...args),
}));

describe('AppointmentsPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 'user-1', email: 'admin@example.com', fullName: 'Admin User', role: 'admin' },
      token: 'token',
      isAuthenticated: true,
    });
    listAppointmentsMock.mockReset();
    createAppointmentMock.mockReset();
    updateAppointmentMock.mockReset();
    deleteAppointmentMock.mockReset();
    listLeadsMock.mockReset();
    listUsersMock.mockReset();
  });

  it('loads and displays appointments', async () => {
    listAppointmentsMock.mockResolvedValue([
      {
        id: 'appt-1',
        type: 'walk_through',
        status: 'scheduled',
        scheduledStart: new Date('2026-02-01T15:00:00Z').toISOString(),
        scheduledEnd: new Date('2026-02-01T16:00:00Z').toISOString(),
        timezone: 'America/New_York',
        location: null,
        notes: null,
        completedAt: null,
        rescheduledFromId: null,
        lead: {
          id: 'lead-1',
          contactName: 'Jane Doe',
          companyName: 'Acme Corp',
          status: 'walk_through_booked',
        },
        assignedToUser: {
          id: 'user-2',
          fullName: 'Rep One',
          email: 'rep@example.com',
        },
        createdByUser: {
          id: 'user-1',
          fullName: 'Admin User',
        },
      },
    ]);
    listLeadsMock.mockResolvedValue({ data: [] });
    listUsersMock.mockResolvedValue({ data: [] });

    render(<AppointmentsPage />);

    expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Rep One')).toBeInTheDocument();
    expect(listAppointmentsMock).toHaveBeenCalledWith({
      leadId: undefined,
      assignedToUserId: undefined,
      type: undefined,
      status: undefined,
      includePast: false,
    });
  });
});
