import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
}

export function Table<T extends { id: string | number }>({
  data,
  columns,
  isLoading,
  onRowClick,
  className,
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full space-y-4 p-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-12 w-full animate-pulse rounded-lg bg-white/5"
          />
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex h-40 w-full flex-col items-center justify-center rounded-lg border border-dashed border-white/10 p-8 text-center text-gray-400">
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-xl border border-white/10',
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-gray-300">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={cn('px-6 py-4 font-medium', col.className)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-navy-dark/30">
            {data.map((item) => (
              <tr
                key={item.id}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  'transition-colors hover:bg-white/5',
                  onRowClick && 'cursor-pointer'
                )}
              >
                {columns.map((col, i) => (
                  <td key={i} className="px-6 py-4 text-gray-300">
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
