import React from 'react';
import { getCalendarDays, formatDateKey, groupAppointmentsByDate } from '../../lib/calendar-utils';
import { CalendarDayCell } from './CalendarDayCell';
import type { Appointment } from '../../types/crm';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface CalendarGridProps {
  year: number;
  month: number;
  appointments: Appointment[];
  onEdit: (appointment: Appointment) => void;
  onCustomerClick: (appointment: Appointment) => void;
  onCreateClick: (date: Date) => void;
  compact?: boolean;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  year,
  month,
  appointments,
  onEdit,
  onCustomerClick,
  onCreateClick,
  compact = false,
}) => {
  const days = getCalendarDays(year, month);
  const appointmentsByDate = groupAppointmentsByDate(appointments);

  return (
    <div className="flex flex-col">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-800/50">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="border-r border-surface-200 px-2 py-2 text-center text-xs font-medium uppercase tracking-wide text-surface-500 last:border-r-0 dark:border-surface-700 dark:text-surface-400"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day cells grid */}
      <div className="grid grid-cols-7">
        {days.map((date, index) => {
          const dateKey = formatDateKey(date);
          const dayAppointments = appointmentsByDate.get(dateKey) || [];

          return (
            <CalendarDayCell
              key={index}
              date={date}
              currentYear={year}
              currentMonth={month}
              appointments={dayAppointments}
              onEdit={onEdit}
              onCustomerClick={onCustomerClick}
              onCreateClick={onCreateClick}
              compact={compact}
            />
          );
        })}
      </div>
    </div>
  );
};
