import type { Appointment, AppointmentType } from '../types/crm';

export const APPOINTMENT_TYPE_COLORS: Record<
  AppointmentType | 'job',
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
  job: {
    bg: 'bg-violet-100 dark:bg-violet-900/30',
    text: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-200 dark:border-violet-800',
    dot: 'bg-violet-500',
  },
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim();
  const match = /^#([0-9A-Fa-f]{6})$/.exec(normalized);
  if (!match) return null;

  const value = match[1];
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function rgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function getAppointmentColors(appointment: Appointment) {
  if (appointment.calendarColor) {
    return {
      bg: '',
      text: '',
      border: '',
      dot: '',
      style: {
        backgroundColor: rgba(appointment.calendarColor, 0.16),
        borderColor: rgba(appointment.calendarColor, 0.42),
        color: appointment.calendarColor,
      },
      dotStyle: {
        backgroundColor: appointment.calendarColor,
      },
    };
  }

  const colorKey = appointment.calendarColorKey || appointment.type;
  return {
    ...APPOINTMENT_TYPE_COLORS[colorKey],
    style: undefined,
    dotStyle: undefined,
  };
}

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

function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getDayRange(date: Date): { dateFrom: string; dateTo: string } {
  const start = startOfDay(date);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return {
    dateFrom: start.toISOString(),
    dateTo: end.toISOString(),
  };
}

export function getWeekRange(date: Date): { dateFrom: string; dateTo: string } {
  const start = startOfDay(date);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return {
    dateFrom: start.toISOString(),
    dateTo: end.toISOString(),
  };
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfDay(date);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export function getTimeSlots(startHour: number, endHour: number, stepMins: number): Date[] {
  const slots: Date[] = [];
  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;

  for (let minutes = startMinutes; minutes < endMinutes; minutes += stepMins) {
    const slot = new Date(1970, 0, 1, 0, 0, 0, 0);
    slot.setMinutes(minutes);
    slots.push(slot);
  }

  return slots;
}

export function formatWeekRangeLabel(date: Date): string {
  const weekDays = getWeekDays(date);
  const start = weekDays[0];
  const end = weekDays[weekDays.length - 1];
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();

  if (sameMonth && sameYear) {
    const month = start.toLocaleString('en-US', { month: 'short' });
    return `${month} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
  }

  if (sameYear) {
    const startLabel = start.toLocaleString('en-US', { month: 'short', day: 'numeric' });
    const endLabel = end.toLocaleString('en-US', { month: 'short', day: 'numeric' });
    return `${startLabel} - ${endLabel}, ${start.getFullYear()}`;
  }

  const startLabel = start.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const endLabel = end.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startLabel} - ${endLabel}`;
}
