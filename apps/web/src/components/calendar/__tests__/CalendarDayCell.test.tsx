import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '../../../test/test-utils';
import { CalendarDayCell } from '../CalendarDayCell';
import type { Appointment } from '../../../types/crm';

const createMockAppointment = (id: string, time: string): Appointment => ({
  id,
  type: 'walk_through',
  status: 'scheduled',
  scheduledStart: time,
  scheduledEnd: new Date(new Date(time).getTime() + 3600000).toISOString(),
  timezone: 'UTC',
  location: null,
  notes: null,
  completedAt: null,
  rescheduledFromId: null,
  lead: {
    id: 'lead-1',
    contactName: 'Test Contact',
    companyName: 'Test Company',
    status: 'walk_through_booked',
  },
  account: null,
  assignedToUser: {
    id: 'user-1',
    fullName: 'Rep User',
    email: 'rep@example.com',
  },
  createdByUser: {
    id: 'user-1',
    fullName: 'Admin',
  },
});

describe('CalendarDayCell', () => {
  const defaultProps = {
    date: new Date(2026, 0, 15), // January 15, 2026
    currentYear: 2026,
    currentMonth: 0, // January
    appointments: [] as Appointment[],
    onEdit: vi.fn(),
    onCustomerClick: vi.fn(),
    onCreateClick: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15)); // Set "today" to Jan 15, 2026
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Date display', () => {
    it('should display the day number', () => {
      render(<CalendarDayCell {...defaultProps} />);
      expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('should highlight today with primary color', () => {
      render(<CalendarDayCell {...defaultProps} />);
      const dayNumber = screen.getByText('15');
      expect(dayNumber).toHaveClass('bg-primary-600', 'text-white');
    });

    it('should not highlight non-today dates', () => {
      const props = {
        ...defaultProps,
        date: new Date(2026, 0, 16), // Tomorrow
      };
      render(<CalendarDayCell {...props} />);
      const dayNumber = screen.getByText('16');
      expect(dayNumber).not.toHaveClass('bg-primary-600');
    });

    it('should dim days from other months', () => {
      const props = {
        ...defaultProps,
        date: new Date(2025, 11, 31), // December 31, 2025 (previous month)
        currentYear: 2026,
        currentMonth: 0, // January
      };
      render(<CalendarDayCell {...props} />);
      const dayNumber = screen.getByText('31');
      expect(dayNumber).toHaveClass('text-surface-400');
    });
  });

  describe('Appointments display', () => {
    it('should display appointments', () => {
      const appointments = [
        createMockAppointment('1', '2026-01-15T10:00:00Z'),
      ];
      render(<CalendarDayCell {...defaultProps} appointments={appointments} />);
      expect(screen.getByText('Test Company')).toBeInTheDocument();
    });

    it('should display up to 3 appointments', () => {
      const appointments = [
        createMockAppointment('1', '2026-01-15T09:00:00Z'),
        createMockAppointment('2', '2026-01-15T10:00:00Z'),
        createMockAppointment('3', '2026-01-15T11:00:00Z'),
      ];
      render(<CalendarDayCell {...defaultProps} appointments={appointments} />);

      const buttons = screen.getAllByRole('button');
      // 3 appointment blocks
      expect(buttons.length).toBe(3);
    });

    it('should show "+N more" when more than 3 appointments', () => {
      const appointments = [
        createMockAppointment('1', '2026-01-15T09:00:00Z'),
        createMockAppointment('2', '2026-01-15T10:00:00Z'),
        createMockAppointment('3', '2026-01-15T11:00:00Z'),
        createMockAppointment('4', '2026-01-15T12:00:00Z'),
        createMockAppointment('5', '2026-01-15T13:00:00Z'),
      ];
      render(<CalendarDayCell {...defaultProps} appointments={appointments} />);

      expect(screen.getByText('+2 more')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onCreateClick when cell is clicked', () => {
      const onCreateClick = vi.fn();

      render(<CalendarDayCell {...defaultProps} onCreateClick={onCreateClick} />);

      // Click on the cell (not on an appointment)
      const cell = screen.getByText('15').closest('div')!.parentElement!;
      fireEvent.click(cell);

      expect(onCreateClick).toHaveBeenCalledWith(defaultProps.date);
    });

    it('should call onEdit when appointment block is clicked', () => {
      const onEdit = vi.fn();
      const appointments = [createMockAppointment('1', '2026-01-15T10:00:00Z')];

      render(
        <CalendarDayCell
          {...defaultProps}
          appointments={appointments}
          onEdit={onEdit}
        />
      );

      // Click the appointment button (not the customer name text)
      const appointmentBlock = screen.getByText('Test Company').closest('button')!;
      fireEvent.click(appointmentBlock);
      expect(onEdit).toHaveBeenCalled();
    });
  });

  describe('Compact mode', () => {
    it('should render dots instead of full blocks in compact mode', () => {
      const appointments = [createMockAppointment('1', '2026-01-15T10:00:00Z')];

      render(
        <CalendarDayCell
          {...defaultProps}
          appointments={appointments}
          compact
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-2', 'w-2', 'rounded-full');
    });
  });
});
