import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps extends ToastData {
  onClose: (id: string) => void;
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success: {
    container: 'bg-success-50 border-success-200 dark:bg-success-900/20 dark:border-success-800',
    icon: 'text-success-600 dark:text-success-400',
    title: 'text-success-800 dark:text-success-200',
    message: 'text-success-700 dark:text-success-300',
  },
  error: {
    container: 'bg-error-50 border-error-200 dark:bg-error-900/20 dark:border-error-800',
    icon: 'text-error-600 dark:text-error-400',
    title: 'text-error-800 dark:text-error-200',
    message: 'text-error-700 dark:text-error-300',
  },
  warning: {
    container: 'bg-warning-50 border-warning-200 dark:bg-warning-900/20 dark:border-warning-800',
    icon: 'text-warning-600 dark:text-warning-400',
    title: 'text-warning-800 dark:text-warning-200',
    message: 'text-warning-700 dark:text-warning-300',
  },
  info: {
    container: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    title: 'text-blue-800 dark:text-blue-200',
    message: 'text-blue-700 dark:text-blue-300',
  },
};

export const Toast = ({ id, type, title, message, duration = 5000, onClose }: ToastProps) => {
  const [isExiting, setIsExiting] = useState(false);
  const Icon = icons[type];
  const style = styles[type];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onClose(id), 200);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, id, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(id), 200);
  };

  return (
    <div
      className={cn(
        'pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg border shadow-soft-lg transition-all duration-200',
        style.container,
        isExiting ? 'opacity-0 translate-x-2' : 'opacity-100 translate-x-0 animate-slide-in-right'
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Icon className={cn('h-5 w-5 flex-shrink-0', style.icon)} />
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-medium', style.title)}>{title}</p>
            {message && (
              <p className={cn('mt-1 text-sm', style.message)}>{message}</p>
            )}
          </div>
          <button
            onClick={handleClose}
            className={cn(
              'flex-shrink-0 rounded-lg p-1 transition-colors',
              'hover:bg-black/5 dark:hover:bg-white/10',
              style.icon
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Toast Container Component
interface ToastContainerProps {
  toasts: ToastData[];
  onClose: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const ToastContainer = ({
  toasts,
  onClose,
  position = 'top-right',
}: ToastContainerProps) => {
  const positions = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col gap-2 pointer-events-none',
        positions[position]
      )}
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
};
