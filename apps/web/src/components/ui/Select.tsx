import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'onChange'
> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  onChange?: (value: string) => void;
  hint?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      options,
      placeholder,
      onChange,
      value,
      hint,
      ...props
    },
    ref
  ) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
            {label}
            {props.required && <span className="ml-1 text-error-500">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            className={cn(
              'flex h-10 w-full appearance-none rounded-lg border border-surface-300 bg-white px-3 py-2 pr-10 text-surface-900 transition-all duration-200',
              'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
              'disabled:cursor-not-allowed disabled:bg-surface-100 disabled:text-surface-500',
              'dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100',
              'dark:focus:border-primary-400 dark:focus:ring-primary-400/20',
              'dark:disabled:bg-surface-900 dark:disabled:text-surface-600',
              error && 'border-error-500 focus:border-error-500 focus:ring-error-500/20 dark:border-error-500',
              !value && 'text-surface-400 dark:text-surface-500',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                className="bg-white text-surface-900 dark:bg-surface-800 dark:text-surface-100"
              >
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400 dark:text-surface-500" />
        </div>
        {hint && !error && (
          <p className="mt-1.5 text-xs text-surface-500 dark:text-surface-400">{hint}</p>
        )}
        {error && (
          <p className="mt-1.5 text-xs text-error-600 dark:text-error-400">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
