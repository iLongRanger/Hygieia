import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Building2, Contact, UserCog, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { clsx } from 'clsx';

const Sidebar = () => {
  const logout = useAuthStore((state) => state.logout);

  const navItems = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/leads', icon: Users, label: 'Leads' },
    { to: '/accounts', icon: Building2, label: 'Accounts' },
    { to: '/contacts', icon: Contact, label: 'Contacts' },
    { to: '/users', icon: UserCog, label: 'Users', adminOnly: true },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 border-r border-white/10 bg-navy-dark/95 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-center border-b border-white/10 px-6">
        <h1 className="text-xl font-bold tracking-tight text-white">
          HYGIEIA<span className="text-gold">.</span>
        </h1>
      </div>

      <nav className="flex flex-1 flex-col justify-between overflow-y-auto px-4 py-6">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
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
