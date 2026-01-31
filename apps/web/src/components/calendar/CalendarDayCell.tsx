import React from 'react';
import { cn } from '../../lib/utils';
import { isToday, isSameMonth } from '../../lib/calendar-utils';
import { AppointmentBlock } from './AppointmentBlock';
import type { Appointment } from '../../types/crm';

const MAX_VISIBLE_APPOINTMENTS = 3;

interface CalendarDayCellProps {
  date: Date;
  currentYear: number;
  currentMonth: number;
  appointments: Appointment[];
  onEdit: (appointment: Appointment) => void;
  onCustomerClick: (appointment: Appointment) => void;
  onCreateClick: (date: Date) => void;
  compact?: boolean;
}

export const CalendarDayCell: React.FC<CalendarDayCellProps> = ({
  date,
  currentYear,
  currentMonth,
  appointments,
  onEdit,
  onCustomerClick,
  onCreateClick,
  compact = false,
}) => {
  const isCurrentMonth = isSameMonth(date, currentYear, currentMonth);
  const isTodayDate = isToday(date);
  const dayNumber = date.getDate();

  const visibleAppointments = appointments.slice(0, MAX_VISIBLE_APPOINTMENTS);
  const hiddenCount = appointments.length - MAX_VISIBLE_APPOINTMENTS;

  const handleCellClick = () => {
    onCreateClick(date);
  };

  return (
    <div
      onClick={handleCellClick}
      className={cn(
        'min-h-[100px] cursor-pointer border-b border-r border-surface-200 p-1 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800/50',
        !isCurrentMonth && 'bg-surface-50/50 dark:bg-surface-800/30',
        compact && 'min-h-[60px]'
      )}
    >
      <div className="flex items-start justify-between">
        <span
          className={cn(
            'inline-flex h-6 w-6 items-center justify-center rounded-full text-sm',
            isTodayDate &&
              'bg-primary-600 font-semibold text-white dark:bg-primary-500',
            !isTodayDate &&
              isCurrentMonth &&
              'text-surface-900 dark:text-surface-100',
            !isTodayDate &&
              !isCurrentMonth &&
              'text-surface-400 dark:text-surface-500'
          )}
        >
          {dayNumber}
        </span>
      </div>

      <div className={cn('mt-1 space-y-1', compact && 'flex flex-wrap gap-1')}>
        {compact ? (
          // Compact view - just show colored dots
          appointments.slice(0, 5).map((apt) => (
            <AppointmentBlock
              key={apt.id}
              appointment={apt}
              onEdit={onEdit}
              onCustomerClick={onCustomerClick}
              compact
            />
          ))
        ) : (
          // Full view - show appointment chips
          <>
            {visibleAppointments.map((apt) => (
              <AppointmentBlock
                key={apt.id}
                appointment={apt}
                onEdit={onEdit}
                onCustomerClick={onCustomerClick}
              />
            ))}
            {hiddenCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Could open a popover with all appointments
                }}
                className="w-full text-left text-xs text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
              >
                +{hiddenCount} more
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
