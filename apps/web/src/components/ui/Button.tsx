import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary:
        'bg-primary-600 hover:bg-primary-700 text-white shadow-sm hover:shadow-md dark:bg-primary-600 dark:hover:bg-primary-500',
      secondary:
        'bg-surface-100 hover:bg-surface-200 text-surface-700 border border-surface-200 dark:bg-surface-700 dark:hover:bg-surface-600 dark:text-surface-200 dark:border-surface-600',
      outline:
        'bg-transparent border-2 border-primary-600 text-primary-600 hover:bg-primary-50 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-950',
      ghost:
        'bg-transparent hover:bg-surface-100 text-surface-600 hover:text-surface-900 dark:hover:bg-surface-800 dark:text-surface-400 dark:hover:text-surface-100',
      danger:
        'bg-error-600 hover:bg-error-700 text-white shadow-sm dark:bg-error-600 dark:hover:bg-error-500',
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm gap-1.5',
      md: 'h-10 px-4 gap-2',
      lg: 'h-12 px-6 text-lg gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
