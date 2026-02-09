import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Calendar,
  Users,
  Building2,
  Contact,
  UserCog,
  LogOut,
  Warehouse,
  ClipboardList,
  Calculator,
  FileText,
  FileSignature,
  LayoutTemplate,
  Handshake,
  Settings,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { cn } from '../../lib/utils';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar = ({ isOpen = false, onClose }: SidebarProps) => {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const navItems = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/appointments', icon: Calendar, label: 'Appointments' },
    { to: '/leads', icon: Users, label: 'Leads' },
    { to: '/accounts', icon: Building2, label: 'Accounts' },
    { to: '/contacts', icon: Contact, label: 'Contacts' },
    { to: '/facilities', icon: Warehouse, label: 'Facilities' },
    { to: '/proposals', icon: FileText, label: 'Proposals' },
    { to: '/contracts', icon: FileSignature, label: 'Contracts' },
    { to: '/teams', icon: Handshake, label: 'Teams' },
    { to: '/settings/global', icon: Settings, label: 'Global Settings', roles: ['owner', 'admin'] },
    { to: '/tasks', icon: ClipboardList, label: 'Tasks' },
    {
      to: '/area-templates',
      icon: LayoutTemplate,
      label: 'Area Templates',
      roles: ['owner', 'admin', 'manager'],
    },
    { to: '/pricing', icon: Calculator, label: 'Pricing Plans' },
    { to: '/users', icon: UserCog, label: 'Users', roles: ['owner', 'admin'] },
  ];

  const userRole = user?.role;
  const visibleNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return userRole ? item.roles.includes(userRole) : false;
  });

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-full w-64 border-r border-surface-200 bg-white transition-transform duration-200 dark:border-surface-700 dark:bg-surface-900',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-surface-200 px-6 dark:border-surface-700">
        <h1 className="text-xl font-bold tracking-tight text-surface-900 dark:text-surface-100">
          HYGIEIA<span className="text-primary-600 dark:text-primary-400">.</span>
        </h1>
        <button
          type="button"
          aria-label="Close navigation menu"
          className="rounded-lg border border-surface-200 bg-surface-50 p-2 text-surface-600 transition-colors hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700 lg:hidden"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col justify-between overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {visibleNavItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={() => onClose?.()}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-100'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={cn(
                        'h-5 w-5',
                        isActive
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-surface-400 dark:text-surface-500'
                      )}
                    />
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Sign out button */}
        <div className="mt-4 border-t border-surface-200 pt-4 dark:border-surface-700">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-600 transition-all duration-200 hover:bg-error-50 hover:text-error-700 dark:text-surface-400 dark:hover:bg-error-900/20 dark:hover:text-error-400"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
