import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean;
  hover?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, noPadding = false, hover = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative overflow-hidden rounded-xl border border-surface-200 bg-white shadow-soft dark:border-surface-700 dark:bg-surface-800',
          !noPadding && 'p-6',
          hover && 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft-lg hover:border-surface-300 dark:hover:border-surface-600',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
