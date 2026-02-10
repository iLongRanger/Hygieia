import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card } from '../ui/Card';

interface LeadFunnelChartProps {
  data: { status: string; count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  lead: '#3b82f6',
  walk_through_booked: '#8b5cf6',
  walk_through_completed: '#6366f1',
  proposal_sent: '#f59e0b',
  negotiation: '#f97316',
  won: '#10b981',
  lost: '#ef4444',
  reopened: '#64748b',
};

const STATUS_LABELS: Record<string, string> = {
  lead: 'New Lead',
  walk_through_booked: 'Walk-through Booked',
  walk_through_completed: 'Walk-through Done',
  proposal_sent: 'Proposal Sent',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
  reopened: 'Reopened',
};

const LeadFunnelChart: React.FC<LeadFunnelChartProps> = ({ data }) => {
  const chartData = data.map((d) => ({
    ...d,
    label: STATUS_LABELS[d.status] || d.status,
    fill: STATUS_COLORS[d.status] || '#94a3b8',
  }));

  const isDark = document.documentElement.classList.contains('dark');
  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';

  if (chartData.length === 0) {
    return (
      <Card className="h-full">
        <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
          Lead Pipeline
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
        Lead Pipeline
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
          <XAxis type="number" tick={{ fill: axisColor, fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: axisColor, fontSize: 12 }}
            width={140}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#1e293b' : '#fff',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              borderRadius: 8,
              color: isDark ? '#e2e8f0' : '#1e293b',
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={32}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default LeadFunnelChart;
