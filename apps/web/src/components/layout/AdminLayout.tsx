import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { ToastContainer } from '../ui/Toast';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { cn } from '../../lib/utils';

const SIDEBAR_EXPANDED_KEY = 'sidebar-expanded';

const AdminLayout = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { toasts, removeToast } = useToastStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
    return localStorage.getItem(SIDEBAR_EXPANDED_KEY) === 'true';
  });

  const toggleSidebarExpanded = () => {
    setIsSidebarExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_EXPANDED_KEY, String(next));
      return next;
    });
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="relative min-h-screen bg-surface-50 text-surface-900 dark:bg-surface-900 dark:text-surface-100">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        expanded={isSidebarExpanded}
        onToggleExpand={toggleSidebarExpanded}
      />
      {isSidebarOpen && (
        <button
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-30 bg-surface-900/50 dark:bg-black/60 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <div
        className={cn(
          'flex min-h-screen flex-col transition-[padding] duration-200',
          isSidebarExpanded ? 'lg:pl-64' : 'lg:pl-16'
        )}
      >
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
