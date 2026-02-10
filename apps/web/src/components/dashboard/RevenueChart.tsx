import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '../ui/Card';

interface RevenueChartProps {
  data: { month: string; mrr: number }[];
}

const formatCurrency = (val: number) =>
  val >= 1000 ? `$${(val / 1000).toFixed(1)}k` : `$${val}`;

const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  const isDark = document.documentElement.classList.contains('dark');
  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';

  const chartData = data.map((d) => ({
    ...d,
    label: new Date(d.month + '-01').toLocaleDateString('en-US', {
      month: 'short',
      year: '2-digit',
    }),
  }));

  const allZero = data.every((d) => d.mrr === 0);

  if (data.length === 0 || allZero) {
    return (
      <Card className="h-full">
        <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
          Revenue Trend
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
        Revenue Trend
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ left: 10, right: 10 }}>
          <defs>
            <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="label"
            tick={{ fill: axisColor, fontSize: 12 }}
          />
          <YAxis
            tick={{ fill: axisColor, fontSize: 12 }}
            tickFormatter={formatCurrency}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#1e293b' : '#fff',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              borderRadius: 8,
              color: isDark ? '#e2e8f0' : '#1e293b',
            }}
            formatter={(value: number) => [`$${value.toLocaleString()}`, 'MRR']}
          />
          <Area
            type="monotone"
            dataKey="mrr"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#mrrGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default RevenueChart;
