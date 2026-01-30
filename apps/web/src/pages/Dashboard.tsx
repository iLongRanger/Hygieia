import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import {
  Users,
  Building2,
  Contact,
  CheckCircle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { listAppointments } from '../lib/appointments';
import type { Appointment } from '../types/crm';

const Dashboard = () => {
  const user = useAuthStore((state) => state.user);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

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

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const data = await listAppointments({
          includePast: false,
        });
        setAppointments(data);
      } catch (error) {
        console.error('Failed to fetch appointments:', error);
      }
    };
    fetchAppointments();
  }, []);

  const groupedAppointments = useMemo(() => {
    const groups: Record<string, Appointment[]> = {};
    appointments.forEach((appointment) => {
      const date = new Date(appointment.scheduledStart);
      const dateKey = date.toISOString().slice(0, 10);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(appointment);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => ({
        key,
        label: new Date(key).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          weekday: 'short',
        }),
        items,
      }));
  }, [appointments]);

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
        {/* Appointments */}
        <Card className="min-h-[400px]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
              Appointments
            </h3>
            <span className="text-xs text-surface-400 dark:text-surface-500">
              Upcoming
            </span>
          </div>
          {appointments.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center text-center">
              <div className="rounded-full bg-surface-100 p-4 dark:bg-surface-700">
                <Calendar className="h-8 w-8 text-surface-400 dark:text-surface-500" />
              </div>
              <p className="mt-4 text-sm font-medium text-surface-600 dark:text-surface-400">
                No upcoming appointments
              </p>
              <p className="mt-1 text-xs text-surface-400 dark:text-surface-500">
                Scheduled walkthroughs will appear here
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {groupedAppointments.map((group) => (
                <div key={group.key} className="rounded-lg border border-surface-200 p-3 dark:border-surface-700">
                  <div className="text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
                    {group.label}
                  </div>
                  <div className="mt-2 space-y-2">
                    {group.items.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between rounded-md bg-surface-50 px-3 py-2 text-sm dark:bg-surface-800/50"
                      >
                        <div>
                          <div className="font-medium text-surface-800 dark:text-surface-100">
                            {appointment.lead.companyName || appointment.lead.contactName}
                          </div>
                          <div className="text-xs text-surface-500 dark:text-surface-400">
                            {appointment.assignedToUser.fullName}
                          </div>
                        </div>
                        <div className="text-xs text-surface-500 dark:text-surface-400">
                          {new Date(appointment.scheduledStart).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
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
