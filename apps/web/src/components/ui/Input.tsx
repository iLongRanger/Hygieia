import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, hint, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
            {label}
            {props.required && <span className="ml-1 text-error-500">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'flex h-10 w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-surface-900 placeholder:text-surface-400 transition-all duration-200',
              'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
              'disabled:cursor-not-allowed disabled:bg-surface-100 disabled:text-surface-500',
              'dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:placeholder:text-surface-500',
              'dark:focus:border-primary-400 dark:focus:ring-primary-400/20',
              'dark:disabled:bg-surface-900 dark:disabled:text-surface-600',
              icon && 'pl-10',
              error && 'border-error-500 focus:border-error-500 focus:ring-error-500/20 dark:border-error-500',
              className
            )}
            {...props}
          />
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

Input.displayName = 'Input';
