import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { Bell, Menu, User, Sun, Moon } from 'lucide-react';
import { listNotifications, markNotificationRead } from '../../lib/notifications';
import type { Notification } from '../../types/crm';

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const user = useAuthStore((state) => state.user);
  const { theme, toggleTheme } = useThemeStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await listNotifications({ limit: 5 });
        setNotifications(data);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };
    fetchNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

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
        {/* Theme toggle */}
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

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="relative rounded-lg p-2 text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200"
            aria-label="Open notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent-500" />
            )}
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-lg border border-surface-200 bg-white shadow-lg dark:border-surface-700 dark:bg-surface-900">
              <div className="flex items-center justify-between border-b border-surface-200 px-4 py-3 text-sm font-semibold text-surface-700 dark:border-surface-700 dark:text-surface-200">
                Notifications
                <span className="text-xs font-normal text-surface-500 dark:text-surface-400">
                  {unreadCount} unread
                </span>
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
                      onClick={async () => {
                        if (!notification.readAt) {
                          await markNotificationRead(notification.id, true);
                          setNotifications((prev) =>
                            prev.map((item) =>
                              item.id === notification.id
                                ? { ...item, readAt: new Date().toISOString() }
                                : item
                            )
                          );
                        }
                      }}
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
                          <span className="mt-1 h-2 w-2 rounded-full bg-accent-500" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User info */}
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
