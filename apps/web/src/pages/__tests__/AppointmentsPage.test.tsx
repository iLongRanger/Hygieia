import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import AppointmentsPage from '../appointments/AppointmentsPage';
import { useAuthStore } from '../../stores/authStore';
import { getDateRange, getDayRange, getWeekRange } from '../../lib/calendar-utils';

const listAppointmentsMock = vi.fn();
const createAppointmentMock = vi.fn();
const updateAppointmentMock = vi.fn();
const deleteAppointmentMock = vi.fn();
const listLeadsMock = vi.fn();
const listUsersMock = vi.fn();
const listContractsMock = vi.fn();

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

vi.mock('../../lib/contracts', () => ({
  listContracts: (...args: unknown[]) => listContractsMock(...args),
}));

const mockAppointment = {
  id: 'appt-1',
  type: 'walk_through' as const,
  status: 'scheduled' as const,
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
};

describe('AppointmentsPage', () => {
  beforeEach(() => {
    // Clear localStorage to reset view preference
    localStorage.clear();

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
    listContractsMock.mockReset();

    // Default mock responses
    listAppointmentsMock.mockResolvedValue([]);
    listLeadsMock.mockResolvedValue({ data: [] });
    listUsersMock.mockResolvedValue({ data: [] });
    listContractsMock.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Table view', () => {
    it('loads and displays appointments in table view', async () => {
      listAppointmentsMock.mockResolvedValue([mockAppointment]);

      render(<AppointmentsPage />);

      expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Rep One')).toBeInTheDocument();
      expect(listAppointmentsMock).toHaveBeenCalledWith({
        leadId: undefined,
        accountId: undefined,
        assignedToUserId: undefined,
        type: undefined,
        status: undefined,
        includePast: false,
      });
    });

    it('shows table view by default', async () => {
      render(<AppointmentsPage />);

      // Table button should be active (has primary bg)
      const tableButton = screen.getByRole('button', { name: /table/i });
      expect(tableButton).toHaveClass('bg-primary-600');
    });
  });

  describe('View toggle', () => {
    it('displays view toggle buttons', () => {
      render(<AppointmentsPage />);

      expect(screen.getByRole('button', { name: /table/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /calendar/i })).toBeInTheDocument();
    });

    it('switches to calendar view when calendar button is clicked', async () => {
      const user = userEvent.setup();
      listAppointmentsMock.mockResolvedValue([]);

      render(<AppointmentsPage />);

      await user.click(screen.getByRole('button', { name: /calendar/i }));

      // Calendar button should now be active
      const calendarButton = screen.getByRole('button', { name: /calendar/i });
      expect(calendarButton).toHaveClass('bg-primary-600');

      // Calendar header elements should be visible
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument();
      });
    });

    it('switches back to table view when table button is clicked', async () => {
      const user = userEvent.setup();
      listAppointmentsMock.mockResolvedValue([]);

      render(<AppointmentsPage />);

      // Switch to calendar
      await user.click(screen.getByRole('button', { name: /calendar/i }));

      // Switch back to table
      await user.click(screen.getByRole('button', { name: /table/i }));

      // Table button should be active
      const tableButton = screen.getByRole('button', { name: /table/i });
      expect(tableButton).toHaveClass('bg-primary-600');
    });

    it('persists view preference to localStorage', async () => {
      const user = userEvent.setup();
      listAppointmentsMock.mockResolvedValue([]);

      render(<AppointmentsPage />);

      await user.click(screen.getByRole('button', { name: /calendar/i }));

      await waitFor(() => {
        expect(localStorage.getItem('appointments_view_mode')).toBe('calendar');
      });
    });

    it('restores view preference from localStorage', async () => {
      localStorage.setItem('appointments_view_mode', 'calendar');
      listAppointmentsMock.mockResolvedValue([]);

      render(<AppointmentsPage />);

      await waitFor(() => {
        const calendarButton = screen.getByRole('button', { name: /calendar/i });
        expect(calendarButton).toHaveClass('bg-primary-600');
      });
    });
  });

  describe('Calendar view', () => {
    it('displays calendar with month header', async () => {
      localStorage.setItem('appointments_view_mode', 'calendar');
      listAppointmentsMock.mockResolvedValue([]);

      render(<AppointmentsPage />);

      // Should show current month
      const monthYear = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

      await waitFor(() => {
        expect(screen.getByText(monthYear)).toBeInTheDocument();
      });
    });

    it('displays weekday headers in calendar', async () => {
      localStorage.setItem('appointments_view_mode', 'calendar');
      listAppointmentsMock.mockResolvedValue([]);

      render(<AppointmentsPage />);

      await waitFor(() => {
        expect(screen.getByText('Sun')).toBeInTheDocument();
        expect(screen.getByText('Mon')).toBeInTheDocument();
        expect(screen.getByText('Sat')).toBeInTheDocument();
      });
    });

    it('displays appointments in calendar', async () => {
      localStorage.setItem('appointments_view_mode', 'calendar');
      // Create appointment for current month
      const today = new Date();
      const appointmentForCurrentMonth = {
        ...mockAppointment,
        scheduledStart: new Date(today.getFullYear(), today.getMonth(), 15, 10, 0).toISOString(),
        scheduledEnd: new Date(today.getFullYear(), today.getMonth(), 15, 11, 0).toISOString(),
      };
      listAppointmentsMock.mockResolvedValue([appointmentForCurrentMonth]);

      render(<AppointmentsPage />);

      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      });
    });

    it('fetches appointments with date range for calendar view', async () => {
      localStorage.setItem('appointments_view_mode', 'calendar');
      listAppointmentsMock.mockResolvedValue([]);

      render(<AppointmentsPage />);

      await waitFor(() => {
        const today = new Date();
        const { dateFrom, dateTo } = getDateRange(today.getFullYear(), today.getMonth());
        const lastCall = listAppointmentsMock.mock.calls[listAppointmentsMock.mock.calls.length - 1][0];
        expect(lastCall).toEqual(
          expect.objectContaining({
            dateFrom,
            dateTo,
            includePast: true,
          })
        );
      });
    });

    it('fetches appointments with week range when week view is selected', async () => {
      const user = userEvent.setup();
      localStorage.setItem('appointments_view_mode', 'calendar');
      listAppointmentsMock.mockResolvedValue([]);

      render(<AppointmentsPage />);

      await user.click(screen.getByRole('button', { name: /week/i }));

      await waitFor(() => {
        const { dateFrom, dateTo } = getWeekRange(new Date());
        const lastCall = listAppointmentsMock.mock.calls[listAppointmentsMock.mock.calls.length - 1][0];
        expect(lastCall).toEqual(
          expect.objectContaining({
            dateFrom,
            dateTo,
            includePast: true,
          })
        );
      });
    });

    it('fetches appointments with day range when day view is selected', async () => {
      const user = userEvent.setup();
      localStorage.setItem('appointments_view_mode', 'calendar');
      listAppointmentsMock.mockResolvedValue([]);

      render(<AppointmentsPage />);

      await user.click(screen.getByRole('button', { name: /^day$/i }));

      await waitFor(() => {
        const { dateFrom, dateTo } = getDayRange(new Date());
        const lastCall = listAppointmentsMock.mock.calls[listAppointmentsMock.mock.calls.length - 1][0];
        expect(lastCall).toEqual(
          expect.objectContaining({
            dateFrom,
            dateTo,
            includePast: true,
          })
        );
      });
    });

    it('persists calendar view preference to localStorage', async () => {
      const user = userEvent.setup();
      localStorage.setItem('appointments_view_mode', 'calendar');
      listAppointmentsMock.mockResolvedValue([]);

      render(<AppointmentsPage />);

      await user.click(screen.getByRole('button', { name: /week/i }));

      await waitFor(() => {
        expect(localStorage.getItem('appointments_calendar_view')).toBe('week');
      });
    });

    it('restores calendar view preference from localStorage', async () => {
      localStorage.setItem('appointments_view_mode', 'calendar');
      localStorage.setItem('appointments_calendar_view', 'day');
      listAppointmentsMock.mockResolvedValue([]);

      render(<AppointmentsPage />);

      await waitFor(() => {
        const dayButton = screen.getByRole('button', { name: /^day$/i });
        expect(dayButton).toHaveClass('bg-primary-600');
      });
    });

    it('shows appointment type legend', async () => {
      localStorage.setItem('appointments_view_mode', 'calendar');
      listAppointmentsMock.mockResolvedValue([]);

      render(<AppointmentsPage />);

      await waitFor(() => {
        expect(screen.getByText('Walk Through')).toBeInTheDocument();
        expect(screen.getByText('Visit')).toBeInTheDocument();
        expect(screen.getByText('Inspection')).toBeInTheDocument();
      });
    });
  });

  describe('Schedule button', () => {
    it('displays schedule appointment button', () => {
      render(<AppointmentsPage />);

      expect(screen.getByRole('button', { name: /schedule appointment/i })).toBeInTheDocument();
    });
  });
});


