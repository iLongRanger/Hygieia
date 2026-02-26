import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  Briefcase,
  ClipboardCheck,
  Timer,
  Receipt,
  X,
  PanelLeftOpen,
  PanelLeftClose,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { cn } from '../../lib/utils';
import { canAccessRoute } from '../../lib/routeAccess';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

interface NavSection {
  key: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  directLink?: string;
}

const navSections: NavSection[] = [
  {
    key: 'dashboard',
    title: 'Dashboard',
    icon: Home,
    directLink: '/',
    items: [{ to: '/', icon: Home, label: 'Dashboard' }],
  },
  {
    key: 'crm',
    title: 'CRM',
    icon: Users,
    items: [
      { to: '/leads', icon: Users, label: 'Leads' },
      { to: '/accounts', icon: Building2, label: 'Accounts' },
      { to: '/contacts', icon: Contact, label: 'Contacts' },
    ],
  },
  {
    key: 'sales',
    title: 'Sales',
    icon: FileText,
    items: [
      { to: '/proposals', icon: FileText, label: 'Proposals' },
      { to: '/quotations', icon: FileText, label: 'Quotations' },
      { to: '/quotations/catalog', icon: Calculator, label: 'One-Time Standards' },
      { to: '/contracts', icon: FileSignature, label: 'Contracts' },
      { to: '/invoices', icon: Receipt, label: 'Invoices' },
    ],
  },
  {
    key: 'operations',
    title: 'Operations',
    icon: Briefcase,
    items: [
      { to: '/jobs', icon: Briefcase, label: 'Jobs' },
      { to: '/inspections', icon: ClipboardCheck, label: 'Inspections' },
      { to: '/time-tracking', icon: Timer, label: 'Time Tracking' },
      { to: '/appointments', icon: Calendar, label: 'Appointments' },
    ],
  },
  {
    key: 'manage',
    title: 'Manage',
    icon: Settings,
    items: [
      { to: '/facilities', icon: Warehouse, label: 'Facilities' },
      { to: '/teams', icon: Handshake, label: 'Teams' },
      { to: '/tasks', icon: ClipboardList, label: 'Tasks' },
      { to: '/pricing', icon: Calculator, label: 'Pricing Plans' },
      { to: '/area-templates', icon: LayoutTemplate, label: 'Area Templates' },
      { to: '/users', icon: UserCog, label: 'Users' },
      { to: '/settings/global', icon: Settings, label: 'Settings' },
    ],
  },
];

