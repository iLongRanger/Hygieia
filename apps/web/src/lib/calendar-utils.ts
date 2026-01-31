import type { Appointment, AppointmentType } from '../types/crm';

export const APPOINTMENT_TYPE_COLORS: Record<
  AppointmentType,
  { bg: string; text: string; border: string; dot: string }
> = {
  walk_through: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
  },
  visit: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
    dot: 'bg-green-500',
  },
  inspection: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
    dot: 'bg-orange-500',
  },
};

export function getCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Get the starting day (Sunday = 0)
  const startOffset = firstDay.getDay();

  // Calculate start date (may be in previous month)
  const startDate = new Date(year, month, 1 - startOffset);

  // Always return 42 days (6 weeks) for consistent grid
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    days.push(date);
  }

  return days;
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function isSameMonth(date: Date, year: number, month: number): boolean {
  return date.getFullYear() === year && date.getMonth() === month;
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function groupAppointmentsByDate(
  appointments: Appointment[]
): Map<string, Appointment[]> {
  const grouped = new Map<string, Appointment[]>();

  for (const appointment of appointments) {
    const date = new Date(appointment.scheduledStart);
    const key = formatDateKey(date);

    const existing = grouped.get(key) || [];
    existing.push(appointment);
    grouped.set(key, existing);
  }

  // Sort appointments within each day by start time
  for (const [key, dayAppointments] of grouped) {
    dayAppointments.sort(
      (a, b) =>
        new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
    );
  }

  return grouped;
}

export function formatTime(date: Date): string {
  return date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function getDateRange(year: number, month: number): { dateFrom: string; dateTo: string } {
  const days = getCalendarDays(year, month);
  const firstDay = days[0];
  const lastDay = days[days.length - 1];

  return {
    dateFrom: firstDay.toISOString(),
    dateTo: new Date(lastDay.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString(),
  };
}
