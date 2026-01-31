import { describe, it, expect } from 'vitest';
import {
  getCalendarDays,
  isSameDay,
  isToday,
  isSameMonth,
  formatMonthYear,
  formatDateKey,
  groupAppointmentsByDate,
  formatTime,
  getDateRange,
  APPOINTMENT_TYPE_COLORS,
} from '../calendar-utils';
import type { Appointment } from '../../types/crm';

describe('calendar-utils', () => {
  describe('APPOINTMENT_TYPE_COLORS', () => {
    it('should have colors for walk_through', () => {
      expect(APPOINTMENT_TYPE_COLORS.walk_through).toBeDefined();
      expect(APPOINTMENT_TYPE_COLORS.walk_through.bg).toContain('blue');
      expect(APPOINTMENT_TYPE_COLORS.walk_through.dot).toBe('bg-blue-500');
    });

    it('should have colors for visit', () => {
      expect(APPOINTMENT_TYPE_COLORS.visit).toBeDefined();
      expect(APPOINTMENT_TYPE_COLORS.visit.bg).toContain('green');
      expect(APPOINTMENT_TYPE_COLORS.visit.dot).toBe('bg-green-500');
    });

    it('should have colors for inspection', () => {
      expect(APPOINTMENT_TYPE_COLORS.inspection).toBeDefined();
      expect(APPOINTMENT_TYPE_COLORS.inspection.bg).toContain('orange');
      expect(APPOINTMENT_TYPE_COLORS.inspection.dot).toBe('bg-orange-500');
    });
  });

  describe('getCalendarDays', () => {
    it('should return 42 days for a 6-week grid', () => {
      const days = getCalendarDays(2026, 0); // January 2026
      expect(days).toHaveLength(42);
    });

    it('should start from Sunday of the first week', () => {
      // January 2026 starts on Thursday
      const days = getCalendarDays(2026, 0);
      // First day should be Sunday Dec 28, 2025
      expect(days[0].getDay()).toBe(0); // Sunday
    });

    it('should include days from previous month if needed', () => {
      // January 2026 starts on Thursday, so we need days from Dec 2025
      const days = getCalendarDays(2026, 0);
      // First few days should be in December
      expect(days[0].getMonth()).toBe(11); // December (0-indexed)
    });

    it('should include days from next month if needed', () => {
      const days = getCalendarDays(2026, 0); // January 2026
      // Last day in the grid should be in February
      expect(days[41].getMonth()).toBe(1); // February
    });

    it('should return all days of the target month', () => {
      const days = getCalendarDays(2026, 1); // February 2026
      const februaryDays = days.filter(
        (d) => d.getMonth() === 1 && d.getFullYear() === 2026
      );
      expect(februaryDays).toHaveLength(28); // 2026 is not a leap year
    });
  });

  describe('isSameDay', () => {
    it('should return true for same dates', () => {
      const date1 = new Date(2026, 0, 15, 10, 30);
      const date2 = new Date(2026, 0, 15, 14, 45);
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for different days', () => {
      const date1 = new Date(2026, 0, 15);
      const date2 = new Date(2026, 0, 16);
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('should return false for different months', () => {
      const date1 = new Date(2026, 0, 15);
      const date2 = new Date(2026, 1, 15);
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('should return false for different years', () => {
      const date1 = new Date(2026, 0, 15);
      const date2 = new Date(2027, 0, 15);
      expect(isSameDay(date1, date2)).toBe(false);
    });
  });

  describe('isToday', () => {
    it('should return true for today', () => {
      const today = new Date();
      expect(isToday(today)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isToday(tomorrow)).toBe(false);
    });
  });

  describe('isSameMonth', () => {
    it('should return true for date in same month', () => {
      const date = new Date(2026, 5, 15); // June 15, 2026
      expect(isSameMonth(date, 2026, 5)).toBe(true);
    });

    it('should return false for different month', () => {
      const date = new Date(2026, 5, 15);
      expect(isSameMonth(date, 2026, 6)).toBe(false);
    });

    it('should return false for different year', () => {
      const date = new Date(2026, 5, 15);
      expect(isSameMonth(date, 2027, 5)).toBe(false);
    });
  });

  describe('formatMonthYear', () => {
    it('should format January 2026 correctly', () => {
      const date = new Date(2026, 0, 15);
      expect(formatMonthYear(date)).toBe('January 2026');
    });

    it('should format December 2026 correctly', () => {
      const date = new Date(2026, 11, 1);
      expect(formatMonthYear(date)).toBe('December 2026');
    });
  });

  describe('formatDateKey', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date(2026, 0, 5);
      expect(formatDateKey(date)).toBe('2026-01-05');
    });

    it('should pad single digit month and day', () => {
      const date = new Date(2026, 2, 9);
      expect(formatDateKey(date)).toBe('2026-03-09');
    });
  });

  describe('groupAppointmentsByDate', () => {
    const createAppointment = (id: string, date: string): Appointment => ({
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
      lead: { id: 'lead-1', contactName: 'Test', companyName: null, status: 'new' },
      account: null,
      assignedToUser: { id: 'user-1', fullName: 'Test User', email: 'test@example.com' },
      createdByUser: { id: 'user-1', fullName: 'Test User' },
    });

    it('should group appointments by date', () => {
      const appointments = [
        createAppointment('1', '2026-01-15T10:00:00Z'),
        createAppointment('2', '2026-01-15T14:00:00Z'),
        createAppointment('3', '2026-01-16T09:00:00Z'),
      ];

      const grouped = groupAppointmentsByDate(appointments);
      expect(grouped.get('2026-01-15')).toHaveLength(2);
      expect(grouped.get('2026-01-16')).toHaveLength(1);
    });

    it('should sort appointments within each day by start time', () => {
      const appointments = [
        createAppointment('1', '2026-01-15T14:00:00Z'),
        createAppointment('2', '2026-01-15T09:00:00Z'),
        createAppointment('3', '2026-01-15T11:00:00Z'),
      ];

      const grouped = groupAppointmentsByDate(appointments);
      const dayAppointments = grouped.get('2026-01-15')!;

      expect(dayAppointments[0].id).toBe('2');
      expect(dayAppointments[1].id).toBe('3');
      expect(dayAppointments[2].id).toBe('1');
    });

    it('should return empty map for empty array', () => {
      const grouped = groupAppointmentsByDate([]);
      expect(grouped.size).toBe(0);
    });
  });

  describe('formatTime', () => {
    it('should format morning time correctly', () => {
      const date = new Date(2026, 0, 15, 9, 30);
      expect(formatTime(date)).toMatch(/9:30\s*AM/i);
    });

    it('should format afternoon time correctly', () => {
      const date = new Date(2026, 0, 15, 14, 45);
      expect(formatTime(date)).toMatch(/2:45\s*PM/i);
    });

    it('should format noon correctly', () => {
      const date = new Date(2026, 0, 15, 12, 0);
      expect(formatTime(date)).toMatch(/12:00\s*PM/i);
    });
  });

  describe('getDateRange', () => {
    it('should return date range covering the calendar grid', () => {
      const { dateFrom, dateTo } = getDateRange(2026, 0); // January 2026
      const from = new Date(dateFrom);
      const to = new Date(dateTo);

      // Should cover 42 days
      expect(to.getTime() - from.getTime()).toBeGreaterThan(41 * 24 * 60 * 60 * 1000);
    });

    it('should start from Sunday of first week', () => {
      const { dateFrom } = getDateRange(2026, 0);
      const from = new Date(dateFrom);
      expect(from.getDay()).toBe(0); // Sunday
    });
  });
});
