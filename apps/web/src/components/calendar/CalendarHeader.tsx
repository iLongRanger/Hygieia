import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatMonthYear } from '../../lib/calendar-utils';

interface CalendarHeaderProps {
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  onPrevMonth,
  onNextMonth,
  onToday,
}) => {
  return (
    <div className="flex items-center justify-between border-b border-surface-200 px-4 py-3 dark:border-surface-700">
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onPrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="sm" onClick={onNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onToday}>
          Today
        </Button>
      </div>

      <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
        {formatMonthYear(currentDate)}
      </h2>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-3 text-xs sm:flex">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            Walk Through
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            Visit
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
            Inspection
          </span>
        </div>
      </div>
    </div>
  );
};
