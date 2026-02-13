import React from 'react';
import type { TimePeriod } from '../../lib/dashboard';

interface TimePeriodSelectorProps {
  value: TimePeriod;
  onChange: (period: TimePeriod) => void;
}

const options: { value: TimePeriod; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
];

const TimePeriodSelector: React.FC<TimePeriodSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <div className="inline-flex rounded-lg border border-surface-200 bg-surface-100 p-1 dark:border-surface-700 dark:bg-surface-800">
      {options.map((opt) => (
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
  );
};

export default TimePeriodSelector;
