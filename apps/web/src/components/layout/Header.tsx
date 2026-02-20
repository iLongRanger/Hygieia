import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { Bell, Menu, User, Sun, Moon, CheckCheck } from 'lucide-react';
import {
  getUnreadCount,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../lib/notifications';
import {
  connectNotificationsRealtime,
  disconnectNotificationsRealtime,
  subscribeNotificationAllRead,
  subscribeNotificationCreated,
  subscribeNotificationUpdated,
} from '../../lib/realtimeNotifications';
import type { Notification } from '../../types/crm';

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { theme, toggleTheme } = useThemeStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      disconnectNotificationsRealtime();
      return;
    }

    let isMounted = true;

    const fetchNotifications = async () => {
      try {
        const [result, unread] = await Promise.all([
          listNotifications({ limit: 5, includeRead: true }),
          getUnreadCount(),
        ]);

        if (!isMounted) {
          return;
        }

        setNotifications(result);
        setUnreadCount(unread);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    connectNotificationsRealtime();
    fetchNotifications();

    const unsubscribeCreated = subscribeNotificationCreated(({ notification, unreadCount }) => {
      setNotifications((prev) => {
        const next = [notification, ...prev.filter((item) => item.id !== notification.id)];
        return next.slice(0, 5);
      });
      setUnreadCount(unreadCount);
    });

    const unsubscribeUpdated = subscribeNotificationUpdated(({ notification, unreadCount }) => {
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id
            ? { ...item, readAt: notification.readAt }
            : item
        )
      );
      setUnreadCount(unreadCount);
    });

    const unsubscribeAllRead = subscribeNotificationAllRead(({ unreadCount }) => {
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() }))
      );
      setUnreadCount(unreadCount);
    });

    return () => {
      isMounted = false;
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeAllRead();
    };
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.readAt) {
      await markNotificationRead(notification.id, true);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id
            ? { ...item, readAt: new Date().toISOString() }
            : item
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    const meta = notification.metadata as Record<string, unknown> | undefined;

    if (meta?.inspectionId)       navigate(`/inspections/${meta.inspectionId}`);
    else if (meta?.proposalId)    navigate(`/proposals/${meta.proposalId}`);
    else if (meta?.contractId)    navigate(`/contracts/${meta.contractId}`);
    else if (meta?.quotationId)   navigate(`/quotations/${meta.quotationId}`);
    else if (meta?.leadId)        navigate(`/leads/${meta.leadId}`);
    else if (meta?.jobId)         navigate(`/jobs/${meta.jobId}`);
    else if (meta?.facilityId)    navigate(`/facilities/${meta.facilityId}`);
    else if (meta?.appointmentId) navigate(`/appointments/${meta.appointmentId}`);

    setIsOpen(false);
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-surface-200 bg-white/80 px-4 backdrop-blur-xl dark:border-surface-700 dark:bg-surface-900/80 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Open navigation menu"
          className="rounded-lg border border-surface-200 bg-surface-50 p-2 text-surface-600 transition-colors hover:bg-surface-100 hover:text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-100 lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="relative rounded-lg p-2 text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200"
            aria-label="Open notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-lg border border-surface-200 bg-white shadow-lg dark:border-surface-700 dark:bg-surface-900">
              <div className="flex items-center justify-between border-b border-surface-200 px-4 py-3 dark:border-surface-700">
                <span className="text-sm font-semibold text-surface-700 dark:text-surface-200">
                  Notifications
                </span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                      title="Mark all as read"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Mark all read
                    </button>
                  )}
                  <span className="text-xs font-normal text-surface-500 dark:text-surface-400">
                    {unreadCount} unread
                  </span>
                </div>
              </div>
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-surface-500 dark:text-surface-400">
                  No new notifications
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-surface-100 dark:hover:bg-surface-800"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-surface-800 dark:text-surface-100">
                            {notification.title}
                          </div>
                          {notification.body && (
                            <div className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                              {notification.body}
                            </div>
                          )}
                        </div>
                        {!notification.readAt && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent-500" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 border-l border-surface-200 pl-3 dark:border-surface-700 sm:pl-4">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
              {user?.fullName}
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              {user?.role || 'Admin'}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
            <User className="h-5 w-5" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
