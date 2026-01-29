import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
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
  X,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { clsx } from 'clsx';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar = ({ isOpen = false, onClose }: SidebarProps) => {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const navItems = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/leads', icon: Users, label: 'Leads' },
    { to: '/accounts', icon: Building2, label: 'Accounts' },
    { to: '/contacts', icon: Contact, label: 'Contacts' },
    { to: '/facilities', icon: Warehouse, label: 'Facilities' },
    { to: '/proposals', icon: FileText, label: 'Proposals' },
    { to: '/contracts', icon: FileSignature, label: 'Contracts' },
    { to: '/tasks', icon: ClipboardList, label: 'Tasks' },
    {
      to: '/area-templates',
      icon: LayoutTemplate,
      label: 'Area Templates',
      roles: ['owner', 'admin', 'manager'],
    },
    { to: '/pricing', icon: Calculator, label: 'Pricing' },
    { to: '/users', icon: UserCog, label: 'Users', roles: ['owner', 'admin'] },
  ];

  const userRole = user?.role;
  const visibleNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return userRole ? item.roles.includes(userRole) : false;
  });

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 z-40 h-full w-64 border-r border-white/10 bg-navy-dark/95 backdrop-blur-xl transition-transform duration-200',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0'
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-6">
        <h1 className="text-xl font-bold tracking-tight text-white">
          HYGIEIA<span className="text-gold">.</span>
        </h1>
        <button
          type="button"
          aria-label="Close navigation menu"
          className="rounded-lg border border-white/10 bg-white/5 p-2 text-white transition-colors hover:bg-white/10 lg:hidden"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex flex-1 flex-col justify-between overflow-y-auto px-4 py-6">
        <ul className="space-y-1">
          {visibleNavItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={() => onClose?.()}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-emerald text-white shadow-lg shadow-emerald/20'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="border-t border-white/10 pt-4">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-400 transition-all duration-200 hover:bg-red-500/10 hover:text-red-500"
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
