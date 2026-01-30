import React from 'react';
import { cn } from '../../lib/utils';

interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  onRowClick?: (item: T) => void;
  className?: string;
  striped?: boolean;
}

export function Table<T extends { id: string | number }>({
  data,
  columns,
  isLoading,
  onRowClick,
  className,
  striped = true,
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full space-y-3 p-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-12 w-full rounded-lg skeleton"
          />
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex h-48 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-surface-200 p-8 text-center dark:border-surface-700">
        <div className="rounded-full bg-surface-100 p-3 dark:bg-surface-800">
          <svg
            className="h-6 w-6 text-surface-400 dark:text-surface-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
        <p className="mt-3 text-sm font-medium text-surface-600 dark:text-surface-400">No data available</p>
        <p className="mt-1 text-xs text-surface-400 dark:text-surface-500">Get started by creating a new item</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-full overflow-hidden',
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-800/50">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={cn(
                    'px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400',
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
            {data.map((item, rowIndex) => (
              <tr
                key={item.id}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  'transition-colors',
                  striped && rowIndex % 2 === 1 && 'bg-surface-50/50 dark:bg-surface-800/30',
                  'hover:bg-surface-100 dark:hover:bg-surface-800/50',
                  onRowClick && 'cursor-pointer'
                )}
              >
                {columns.map((col, i) => (
                  <td
                    key={i}
                    className="px-6 py-4 text-surface-700 dark:text-surface-300"
                  >
                    {col.cell
                      ? col.cell(item)
                      : col.accessorKey
                        ? String(item[col.accessorKey])
                        : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
