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
const listFacilitiesMock = vi.fn();
const listResidentialPropertiesMock = vi.fn();

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

vi.mock('../../lib/facilities', () => ({
  listFacilities: (...args: unknown[]) => listFacilitiesMock(...args),
}));

vi.mock('../../lib/residential', () => ({
  listResidentialProperties: (...args: unknown[]) => listResidentialPropertiesMock(...args),
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

const renderAppointmentsPage = async (initialRoute = '/') => {
  render(<AppointmentsPage />, { initialRoute });
  await waitFor(() => {
    expect(listAppointmentsMock).toHaveBeenCalled();
    expect(listLeadsMock).toHaveBeenCalled();
    expect(listUsersMock).toHaveBeenCalled();
    expect(listContractsMock).toHaveBeenCalled();
    expect(listFacilitiesMock).toHaveBeenCalled();
    expect(listResidentialPropertiesMock).toHaveBeenCalled();
  });
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
    listFacilitiesMock.mockReset();
    listResidentialPropertiesMock.mockReset();

    // Default mock responses
    listAppointmentsMock.mockResolvedValue([]);
    listLeadsMock.mockResolvedValue({ data: [] });
    listUsersMock.mockResolvedValue({ data: [] });
    listContractsMock.mockResolvedValue({ data: [] });
    listFacilitiesMock.mockResolvedValue({ data: [] });
    listResidentialPropertiesMock.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Table view', () => {
    it('loads and displays appointments in table view', async () => {
      listAppointmentsMock.mockResolvedValue([mockAppointment]);

      await renderAppointmentsPage();

      expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Rep One')).toBeInTheDocument();
      expect(screen.getByText('Facility')).toBeInTheDocument();
      expect(listAppointmentsMock).toHaveBeenCalledWith({
        leadId: undefined,
        accountId: undefined,
        facilityId: undefined,
        assignedToUserId: undefined,
        type: undefined,
        status: undefined,
        includePast: false,
      });
    });

    it('applies facility and type filters from the route query string', async () => {
      await renderAppointmentsPage('/appointments?facilityId=facility-1&type=walk_through');

      expect(
        listAppointmentsMock.mock.calls.some(
          ([params]) =>
            params?.facilityId === 'facility-1'
            && params?.type === 'walk_through'
            && params?.includePast === false
        )
      ).toBe(true);
    });

    it('shows table view by default', async () => {
      await renderAppointmentsPage();

      // Table button should be active (has primary bg)
      const tableButton = screen.getByRole('button', { name: /table/i });
      expect(tableButton).toHaveClass('bg-primary-600');
    });

    it('hides scheduling controls without appointments write permission', async () => {
      useAuthStore.setState({
        user: {
          id: 'viewer-1',
          email: 'viewer@example.com',
          fullName: 'Viewer User',
          role: 'viewer',
          permissions: {
            appointments_read: true,
          },
        },
        token: 'token',
        isAuthenticated: true,
      });

      await renderAppointmentsPage();

      expect(screen.queryByRole('button', { name: /schedule appointment/i })).not.toBeInTheDocument();
    });

    it('only shows owner admin and manager users in assigned rep options', async () => {
      const user = userEvent.setup();
      listUsersMock.mockResolvedValue({
        data: [
          {
            id: 'owner-1',
            fullName: 'Owner User',
            email: 'owner@example.com',
            roles: [{ role: { key: 'owner' } }],
          },
          {
            id: 'manager-1',
            fullName: 'Manager User',
            email: 'manager@example.com',
            roles: [{ role: { key: 'manager' } }],
          },
          {
            id: 'cleaner-1',
            fullName: 'Cleaner User',
            email: 'cleaner@example.com',
            roles: [{ role: { key: 'cleaner' } }],
          },
        ],
      });

      await renderAppointmentsPage();

      await user.click(screen.getByRole('button', { name: /schedule appointment/i }));
      await user.click(await screen.findByLabelText(/assigned rep/i));

      expect(await screen.findByText('Owner User')).toBeInTheDocument();
      expect(screen.getByText('Manager User')).toBeInTheDocument();
      expect(screen.queryByText('Cleaner User')).not.toBeInTheDocument();
    });

    it('uses one date field instead of a separate end date when scheduling', async () => {
      const user = userEvent.setup();

      await renderAppointmentsPage();

      await user.click(screen.getByRole('button', { name: /schedule appointment/i }));

      expect(await screen.findByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end time/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/end date/i)).not.toBeInTheDocument();
    });

    it('only shows walkthrough facilities without an existing walkthrough booking', async () => {
      const user = userEvent.setup();
      listAppointmentsMock.mockResolvedValue([
        {
          ...mockAppointment,
          facility: { id: 'facility-booked', name: 'Booked Facility' },
        },
      ]);
      listLeadsMock.mockResolvedValue({
        data: [
          {
            id: 'lead-1',
            contactName: 'Jane Doe',
            companyName: 'Acme Corp',
            convertedToAccountId: 'account-1',
          },
        ],
      });
      listFacilitiesMock.mockResolvedValue({
        data: [
          {
            id: 'facility-booked',
            name: 'Booked Facility',
            account: { id: 'account-1', name: 'Acme Corp' },
          },
          {
            id: 'facility-open',
            name: 'Open Facility',
            account: { id: 'account-1', name: 'Acme Corp' },
          },
        ],
      });

      await renderAppointmentsPage();

      await user.click(screen.getByRole('button', { name: /schedule appointment/i }));
      await user.selectOptions(await screen.findByLabelText(/^lead$/i), 'lead-1');
      const facilitySelect = screen.getByLabelText(/facility/i);

      expect(await screen.findByRole('option', { name: 'Open Facility' })).toBeInTheDocument();
      expect(
        screen.queryByRole('option', { name: 'Booked Facility' })
      ).not.toBeInTheDocument();
      expect(facilitySelect).toBeInTheDocument();
    });

    it('shows properties for residential walkthroughs and submits the linked facility id', async () => {
      const user = userEvent.setup();
      const residentialAccountId = '11111111-1111-4111-8111-111111111111';
      listLeadsMock.mockResolvedValue({
        data: [
          {
            id: 'lead-res-1',
            type: 'residential',
            contactName: 'Jane Doe',
            companyName: null,
            convertedToAccountId: residentialAccountId,
            convertedToAccount: {
              id: residentialAccountId,
              name: 'Jane Doe Residence',
              type: 'residential',
            },
          },
        ],
      });
      listResidentialPropertiesMock.mockResolvedValue({
        data: [
          {
            id: 'property-1',
            accountId: residentialAccountId,
            name: 'Maple Street Home',
            facility: { id: 'facility-property-1' },
            serviceAddress: null,
            homeProfile: null,
            isPrimary: true,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            archivedAt: null,
          },
        ],
      });
      listUsersMock.mockResolvedValue({
        data: [
          {
            id: 'manager-1',
            fullName: 'Manager User',
            email: 'manager@example.com',
            roles: [{ role: { key: 'manager' } }],
          },
        ],
      });
      createAppointmentMock.mockResolvedValue({ id: 'appt-new' });

      await renderAppointmentsPage();

      await user.click(screen.getByRole('button', { name: /schedule appointment/i }));
      await user.selectOptions(await screen.findByLabelText(/^lead$/i), 'lead-res-1');

      await waitFor(() => {
        expect(listResidentialPropertiesMock).toHaveBeenCalledWith(
          expect.objectContaining({
            accountId: residentialAccountId,
            includeArchived: false,
            limit: 100,
          })
        );
      });

      expect(await screen.findByLabelText(/^property$/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/^facility$/i)).not.toBeInTheDocument();

      await user.selectOptions(screen.getByLabelText(/^property$/i), 'facility-property-1');
      await user.selectOptions(screen.getByLabelText(/assigned rep/i), 'manager-1');
      await user.type(screen.getByLabelText(/start date/i), '2026-04-20');
      await user.selectOptions(screen.getByLabelText(/start time/i), '09:00');
      await user.selectOptions(screen.getByLabelText(/end time/i), '10:00');

      await user.click(screen.getByRole('button', { name: /^schedule$/i }));

      await waitFor(() => {
        expect(createAppointmentMock).toHaveBeenCalledWith(
          expect.objectContaining({
            leadId: 'lead-res-1',
            facilityId: 'facility-property-1',
            type: 'walk_through',
          })
        );
      });
    });

    it('marks residential walkthrough locations as properties in the table', async () => {
      listAppointmentsMock.mockResolvedValue([
        {
          ...mockAppointment,
          account: { id: 'account-1', name: 'Jane Doe Residence', type: 'residential' },
          facility: { id: 'facility-property-1', name: 'Maple Street Home' },
        },
      ]);

      await renderAppointmentsPage();

      expect(await screen.findByText('Maple Street Home')).toBeInTheDocument();
      expect(screen.getByText('Property')).toBeInTheDocument();
    });
  });

  describe('View toggle', () => {
    it('displays view toggle buttons', async () => {
      await renderAppointmentsPage();

      expect(screen.getByRole('button', { name: /table/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /calendar/i })).toBeInTheDocument();
    });

    it('switches to calendar view when calendar button is clicked', async () => {
      const user = userEvent.setup();
      listAppointmentsMock.mockResolvedValue([]);

      await renderAppointmentsPage();

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

      await renderAppointmentsPage();

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

      await renderAppointmentsPage();

      await user.click(screen.getByRole('button', { name: /calendar/i }));

      await waitFor(() => {
        expect(localStorage.getItem('appointments_view_mode')).toBe('calendar');
      });
    });

    it('restores view preference from localStorage', async () => {
      localStorage.setItem('appointments_view_mode', 'calendar');
      listAppointmentsMock.mockResolvedValue([]);

      await renderAppointmentsPage();

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

      await renderAppointmentsPage();

      // Should show current month
      const monthYear = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

      await waitFor(() => {
        expect(screen.getByText(monthYear)).toBeInTheDocument();
      });
    });

    it('displays weekday headers in calendar', async () => {
      localStorage.setItem('appointments_view_mode', 'calendar');
      listAppointmentsMock.mockResolvedValue([]);

      await renderAppointmentsPage();

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

      await renderAppointmentsPage();

      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      });
    });

    it('fetches appointments with date range for calendar view', async () => {
      localStorage.setItem('appointments_view_mode', 'calendar');
      listAppointmentsMock.mockResolvedValue([]);

      await renderAppointmentsPage();

      await waitFor(() => {
        const today = new Date();
        const { dateFrom, dateTo } = getDateRange(today.getFullYear(), today.getMonth());
        expect(
          listAppointmentsMock.mock.calls.some(
            ([params]) =>
              params?.dateFrom === dateFrom
              && params?.dateTo === dateTo
              && params?.includePast === true
          )
        ).toBe(true);
      });
    });

    it('fetches appointments with week range when week view is selected', async () => {
      const user = userEvent.setup();
      localStorage.setItem('appointments_view_mode', 'calendar');
      listAppointmentsMock.mockResolvedValue([]);

      await renderAppointmentsPage();

      await user.click(screen.getByRole('button', { name: /week/i }));

      await waitFor(() => {
        const { dateFrom, dateTo } = getWeekRange(new Date());
        expect(
          listAppointmentsMock.mock.calls.some(
            ([params]) =>
              params?.dateFrom === dateFrom
              && params?.dateTo === dateTo
              && params?.includePast === true
          )
        ).toBe(true);
      });
    });

    it('fetches appointments with day range when day view is selected', async () => {
      const user = userEvent.setup();
      localStorage.setItem('appointments_view_mode', 'calendar');
      listAppointmentsMock.mockResolvedValue([]);

      await renderAppointmentsPage();

      await user.click(screen.getByRole('button', { name: /^day$/i }));

      await waitFor(() => {
        const { dateFrom, dateTo } = getDayRange(new Date());
        expect(
          listAppointmentsMock.mock.calls.some(
            ([params]) =>
              params?.dateFrom === dateFrom
              && params?.dateTo === dateTo
              && params?.includePast === true
          )
        ).toBe(true);
      });
    });

    it('persists calendar view preference to localStorage', async () => {
      const user = userEvent.setup();
      localStorage.setItem('appointments_view_mode', 'calendar');
      listAppointmentsMock.mockResolvedValue([]);

      await renderAppointmentsPage();

      await user.click(screen.getByRole('button', { name: /week/i }));

      await waitFor(() => {
        expect(localStorage.getItem('appointments_calendar_view')).toBe('week');
      });
    });

    it('restores calendar view preference from localStorage', async () => {
      localStorage.setItem('appointments_view_mode', 'calendar');
      localStorage.setItem('appointments_calendar_view', 'day');
      listAppointmentsMock.mockResolvedValue([]);

      await renderAppointmentsPage();

      await waitFor(() => {
        const dayButton = screen.getByRole('button', { name: /^day$/i });
        expect(dayButton).toHaveClass('bg-primary-600');
      });
    });

    it('shows appointment type legend', async () => {
      localStorage.setItem('appointments_view_mode', 'calendar');
      listAppointmentsMock.mockResolvedValue([]);

      await renderAppointmentsPage();

      await waitFor(() => {
        expect(screen.getByText('Walk Through')).toBeInTheDocument();
        expect(screen.getByText('Visit')).toBeInTheDocument();
        expect(screen.getByText('Inspection')).toBeInTheDocument();
      });
    });
  });

  describe('Schedule button', () => {
    it('displays schedule appointment button', async () => {
      await renderAppointmentsPage();

      expect(screen.getByRole('button', { name: /schedule appointment/i })).toBeInTheDocument();
    });
  });
});



