import React from 'react';
import { CalendarHeader } from './CalendarHeader';
import { CalendarGrid } from './CalendarGrid';
import type { Appointment } from '../../types/crm';

interface MonthCalendarProps {
  year: number;
  month: number;
  appointments: Appointment[];
  onMonthChange: (year: number, month: number) => void;
  onEdit: (appointment: Appointment) => void;
  onCustomerClick: (appointment: Appointment) => void;
  onCreateClick: (date: Date) => void;
  isLoading?: boolean;
}

export const MonthCalendar: React.FC<MonthCalendarProps> = ({
  year,
  month,
  appointments,
  onMonthChange,
  onEdit,
  onCustomerClick,
  onCreateClick,
  isLoading = false,
}) => {
  const currentDate = new Date(year, month, 1);

  const handlePrevMonth = () => {
    const newDate = new Date(year, month - 1, 1);
    onMonthChange(newDate.getFullYear(), newDate.getMonth());
  };

  const handleNextMonth = () => {
    const newDate = new Date(year, month + 1, 1);
    onMonthChange(newDate.getFullYear(), newDate.getMonth());
  };

  const handleToday = () => {
    const today = new Date();
    onMonthChange(today.getFullYear(), today.getMonth());
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-surface-200 bg-white shadow-soft dark:border-surface-700 dark:bg-surface-800">
      <CalendarHeader
        currentDate={currentDate}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onToday={handleToday}
      />

      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-surface-800/50">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        )}

        <CalendarGrid
          year={year}
          month={month}
          appointments={appointments}
          onEdit={onEdit}
          onCustomerClick={onCustomerClick}
          onCreateClick={onCreateClick}
        />
      </div>
    </div>
  );
};
