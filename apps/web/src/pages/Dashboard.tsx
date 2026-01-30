import React from 'react';
import { Card } from '../components/ui/Card';
import {
  Users,
  Building2,
  Contact,
  CheckCircle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

const Dashboard = () => {
  const user = useAuthStore((state) => state.user);

  const stats = [
    {
      label: 'Total Leads',
      value: '248',
      change: '+12.5%',
      trend: 'up',
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Active Accounts',
      value: '86',
      change: '+4.2%',
      trend: 'up',
      icon: Building2,
      color: 'text-primary-600 dark:text-primary-400',
      bg: 'bg-primary-100 dark:bg-primary-900/30',
    },
    {
      label: 'Total Contacts',
      value: '1,240',
      change: '+8.1%',
      trend: 'up',
      icon: Contact,
      color: 'text-accent-600 dark:text-accent-400',
      bg: 'bg-accent-100 dark:bg-accent-900/30',
    },
    {
      label: 'Active Users',
      value: '12',
      change: '0%',
      trend: 'neutral',
      icon: CheckCircle,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-100 dark:bg-purple-900/30',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome section */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100 sm:text-3xl">
          Welcome back, {user?.fullName?.split(' ')[0] || 'Admin'}
        </h1>
        <p className="mt-2 text-surface-500 dark:text-surface-400">
          Here's what's happening with your cleaning operations today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            hover
            className="flex items-start gap-4"
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}
            >
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-surface-500 dark:text-surface-400">
                {stat.label}
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-surface-900 dark:text-surface-100">
                  {stat.value}
                </span>
                <span
                  className={`inline-flex items-center text-xs font-medium ${
                    stat.trend === 'up'
                      ? 'text-success-600 dark:text-success-400'
                      : stat.trend === 'down'
                        ? 'text-error-600 dark:text-error-400'
                        : 'text-surface-500 dark:text-surface-400'
                  }`}
                >
                  {stat.trend === 'up' && <ArrowUpRight className="mr-0.5 h-3 w-3" />}
                  {stat.trend === 'down' && <ArrowDownRight className="mr-0.5 h-3 w-3" />}
                  {stat.change}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card className="min-h-[400px]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
              Recent Activity
            </h3>
            <button className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
              View all
            </button>
          </div>
          <div className="mt-8 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-surface-100 p-4 dark:bg-surface-700">
              <TrendingUp className="h-8 w-8 text-surface-400 dark:text-surface-500" />
            </div>
            <p className="mt-4 text-sm font-medium text-surface-600 dark:text-surface-400">
              Activity feed coming soon
            </p>
            <p className="mt-1 text-xs text-surface-400 dark:text-surface-500">
              Track your team's actions in real-time
            </p>
          </div>
        </Card>

        {/* Performance Overview */}
        <Card className="min-h-[400px]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
              Performance Overview
            </h3>
            <select className="rounded-lg border border-surface-200 bg-white px-3 py-1.5 text-sm text-surface-600 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-surface-600 dark:bg-surface-700 dark:text-surface-300">
              <option>This Week</option>
              <option>This Month</option>
              <option>This Quarter</option>
            </select>
          </div>
          <div className="mt-8 flex flex-col items-center justify-center">
            <div className="h-48 w-full rounded-xl border-2 border-dashed border-surface-200 bg-surface-50 flex items-center justify-center dark:border-surface-700 dark:bg-surface-800/50">
              <div className="text-center">
                <div className="rounded-full bg-surface-100 p-3 mx-auto w-fit dark:bg-surface-700">
                  <TrendingUp className="h-6 w-6 text-surface-400 dark:text-surface-500" />
                </div>
                <p className="mt-3 text-sm font-medium text-surface-600 dark:text-surface-400">
                  Charts coming soon
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
