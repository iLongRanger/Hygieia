import React from 'react';
import { Select } from './Select';

interface TimeSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string;
  hint?: string;
  value?: string | null;
  onChange?: (value: string) => void;
  minuteStep?: number;
  placeholder?: string;
}

const normalizeTimeValue = (value: string) => {
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;

  const hours = Math.min(23, Math.max(0, Number(match[1]) || 0));
  const minutes = Math.min(59, Math.max(0, Number(match[2]) || 0));
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const formatTimeLabel = (value: string) => {
  const normalized = normalizeTimeValue(value);
  const [hourPart, minutePart] = normalized.split(':');
  const hour = Number(hourPart);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutePart} ${suffix}`;
};

const buildTimeOptions = (minuteStep: number, currentValue?: string | null) => {
  const step = minuteStep > 0 ? minuteStep : 15;
  const options: { value: string; label: string }[] = [];

  for (let totalMinutes = 0; totalMinutes < 24 * 60; totalMinutes += step) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    options.push({ value, label: formatTimeLabel(value) });
  }

  const normalizedCurrentValue = currentValue ? normalizeTimeValue(currentValue) : '';
  if (normalizedCurrentValue && !options.some((option) => option.value === normalizedCurrentValue)) {
    options.push({
      value: normalizedCurrentValue,
      label: formatTimeLabel(normalizedCurrentValue),
    });
    options.sort((a, b) => a.value.localeCompare(b.value));
  }

  return options;
};

export const TimeSelect = React.forwardRef<HTMLSelectElement, TimeSelectProps>(
  (
    {
      value,
      onChange,
      minuteStep = 15,
      placeholder = 'Select time',
      ...props
    },
    ref
  ) => {
    const normalizedValue = value ? normalizeTimeValue(value) : '';

    return (
      <Select
        ref={ref}
        value={normalizedValue}
        onChange={(nextValue) => onChange?.(nextValue)}
        options={buildTimeOptions(minuteStep, normalizedValue)}
        placeholder={placeholder}
        {...props}
      />
    );
  }
);

TimeSelect.displayName = 'TimeSelect';

