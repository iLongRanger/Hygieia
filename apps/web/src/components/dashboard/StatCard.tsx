import React from 'react';
import { Card } from '../ui/Card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  change?: number | null;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtitle,
  icon: Icon,
  color,
  bg,
  change,
  onClick,
}) => {
  return (
    <Card
      hover
      className={`flex items-start gap-4 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${bg}`}
      >
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-surface-500 dark:text-surface-400">
          {label}
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-2xl font-bold text-surface-900 dark:text-surface-100">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {change !== undefined && change !== null && (
            <span
              className={`inline-flex items-center text-xs font-semibold ${
                change >= 0
                  ? 'text-success-600 dark:text-success-400'
                  : 'text-danger-600 dark:text-danger-400'
              }`}
            >
              {change >= 0 ? (
                <ArrowUpRight className="mr-0.5 h-3 w-3" />
              ) : (
                <ArrowDownRight className="mr-0.5 h-3 w-3" />
              )}
              {Math.abs(change)}%
            </span>
          )}
        </div>
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
