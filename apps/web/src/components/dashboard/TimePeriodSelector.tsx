import React, { useState } from 'react';
import type { TimePeriod } from '../../lib/dashboard';

interface TimePeriodSelectorProps {
  value: TimePeriod;
  onChange: (period: TimePeriod) => void;
  dateFrom?: string;
  dateTo?: string;
  onDateRangeChange?: (from: string, to: string) => void;
}

const presets: { value: TimePeriod; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'custom', label: 'Custom' },
];

const TimePeriodSelector: React.FC<TimePeriodSelectorProps> = ({
  value,
  onChange,
  dateFrom = '',
  dateTo = '',
  onDateRangeChange,
}) => {
  const [localFrom, setLocalFrom] = useState(dateFrom);
  const [localTo, setLocalTo] = useState(dateTo);

  const handleApply = () => {
    if (localFrom && localTo && onDateRangeChange) {
      onDateRangeChange(localFrom, localTo);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-surface-200 bg-surface-100 p-1 dark:border-surface-700 dark:bg-surface-800">
        {presets.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              value === opt.value
                ? 'bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-surface-100'
                : 'text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {value === 'custom' && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={localFrom}
            onChange={(e) => setLocalFrom(e.target.value)}
            className="rounded-md border border-surface-300 bg-white px-2 py-1.5 text-sm text-surface-900 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
          />
          <span className="text-sm text-surface-400">to</span>
          <input
            type="date"
            value={localTo}
            onChange={(e) => setLocalTo(e.target.value)}
            className="rounded-md border border-surface-300 bg-white px-2 py-1.5 text-sm text-surface-900 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
          />
          <button
            onClick={handleApply}
            disabled={!localFrom || !localTo}
            className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
};

export default TimePeriodSelector;
