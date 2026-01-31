import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { CalendarGrid } from '../CalendarGrid';
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

describe('CalendarGrid', () => {
  const defaultProps = {
    year: 2026,
    month: 0, // January
    appointments: [] as Appointment[],
    onEdit: vi.fn(),
    onCustomerClick: vi.fn(),
    onCreateClick: vi.fn(),
  };

  describe('Weekday headers', () => {
    it('should display all weekday headers', () => {
      render(<CalendarGrid {...defaultProps} />);

      expect(screen.getByText('Sun')).toBeInTheDocument();
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Tue')).toBeInTheDocument();
      expect(screen.getByText('Wed')).toBeInTheDocument();
      expect(screen.getByText('Thu')).toBeInTheDocument();
      expect(screen.getByText('Fri')).toBeInTheDocument();
      expect(screen.getByText('Sat')).toBeInTheDocument();
    });
  });

  describe('Day cells', () => {
    it('should render 42 day cells (6 weeks)', () => {
      render(<CalendarGrid {...defaultProps} />);

      // Count all day numbers - expect 42 for the 6-week grid
      const dayNumbers = screen.getAllByText(/^\d+$/);
      expect(dayNumbers.length).toBe(42);
    });

    it('should display day 15 of the current month', () => {
      render(<CalendarGrid {...defaultProps} />);

      // Check a unique day that won't be duplicated
      expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('should display day 25 of the current month', () => {
      render(<CalendarGrid {...defaultProps} />);

      expect(screen.getByText('25')).toBeInTheDocument();
    });
  });

  describe('Appointments', () => {
    it('should display appointments in correct day cells', () => {
      const appointments = [
        createMockAppointment('1', '2026-01-15T10:00:00Z'),
      ];

      render(<CalendarGrid {...defaultProps} appointments={appointments} />);

      expect(screen.getByText('Company 1')).toBeInTheDocument();
    });

    it('should group multiple appointments on same day', () => {
      const appointments = [
        createMockAppointment('1', '2026-01-15T09:00:00Z'),
        createMockAppointment('2', '2026-01-15T14:00:00Z'),
      ];

      render(<CalendarGrid {...defaultProps} appointments={appointments} />);

      expect(screen.getByText('Company 1')).toBeInTheDocument();
      expect(screen.getByText('Company 2')).toBeInTheDocument();
    });

    it('should show appointments on different days', () => {
      const appointments = [
        createMockAppointment('1', '2026-01-10T10:00:00Z'),
        createMockAppointment('2', '2026-01-20T10:00:00Z'),
      ];

      render(<CalendarGrid {...defaultProps} appointments={appointments} />);

      expect(screen.getByText('Company 1')).toBeInTheDocument();
      expect(screen.getByText('Company 2')).toBeInTheDocument();
    });
  });

  describe('Different months', () => {
    it('should render February correctly', () => {
      const props = {
        ...defaultProps,
        month: 1, // February
      };

      render(<CalendarGrid {...props} />);

      // February 2026 has 28 days
      expect(screen.getByText('28')).toBeInTheDocument();
    });

    it('should render December correctly', () => {
      const props = {
        ...defaultProps,
        month: 11, // December
      };

      render(<CalendarGrid {...props} />);

      // December has 31 days
      expect(screen.getByText('31')).toBeInTheDocument();
    });
  });
});
