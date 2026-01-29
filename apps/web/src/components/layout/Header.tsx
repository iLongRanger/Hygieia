import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Bell, Menu, User } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const user = useAuthStore((state) => state.user);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/10 bg-navy/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Open navigation menu"
          className="rounded-lg border border-white/10 bg-white/5 p-2 text-white transition-colors hover:bg-white/10 lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        <button className="relative text-gray-400 transition-colors hover:text-white">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-gold" />
        </button>

        <div className="flex items-center gap-3 border-l border-white/10 pl-4 sm:pl-6">
          <div className="text-right">
            <p className="text-sm font-medium text-white">{user?.fullName}</p>
            <p className="text-xs text-gray-400">{user?.role || 'Admin'}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 text-gold">
            <User className="h-5 w-5" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