const Sidebar = ({ isOpen = false, onClose, expanded = false, onToggleExpand }: SidebarProps) => {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const navigate = useNavigate();
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);

  const isSubcontractor = user?.role === 'subcontractor';

  const effectiveSections: NavSection[] = isSubcontractor
    ? [
        {
          key: 'dashboard',
          title: 'Dashboard',
          icon: Home,
          directLink: '/',
          items: [{ to: '/', icon: Home, label: 'Dashboard' }],
        },
        {
          key: 'work',
          title: 'My Work',
          icon: Briefcase,
          items: [
            { to: '/contracts', icon: FileSignature, label: 'My Contracts' },
            { to: '/jobs', icon: Briefcase, label: 'My Jobs' },
            { to: '/time-tracking', icon: Timer, label: 'Time Tracking' },
          ],
        },
      ]
    : navSections;

  const visibleSections = effectiveSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccessRoute(item.to, user)),
    }))
    .filter((section) => section.items.length > 0);

  const isSectionActive = (section: NavSection) => {
    return section.items.some((item) => {
      if (item.to === '/') return location.pathname === '/';
      return location.pathname.startsWith(item.to);
    });
  };

  // ── Shared nav link renderer ─────────────────────────────────
  const renderNavLink = (item: NavItem, onClickExtra?: () => void) => (
    <li key={item.to}>
      <NavLink
        to={item.to}
        end={item.to === '/'}
        onClick={onClickExtra}
        className={({ isActive: linkActive }) =>
          cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
            linkActive
              ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
              : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-100'
          )
        }
      >
        {({ isActive: linkActive }) => (
          <>
            <item.icon
              className={cn(
                'h-5 w-5 shrink-0',
                linkActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-surface-400 dark:text-surface-500'
              )}
            />
            {item.label}
          </>
        )}
      </NavLink>
    </li>
  );

  // ── Desktop: Expanded full sidebar ───────────────────────────
  const desktopExpanded = (
    <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col border-r border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-900 lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-surface-200 px-6 dark:border-surface-700">
        <h1 className="text-xl font-bold tracking-tight text-surface-900 dark:text-surface-100">
          HYGIEIA<span className="text-primary-600 dark:text-primary-400">.</span>
        </h1>
        <button
          type="button"
          aria-label="Collapse sidebar"
          onClick={onToggleExpand}
          className="rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 dark:text-surface-500 dark:hover:bg-surface-800 dark:hover:text-surface-300"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col justify-between overflow-y-auto px-3 py-4">
        <div className="space-y-4">
          {visibleSections.map((section) => (
            <div key={section.key}>
              {!section.directLink && (
                <div className="mb-1 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                  <section.icon className="h-3.5 w-3.5" />
                  {section.title}
                </div>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => renderNavLink(item))}
              </ul>
            </div>
          ))}
        </div>

        {/* Sign out */}
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

  // ── Desktop: Icon Rail + Flyout ──────────────────────────────
  const desktopRail = (
    <aside className="fixed left-0 top-0 z-40 hidden h-full w-16 flex-col border-r border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-900 lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-surface-200 dark:border-surface-700">
        <span className="text-xl font-bold tracking-tight text-surface-900 dark:text-surface-100">
          H<span className="text-primary-600 dark:text-primary-400">.</span>
        </span>
      </div>

      {/* Section icons */}
      <nav className="flex flex-1 flex-col items-center gap-1 py-3">
        {visibleSections.map((section) => {
          const SectionIcon = section.icon;
          const active = isSectionActive(section);
          const isHovered = hoveredSection === section.key;
          const hasFlyout = !section.directLink;

          return (
            <div
              key={section.key}
              className="relative"
              onMouseEnter={() => hasFlyout && setHoveredSection(section.key)}
              onMouseLeave={() => hasFlyout && setHoveredSection(null)}
            >
              {/* Rail icon button */}
              <button
                type="button"
                aria-label={section.title}
                onClick={() => {
                  if (section.directLink) {
                    navigate(section.directLink);
                  }
                }}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-150',
                  active
                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'text-surface-500 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-100'
                )}
              >
                <SectionIcon className="h-5 w-5" />
              </button>

              {/* Flyout panel */}
              {hasFlyout && (
                <div
                  className={cn(
                    'absolute left-full top-0 z-50 ml-0 w-52 rounded-r-lg border border-l-0 border-surface-200 bg-white py-2 shadow-lg transition-all duration-150 dark:border-surface-700 dark:bg-surface-900',
                    isHovered
                      ? 'pointer-events-auto translate-x-0 opacity-100'
                      : 'pointer-events-none -translate-x-1 opacity-0'
                  )}
                >
                  <div className="px-3 pb-1.5 pt-1 text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                    {section.title}
                  </div>
                  <ul className="space-y-0.5 px-1.5">
                    {section.items.map((item) => (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          className={({ isActive: linkActive }) =>
                            cn(
                              'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150',
                              linkActive
                                ? 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                                : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-100'
                            )
                          }
                        >
                          {({ isActive: linkActive }) => (
                            <>
                              <item.icon
                                className={cn(
                                  'h-4 w-4',
                                  linkActive
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
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom: expand + sign out */}
      <div className="flex flex-col items-center gap-1 border-t border-surface-200 py-3 dark:border-surface-700">
        <button
          type="button"
          aria-label="Expand sidebar"
          onClick={onToggleExpand}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-surface-400 transition-colors duration-150 hover:bg-surface-100 hover:text-surface-600 dark:text-surface-500 dark:hover:bg-surface-800 dark:hover:text-surface-300"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Sign out"
          onClick={logout}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-surface-500 transition-colors duration-150 hover:bg-error-50 hover:text-error-600 dark:text-surface-400 dark:hover:bg-error-900/20 dark:hover:text-error-400"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </aside>
  );

  // ── Mobile: Full-width drawer ────────────────────────────────
  const mobileDrawer = (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-full w-64 border-r border-surface-200 bg-white transition-transform duration-200 dark:border-surface-700 dark:bg-surface-900 lg:hidden',
        isOpen ? 'translate-x-0' : '-translate-x-full'
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
          className="rounded-lg border border-surface-200 bg-surface-50 p-2 text-surface-600 transition-colors hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation — all sections expanded */}
      <nav className="flex flex-1 flex-col justify-between overflow-y-auto px-3 py-4">
        <div className="space-y-4">
          {visibleSections.map((section) => (
            <div key={section.key}>
              {!section.directLink && (
                <div className="mb-1 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                  <section.icon className="h-3.5 w-3.5" />
                  {section.title}
                </div>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => renderNavLink(item, () => onClose?.()))}
              </ul>
            </div>
          ))}
        </div>

        {/* Sign out */}
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

  return (
    <>
      {expanded ? desktopExpanded : desktopRail}
      {mobileDrawer}
    </>
  );
};

export default Sidebar;
