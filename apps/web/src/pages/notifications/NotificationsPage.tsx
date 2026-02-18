import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Bell, CheckCheck, Filter, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../lib/notifications';
import {
  connectNotificationsRealtime,
  subscribeNotificationAllRead,
  subscribeNotificationCreated,
  subscribeNotificationUpdated,
} from '../../lib/realtimeNotifications';
import type { Notification, Pagination } from '../../types/crm';
import { useNavigate } from 'react-router-dom';

const NOTIFICATION_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'appointment_assigned', label: 'Appointment Assigned' },
  { value: 'appointment_rescheduled', label: 'Appointment Rescheduled' },
  { value: 'appointment_reminder', label: 'Appointment Reminder' },
  { value: 'proposal_accepted', label: 'Proposal Accepted' },
  { value: 'proposal_rejected', label: 'Proposal Rejected' },
  { value: 'contract_activated', label: 'Contract Activated' },
  { value: 'contract_terminated', label: 'Contract Terminated' },
  { value: 'contract_expiring', label: 'Contract Expiring' },
  { value: 'contract_signed', label: 'Contract Signed' },
  { value: 'job_assigned', label: 'Job Assigned' },
];

const FILTER_OPTIONS = [
  { value: 'unread', label: 'Unread Only' },
  { value: 'all', label: 'All Notifications' },
];

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [readFilter, setReadFilter] = useState('unread');
  const [typeFilter, setTypeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const all = await listNotifications({
        limit: 200,
        includeRead: readFilter === 'all' ? true : undefined,
      });
      // Client-side type filter
      const filtered = typeFilter
        ? all.filter((n) => n.type === typeFilter)
        : all;
      // Client-side pagination
      const totalPages = Math.ceil(filtered.length / 20);
      const pageItems = filtered.slice((page - 1) * 20, page * 20);
      setNotifications(pageItems);
      setPagination({ page, limit: 20, total: filtered.length, totalPages });
    } catch (error) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [page, readFilter, typeFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    connectNotificationsRealtime();

    const refetch = () => {
      fetchNotifications();
    };

    const unsubscribeCreated = subscribeNotificationCreated(refetch);
    const unsubscribeUpdated = subscribeNotificationUpdated(refetch);
    const unsubscribeAllRead = subscribeNotificationAllRead(refetch);

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeAllRead();
    };
  }, [fetchNotifications]);

  const handleMarkRead = async (id: string, read: boolean) => {
    try {
      await markNotificationRead(id, read);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, readAt: read ? new Date().toISOString() : null }
            : n
        )
      );
    } catch {
      toast.error('Failed to update notification');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const count = await markAllNotificationsRead();
      toast.success(`Marked ${count} notifications as read`);
      fetchNotifications();
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.readAt) {
      handleMarkRead(notification.id, true);
    }
    const meta = notification.metadata;
    if (meta?.proposalId) {
      navigate(`/proposals/${meta.proposalId}`);
    } else if (meta?.contractId) {
      navigate(`/contracts/${meta.contractId}`);
    } else if (meta?.leadId) {
      navigate(`/leads/${meta.leadId}`);
    } else if (meta?.facilityId) {
      navigate(`/facilities/${meta.facilityId}`);
    } else if (meta?.inspectionId) {
      navigate(`/inspections/${meta.inspectionId}`);
    } else if (meta?.appointmentId) {
      navigate('/appointments');
    } else if (meta?.jobId) {
      navigate(`/jobs/${meta.jobId}`);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getTypeLabel = (type: string) => {
    const found = NOTIFICATION_TYPES.find((t) => t.value === type);
    return found?.label || type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary-100 p-2.5 dark:bg-primary-900/30">
            <Bell className="h-5 w-5 text-primary-700 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              Notifications
            </h1>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              {pagination ? `${pagination.total} total` : 'Loading...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-1.5 h-4 w-4" />
            Filters
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleMarkAllRead}
          >
            <CheckCheck className="mr-1.5 h-4 w-4" />
            Mark all read
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <div className="flex flex-wrap items-end gap-4 p-4">
            <div className="w-48">
              <Select
                label="Status"
                options={FILTER_OPTIONS}
                value={readFilter}
                onChange={(val) => {
                  setReadFilter(val);
                  setPage(1);
                }}
              />
            </div>
            <div className="w-48">
              <Select
                label="Type"
                options={NOTIFICATION_TYPES}
                value={typeFilter}
                onChange={(val) => {
                  setTypeFilter(val);
                  setPage(1);
                }}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setReadFilter('unread');
                setTypeFilter('');
                setPage(1);
              }}
            >
              <X className="mr-1 h-4 w-4" />
              Clear
            </Button>
          </div>
        </Card>
      )}

      {/* Notifications list */}
      <Card>
        {loading ? (
          <div className="space-y-1 p-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 w-full rounded-lg skeleton" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-surface-100 p-4 dark:bg-surface-800">
              <Bell className="h-8 w-8 text-surface-400 dark:text-surface-500" />
            </div>
            <p className="mt-4 text-sm font-medium text-surface-600 dark:text-surface-400">
              No notifications
            </p>
            <p className="mt-1 text-xs text-surface-400 dark:text-surface-500">
              {readFilter === 'unread' ? 'All caught up!' : 'No notifications found'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100 dark:divide-surface-700">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start gap-4 px-4 py-3 transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/50 cursor-pointer ${
                  !notification.readAt ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="mt-1">
                  {!notification.readAt ? (
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent-500" />
                  ) : (
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-surface-300 dark:bg-surface-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                        {notification.title}
                      </p>
                      {notification.body && (
                        <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400 line-clamp-2">
                          {notification.body}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-surface-100 px-2 py-0.5 text-[10px] font-medium text-surface-600 dark:bg-surface-700 dark:text-surface-400">
                          {getTypeLabel(notification.type)}
                        </span>
                        <span className="text-[11px] text-surface-400 dark:text-surface-500">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkRead(notification.id, !notification.readAt);
                      }}
                      className="shrink-0 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      {notification.readAt ? 'Mark unread' : 'Mark read'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-surface-200 px-4 py-3 dark:border-surface-700">
            <span className="text-xs text-surface-500 dark:text-surface-400">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default NotificationsPage;
