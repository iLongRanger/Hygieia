import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../../test/test-utils';
import { DayCalendar } from '../DayCalendar';
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

describe('DayCalendar', () => {
  const baseDate = new Date(2026, 1, 2, 12, 0);
  const defaultProps = {
    date: baseDate,
    appointments: [] as Appointment[],
    onDateChange: vi.fn(),
    onEdit: vi.fn(),
    onCustomerClick: vi.fn(),
    onCreateClick: vi.fn(),
    layout: 'grid' as const,
  };

  it('renders the day label', () => {
    render(<DayCalendar {...defaultProps} />);
    const label = baseDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('renders appointments in list layout', () => {
    const appointments = [
      createMockAppointment('1', '2026-02-02T10:00:00Z'),
    ];

    render(<DayCalendar {...defaultProps} appointments={appointments} layout="list" />);
    expect(screen.getByText('Company 1')).toBeInTheDocument();
  });

  it('calls onDateChange when navigation buttons are clicked', () => {
    const onDateChange = vi.fn();
    render(<DayCalendar {...defaultProps} onDateChange={onDateChange} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]); // prev
    fireEvent.click(buttons[1]); // next

    expect(onDateChange).toHaveBeenCalledTimes(2);
  });
});
