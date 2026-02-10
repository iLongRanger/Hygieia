import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface ExpiringContract {
  id: string;
  contractNumber: string;
  title: string;
  accountName: string;
  monthlyValue: number;
  endDate: string;
  status: string;
}

interface ExpiringContractsTableProps {
  data: ExpiringContract[];
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const ExpiringContractsTable: React.FC<ExpiringContractsTableProps> = ({
  data,
}) => {
  if (data.length === 0) return null;

  return (
    <Card noPadding>
      <div className="px-6 pt-6 pb-2">
        <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
          Contracts Expiring Soon
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-200 dark:border-surface-700">
              <th className="px-6 py-3 text-left font-medium text-surface-500 dark:text-surface-400">
                Contract
              </th>
              <th className="px-6 py-3 text-left font-medium text-surface-500 dark:text-surface-400">
                Account
              </th>
              <th className="px-6 py-3 text-right font-medium text-surface-500 dark:text-surface-400">
                Monthly Value
              </th>
              <th className="px-6 py-3 text-right font-medium text-surface-500 dark:text-surface-400">
                Expires
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((contract) => {
              const days = daysUntil(contract.endDate);
              const urgency: 'error' | 'warning' | 'info' =
                days <= 14 ? 'error' : days <= 30 ? 'warning' : 'info';

              return (
                <tr
                  key={contract.id}
                  className="border-b border-surface-100 last:border-0 dark:border-surface-800"
                >
                  <td className="px-6 py-3">
                    <div className="font-medium text-surface-800 dark:text-surface-200">
                      {contract.title}
                    </div>
                    <div className="text-xs text-surface-400 dark:text-surface-500">
                      {contract.contractNumber}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-surface-600 dark:text-surface-300">
                    {contract.accountName}
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-surface-800 dark:text-surface-200">
                    ${contract.monthlyValue.toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Badge variant={urgency} size="sm">
                      {days <= 0 ? 'Today' : `${days}d`}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default ExpiringContractsTable;
