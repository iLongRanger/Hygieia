import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../../test/test-utils';
import { MonthCalendar } from '../MonthCalendar';
import type { Appointment } from '../../../types/crm';

const createMockAppointment = (id: string, date: string): Appointment => ({
  id,
  type: 'walk_through',
  status: 'scheduled',
  scheduledStart: date,
  scheduledEnd: new Date(new Date(date).getTime() + 3600000).toISOString(),
  timezone: 'UTC',
  location: null,
  notes: null,
  completedAt: null,
  rescheduledFromId: null,
  lead: {
    id: 'lead-1',
    contactName: 'Test Contact',
    companyName: `Company ${id}`,
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

describe('MonthCalendar', () => {
  const defaultProps = {
    year: 2026,
    month: 0, // January
    appointments: [] as Appointment[],
    onMonthChange: vi.fn(),
    onEdit: vi.fn(),
    onCustomerClick: vi.fn(),
    onCreateClick: vi.fn(),
  };

  describe('Rendering', () => {
    it('should render the calendar header with current month', () => {
      render(<MonthCalendar {...defaultProps} />);
      expect(screen.getByText('January 2026')).toBeInTheDocument();
    });

    it('should render the calendar grid', () => {
      render(<MonthCalendar {...defaultProps} />);
      expect(screen.getByText('Sun')).toBeInTheDocument();
      expect(screen.getByText('Mon')).toBeInTheDocument();
    });

    it('should display appointments', () => {
      const appointments = [
        createMockAppointment('1', '2026-01-15T10:00:00Z'),
      ];

      render(<MonthCalendar {...defaultProps} appointments={appointments} />);
      expect(screen.getByText('Company 1')).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should show loading spinner when isLoading is true', () => {
      render(<MonthCalendar {...defaultProps} isLoading />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should not show loading spinner when isLoading is false', () => {
      render(<MonthCalendar {...defaultProps} isLoading={false} />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });
  });

  describe('Month navigation', () => {
    it('should call onMonthChange with previous month when prev clicked', () => {
      const onMonthChange = vi.fn();

      render(<MonthCalendar {...defaultProps} onMonthChange={onMonthChange} />);

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]); // First button is prev

      expect(onMonthChange).toHaveBeenCalledWith(2025, 11); // December 2025
    });

    it('should call onMonthChange with next month when next clicked', () => {
      const onMonthChange = vi.fn();

      render(<MonthCalendar {...defaultProps} onMonthChange={onMonthChange} />);

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]); // Second button is next

      expect(onMonthChange).toHaveBeenCalledWith(2026, 1); // February 2026
    });

    it('should navigate to current month when Today button is clicked', () => {
      const onMonthChange = vi.fn();
      const today = new Date();

      // Start in a different month
      const props = {
        ...defaultProps,
        year: 2025,
        month: 6, // July 2025
        onMonthChange,
      };

      render(<MonthCalendar {...props} />);

      fireEvent.click(screen.getByRole('button', { name: /today/i }));

      expect(onMonthChange).toHaveBeenCalledWith(today.getFullYear(), today.getMonth());
    });
  });

  describe('Event handlers', () => {
    it('should call onEdit when appointment block is clicked', () => {
      const onEdit = vi.fn();
      const appointments = [
        createMockAppointment('1', '2026-01-15T10:00:00Z'),
      ];

      render(
        <MonthCalendar
          {...defaultProps}
          appointments={appointments}
          onEdit={onEdit}
        />
      );

      // Find the appointment block button and click it
      const appointmentBlock = screen.getByText('Company 1').closest('button')!;
      fireEvent.click(appointmentBlock);
      expect(onEdit).toHaveBeenCalled();
    });

    it('should call onCreateClick when empty day is clicked', () => {
      const onCreateClick = vi.fn();

      render(<MonthCalendar {...defaultProps} onCreateClick={onCreateClick} />);

      // Click on day 20 (which should be empty)
      const day20 = screen.getByText('20');
      const cell = day20.closest('div')!.parentElement!;
      fireEvent.click(cell);

      expect(onCreateClick).toHaveBeenCalled();
    });
  });

  describe('Different months', () => {
    it('should display February correctly', () => {
      const props = {
        ...defaultProps,
        month: 1,
      };

      render(<MonthCalendar {...props} />);
      expect(screen.getByText('February 2026')).toBeInTheDocument();
    });

    it('should display December correctly', () => {
      const props = {
        ...defaultProps,
        month: 11,
      };

      render(<MonthCalendar {...props} />);
      expect(screen.getByText('December 2026')).toBeInTheDocument();
    });
  });
});
