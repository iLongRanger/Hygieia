import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  size?: 'sm' | 'md';
}

export const Badge = ({
  className,
  variant = 'default',
  size = 'md',
  ...props
}: BadgeProps) => {
  const variants = {
    success: 'bg-success-50 text-success-700 border-success-200 dark:bg-success-900/30 dark:text-success-400 dark:border-success-800',
    warning: 'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-900/30 dark:text-warning-400 dark:border-warning-800',
    error: 'bg-error-50 text-error-700 border-error-200 dark:bg-error-900/30 dark:text-error-400 dark:border-error-800',
    info: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    default: 'bg-surface-100 text-surface-600 border-surface-200 dark:bg-surface-700 dark:text-surface-300 dark:border-surface-600',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-2xs',
    md: 'px-2.5 py-0.5 text-xs',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
};
