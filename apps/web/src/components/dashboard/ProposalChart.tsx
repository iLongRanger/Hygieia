import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card } from '../ui/Card';

interface ProposalChartProps {
  data: { status: string; count: number; totalAmount: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#94a3b8',
  sent: '#3b82f6',
  viewed: '#8b5cf6',
  accepted: '#10b981',
  rejected: '#ef4444',
  expired: '#f59e0b',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  accepted: 'Accepted',
  rejected: 'Rejected',
  expired: 'Expired',
};

const formatCurrency = (val: number) =>
  val >= 1000
    ? `$${(val / 1000).toFixed(1)}k`
    : `$${val.toLocaleString()}`;

const ProposalChart: React.FC<ProposalChartProps> = ({ data }) => {
  const chartData = data
    .filter((d) => d.count > 0)
    .map((d) => ({
      name: STATUS_LABELS[d.status] || d.status,
      value: d.count,
      amount: d.totalAmount,
      fill: STATUS_COLORS[d.status] || '#94a3b8',
    }));

  const isDark = document.documentElement.classList.contains('dark');

  if (chartData.length === 0) {
    return (
      <Card className="h-full">
        <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
          Proposal Conversion
        </h3>
        <div className="mt-8 flex h-48 items-center justify-center">
          <p className="text-sm text-surface-400 dark:text-surface-500">
            No data yet
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <h3 className="mb-4 text-lg font-semibold text-surface-900 dark:text-surface-100">
        Proposal Conversion
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            outerRadius={100}
            dataKey="value"
            label={({ name, value }) => `${name}: ${value}`}
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#1e293b' : '#fff',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              borderRadius: 8,
              color: isDark ? '#e2e8f0' : '#1e293b',
            }}
            formatter={(value: number, name: string, props: any) => [
              `${value} (${formatCurrency(props.payload.amount)})`,
              name,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default ProposalChart;
