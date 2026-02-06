import React, { useId } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  hint?: string;
  showCharacterCount?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, hint, showCharacterCount, ...props }, ref) => {
    const inputId = props.id ?? useId();
    const currentLength = typeof props.value === 'string' ? props.value.length : 0;
    const maxLength = props.maxLength;
    const showCounter = showCharacterCount && maxLength;
    const isNearLimit = maxLength && currentLength >= maxLength * 0.9;

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
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
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
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex-1">
            {hint && !error && (
              <p className="text-xs text-surface-500 dark:text-surface-400">{hint}</p>
            )}
            {error && (
              <p className="text-xs text-error-600 dark:text-error-400">{error}</p>
            )}
          </div>
          {showCounter && (
            <p className={cn(
              'text-xs ml-2',
              isNearLimit
                ? 'text-warning-600 dark:text-warning-400'
                : 'text-surface-400 dark:text-surface-500'
            )}>
              {currentLength}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';
