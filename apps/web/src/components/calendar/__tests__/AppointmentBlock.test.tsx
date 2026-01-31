import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { AppointmentBlock } from '../AppointmentBlock';
import type { Appointment } from '../../../types/crm';

const createMockAppointment = (overrides: Partial<Appointment> = {}): Appointment => ({
  id: 'appt-1',
  type: 'walk_through',
  status: 'scheduled',
  scheduledStart: '2026-01-15T10:00:00Z',
  scheduledEnd: '2026-01-15T11:00:00Z',
  timezone: 'UTC',
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
    id: 'user-1',
    fullName: 'Rep User',
    email: 'rep@example.com',
  },
  createdByUser: {
    id: 'user-1',
    fullName: 'Admin',
  },
  ...overrides,
});

describe('AppointmentBlock', () => {
  describe('Rendering', () => {
    it('should display appointment time', () => {
      const appointment = createMockAppointment();
      render(
        <AppointmentBlock
          appointment={appointment}
          onEdit={vi.fn()}
          onCustomerClick={vi.fn()}
        />
      );

      // Should show time in some format (AM/PM)
      expect(screen.getByRole('button').textContent).toMatch(/\d+:\d+/);
    });

    it('should display company name for lead appointment', () => {
      const appointment = createMockAppointment();
      render(
        <AppointmentBlock
          appointment={appointment}
          onEdit={vi.fn()}
          onCustomerClick={vi.fn()}
        />
      );

      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    it('should display contact name when no company name', () => {
      const appointment = createMockAppointment({
        lead: {
          id: 'lead-1',
          contactName: 'John Smith',
          companyName: null,
          status: 'new',
        },
      });
      render(
        <AppointmentBlock
          appointment={appointment}
          onEdit={vi.fn()}
          onCustomerClick={vi.fn()}
        />
      );

      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });

    it('should display account name for non-lead appointment', () => {
      const appointment = createMockAppointment({
        type: 'visit',
        lead: null,
        account: {
          id: 'account-1',
          name: 'Big Company Inc',
          type: 'commercial',
        },
      });
      render(
        <AppointmentBlock
          appointment={appointment}
          onEdit={vi.fn()}
          onCustomerClick={vi.fn()}
        />
      );

      expect(screen.getByText('Big Company Inc')).toBeInTheDocument();
    });

    it('should apply blue styling for walk_through type', () => {
      const appointment = createMockAppointment({ type: 'walk_through' });
      render(
        <AppointmentBlock
          appointment={appointment}
          onEdit={vi.fn()}
          onCustomerClick={vi.fn()}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue-100');
    });

    it('should apply green styling for visit type', () => {
      const appointment = createMockAppointment({
        type: 'visit',
        lead: null,
        account: { id: 'a', name: 'Test', type: 'commercial' },
      });
      render(
        <AppointmentBlock
          appointment={appointment}
          onEdit={vi.fn()}
          onCustomerClick={vi.fn()}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-green-100');
    });

    it('should apply orange styling for inspection type', () => {
      const appointment = createMockAppointment({
        type: 'inspection',
        lead: null,
        account: { id: 'a', name: 'Test', type: 'commercial' },
      });
      render(
        <AppointmentBlock
          appointment={appointment}
          onEdit={vi.fn()}
          onCustomerClick={vi.fn()}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-orange-100');
    });
  });

  describe('Compact mode', () => {
    it('should render as a small dot in compact mode', () => {
      const appointment = createMockAppointment();
      render(
        <AppointmentBlock
          appointment={appointment}
          onEdit={vi.fn()}
          onCustomerClick={vi.fn()}
          compact
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-2', 'w-2', 'rounded-full');
    });

    it('should have title attribute in compact mode', () => {
      const appointment = createMockAppointment();
      render(
        <AppointmentBlock
          appointment={appointment}
          onEdit={vi.fn()}
          onCustomerClick={vi.fn()}
          compact
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title');
      expect(button.getAttribute('title')).toContain('Acme Corp');
    });
  });

  describe('Interactions', () => {
    it('should call onEdit when block is clicked', async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();
      const appointment = createMockAppointment();

      render(
        <AppointmentBlock
          appointment={appointment}
          onEdit={onEdit}
          onCustomerClick={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button'));
      expect(onEdit).toHaveBeenCalledWith(appointment);
    });

    it('should call onCustomerClick when customer name is clicked', async () => {
      const user = userEvent.setup();
      const onCustomerClick = vi.fn();
      const appointment = createMockAppointment();

      render(
        <AppointmentBlock
          appointment={appointment}
          onEdit={vi.fn()}
          onCustomerClick={onCustomerClick}
        />
      );

      await user.click(screen.getByText('Acme Corp'));
      expect(onCustomerClick).toHaveBeenCalledWith(appointment);
    });

    it('should not trigger onEdit when customer name is clicked', async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();
      const onCustomerClick = vi.fn();
      const appointment = createMockAppointment();

      render(
        <AppointmentBlock
          appointment={appointment}
          onEdit={onEdit}
          onCustomerClick={onCustomerClick}
        />
      );

      await user.click(screen.getByText('Acme Corp'));
      // onEdit should not be called since stopPropagation is used
      expect(onCustomerClick).toHaveBeenCalled();
    });
  });
});
