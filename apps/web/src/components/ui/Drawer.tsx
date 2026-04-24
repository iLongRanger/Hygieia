import React, { useEffect, useId } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
};

export const Drawer = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: DrawerProps) => {
  const titleId = useId();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-surface-900/40 backdrop-blur-sm dark:bg-black/50 animate-fade-in"
        onClick={onClose}
      />

      <div
        className={cn(
          'absolute inset-y-0 right-0 flex w-full flex-col border-l border-surface-200 bg-surface-50 shadow-soft-xl animate-drawer-in',
          'dark:border-surface-700 dark:bg-surface-800',
          sizeClasses[size]
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-start justify-between gap-4 border-b border-surface-200 px-6 py-4 dark:border-surface-700">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-surface-900 dark:text-surface-100">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 dark:text-surface-500 dark:hover:bg-surface-700 dark:hover:text-surface-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

        {footer && (
          <div className="border-t border-surface-200 bg-surface-50 px-6 py-3 dark:border-surface-700 dark:bg-surface-800/80">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
