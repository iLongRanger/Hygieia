import React from 'react';
import { Calendar } from 'lucide-react';
import { Select } from '../ui/Select';
import { TimeSelect } from '../ui/TimeSelect';
import { Button } from '../ui/Button';

interface ScheduleOption {
  value: string;
  label: string;
}

interface DayOption {
  value: string;
  label: string;
}

interface ClientServiceScheduleCardProps {
  frequencyValue: string;
  frequencyOptions: ScheduleOption[];
  allowedWindowStart: string;
  allowedWindowEnd: string;
  dayOptions: DayOption[];
  selectedDays: string[];
  requiredDays: number;
  onFrequencyChange: (value: string) => void;
  onAllowedWindowStartChange: (value: string) => void;
  onAllowedWindowEndChange: (value: string) => void;
  onToggleDay: (day: string) => void;
}

export const ClientServiceScheduleCard: React.FC<ClientServiceScheduleCardProps> = ({
  frequencyValue,
  frequencyOptions,
  allowedWindowStart,
  allowedWindowEnd,
  dayOptions,
  selectedDays,
  requiredDays,
  onFrequencyChange,
  onAllowedWindowStartChange,
  onAllowedWindowEndChange,
  onToggleDay,
}) => {
  return (
    <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800/40 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-gold" />
        <div>
          <h3 className="text-sm font-semibold text-surface-900 dark:text-white">Client Service Schedule</h3>
          <p className="text-xs text-surface-500 dark:text-surface-400">
            Select exact service days (Mon-Sun) and allowed arrival window.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Select
          label="Cleaning Frequency"
          value={frequencyValue}
          onChange={onFrequencyChange}
          options={frequencyOptions}
        />
        <TimeSelect
          label="Allowed Start Time"
          value={allowedWindowStart}
          onChange={(value) => onAllowedWindowStartChange(value || '00:00')}
        />
        <TimeSelect
          label="Allowed End Time"
          value={allowedWindowEnd}
          onChange={(value) => onAllowedWindowEndChange(value || '23:59')}
        />
      </div>

      <div className="space-y-2">
        <div className="text-xs text-surface-500 dark:text-surface-400">Required days: {requiredDays}</div>
        <div className="flex flex-wrap gap-2">
          {dayOptions.map((option) => {
            const selected = selectedDays.includes(option.value);
            return (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={selected ? 'primary' : 'secondary'}
                onClick={() => onToggleDay(option.value)}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
        <p className="text-xs text-surface-500">
          Window anchor: start day. Example: 6:00 PM to 6:00 AM on Monday runs overnight into Tuesday morning.
        </p>
      </div>
    </div>
  );
};

export default ClientServiceScheduleCard;
