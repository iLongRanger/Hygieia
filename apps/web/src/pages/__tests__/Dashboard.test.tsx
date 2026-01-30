import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/test-utils';
import Dashboard from '../Dashboard';
import { useAuthStore } from '../../stores/authStore';

const listAppointmentsMock = vi.fn();

vi.mock('../../lib/appointments', () => ({
  listAppointments: (...args: unknown[]) => listAppointmentsMock(...args),
}));

describe('Dashboard', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 'user-1', email: 'admin@example.com', fullName: 'Admin User', role: 'admin' },
      token: 'token',
      isAuthenticated: true,
    });
    listAppointmentsMock.mockReset();
  });

  it('shows upcoming appointments from the API', async () => {
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
        account: null,
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

    render(<Dashboard />);

    expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Rep One')).toBeInTheDocument();
    expect(listAppointmentsMock).toHaveBeenCalledWith({ includePast: false });
  });
});
