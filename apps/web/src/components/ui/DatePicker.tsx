import React, { useId, useRef } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  hint?: string;
}

export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, label, error, hint, ...props }, forwardedRef) => {
    const generatedId = useId();
    const inputId = props.id ?? generatedId;
    const inputRef = useRef<HTMLInputElement | null>(null);

    const setRefs = (node: HTMLInputElement | null) => {
      inputRef.current = node;

      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    };

    const openPicker = () => {
      const input = inputRef.current;
      if (!input || props.disabled) {
        return;
      }

      if (typeof input.showPicker === 'function') {
        input.showPicker();
        return;
      }

      input.focus();
    };

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300"
          >
            {label}
            {props.required && <span className="ml-1 text-error-500">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={setRefs}
            id={inputId}
            type="date"
            className={cn(
              'flex h-10 w-full rounded-lg border border-surface-300 bg-surface-50 px-3 py-2 pr-11 text-surface-900 placeholder:text-surface-400 transition-all duration-200',
              'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30',
              'disabled:cursor-not-allowed disabled:bg-surface-100 disabled:text-surface-500',
              'dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:placeholder:text-surface-500',
              'dark:focus:border-primary-400 dark:focus:ring-primary-400/20',
              'dark:disabled:bg-surface-900 dark:disabled:text-surface-600',
              error && 'border-error-500 focus:border-error-500 focus:ring-error-500/20 dark:border-error-500',
              className
            )}
            {...props}
          />
          <button
            type="button"
            aria-label={`Open ${label ?? 'date'} picker`}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-surface-500 transition-colors hover:bg-surface-200 hover:text-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-100"
            disabled={props.disabled}
            onClick={openPicker}
          >
            <Calendar className="h-4 w-4" />
          </button>
        </div>
        {(hint || error) && (
          <div className="mt-1.5">
            {hint && !error && (
              <p className="text-xs text-surface-500 dark:text-surface-400">{hint}</p>
            )}
            {error && (
              <p className="text-xs text-error-600 dark:text-error-400">{error}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';
