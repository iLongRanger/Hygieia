import React from 'react';
import { Card } from '../ui/Card';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtitle,
  icon: Icon,
  color,
  bg,
}) => {
  return (
    <Card hover className="flex items-start gap-4">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${bg}`}
      >
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-surface-500 dark:text-surface-400">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-surface-100">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {subtitle && (
          <p className="mt-0.5 text-xs text-surface-400 dark:text-surface-500">
            {subtitle}
          </p>
        )}
      </div>
    </Card>
  );
};

export default StatCard;
