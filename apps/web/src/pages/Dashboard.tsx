import React from 'react';
import { Card } from '../components/ui/Card';
import {
  Users,
  Building2,
  Contact,
  CheckCircle,
  TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

const Dashboard = () => {
  const user = useAuthStore((state) => state.user);

  const stats = [
    {
      label: 'Total Leads',
      value: '248',
      change: '+12.5%',
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
    {
      label: 'Active Accounts',
      value: '86',
      change: '+4.2%',
      icon: Building2,
      color: 'text-emerald',
      bg: 'bg-emerald/10',
    },
    {
      label: 'Total Contacts',
      value: '1,240',
      change: '+8.1%',
      icon: Contact,
      color: 'text-gold',
      bg: 'bg-gold/10',
    },
    {
      label: 'Active Users',
      value: '12',
      change: '0%',
      icon: CheckCircle,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">
          Welcome back, {user?.firstName || 'Admin'}
        </h1>
        <p className="mt-2 text-gray-400">
          Here's what's happening with your cleaning operations today.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="flex items-center gap-4 transition-all hover:-translate-y-1 hover:border-gold/30"
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg} ${stat.color}`}
            >
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">{stat.label}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">
                  {stat.value}
                </span>
                <span className="text-xs font-medium text-emerald">
                  {stat.change}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="min-h-[400px]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Recent Activity</h3>
            <button className="text-sm text-gold hover:text-gold/80">
              View all
            </button>
          </div>
          <div className="mt-8 flex flex-col items-center justify-center text-center text-gray-400">
            <TrendingUp className="mb-4 h-12 w-12 opacity-20" />
            <p>Activity feed coming soon</p>
          </div>
        </Card>

        <Card className="min-h-[400px]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">
              Performance Overview
            </h3>
            <select className="bg-transparent text-sm text-gray-400 focus:outline-none">
              <option>This Week</option>
              <option>This Month</option>
            </select>
          </div>
          <div className="mt-8 flex flex-col items-center justify-center text-center text-gray-400">
            <div className="h-48 w-full rounded-xl bg-white/5 border border-dashed border-white/10 flex items-center justify-center">
              Chart Placeholder
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
