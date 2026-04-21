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
  DollarSign,
  BarChart3,
  Wallet,
  FileBarChart,
  X,
  PanelLeftOpen,
  PanelLeftClose,
  ChevronRight,
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
    directLink: '/app',
    items: [{ to: '/app', icon: Home, label: 'Dashboard' }],
  },
  {
    key: 'crm',
    title: 'CRM',
    icon: Users,
    items: [
      { to: '/leads', icon: Users, label: 'Leads' },
      { to: '/accounts', icon: Building2, label: 'Accounts' },
      { to: '/contacts', icon: Contact, label: 'Contacts' },
      { to: '/service-locations', icon: Warehouse, label: 'Service Locations' },
    ],
  },
  {
    key: 'sales',
    title: 'Sales',
    icon: FileText,
    items: [
      { to: '/proposals', icon: FileText, label: 'Proposals' },
      { to: '/quotations', icon: FileText, label: 'Quotations' },
      { to: '/residential/quotes', icon: Home, label: 'Residential Quotes' },
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
    key: 'finance',
    title: 'Finance',
    icon: DollarSign,
    items: [
      { to: '/finance', icon: BarChart3, label: 'Overview' },
      { to: '/finance/expenses', icon: Receipt, label: 'Expenses' },
      { to: '/finance/payroll', icon: Wallet, label: 'Payroll' },
      { to: '/finance/reports', icon: FileBarChart, label: 'Reports' },
    ],
  },
  {
    key: 'manage',
    title: 'Manage',
    icon: Settings,
    items: [
      { to: '/teams', icon: Handshake, label: 'Teams' },
      { to: '/tasks', icon: ClipboardList, label: 'Tasks' },
      { to: '/pricing', icon: Calculator, label: 'Commercial Pricing' },
      { to: '/residential/pricing', icon: Home, label: 'Residential Pricing' },
      { to: '/quotations/catalog', icon: Calculator, label: 'One-Time Standards' },
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
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set());

  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isFieldWorker = user?.role === 'subcontractor' || user?.role === 'cleaner';
  const isSubcontractor = user?.role === 'subcontractor';

  const effectiveSections: NavSection[] = isFieldWorker
    ? [
        {
          key: 'dashboard',
          title: 'Dashboard',
          icon: Home,
          directLink: '/app',
          items: [{ to: '/app', icon: Home, label: 'Dashboard' }],
        },
        {
          key: 'work',
          title: isSubcontractor ? 'Team Work' : 'My Work',
          icon: Briefcase,
          items: [
            { to: '/contracts', icon: FileSignature, label: isSubcontractor ? 'Team Contracts' : 'My Contracts' },
            { to: '/jobs', icon: Briefcase, label: isSubcontractor ? 'Team Jobs' : 'My Jobs' },
            { to: '/time-tracking', icon: Timer, label: 'Time Tracking' },
            ...(isSubcontractor ? [{ to: '/finance/expenses', icon: Receipt, label: 'Expenses' }] : []),
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
      if (item.to === '/' || item.to === '/app') return location.pathname === item.to;
      return location.pathname.startsWith(item.to);
    });
  };

  // ── Shared nav link renderer ─────────────────────────────────
  const renderNavLink = (item: NavItem, onClickExtra?: () => void) => (
    <li key={item.to}>
      <NavLink
        to={item.to}
        end={item.to === '/' || item.to === '/app'}
        onClick={onClickExtra}
        className={({ isActive: linkActive }) =>
          cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
            linkActive
              ? 'bg-primary-900/30 text-primary-400'
              : 'text-surface-400 hover:bg-surface-800 hover:text-surface-100'
          )
        }
      >
        {({ isActive: linkActive }) => (
          <>
            <item.icon
              className={cn(
                'h-5 w-5 shrink-0',
                linkActive
                  ? 'text-primary-400'
                  : 'text-surface-500'
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
    <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col overflow-hidden border-r border-surface-700 bg-surface-900 lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-surface-700 px-6">
        <h1 className="text-xl font-bold tracking-tight text-surface-100">
          HYGIEIA<span className="text-primary-400">.</span>
        </h1>
        <button
          type="button"
          aria-label="Collapse sidebar"
          onClick={onToggleExpand}
          className="rounded-lg p-1.5 text-surface-500 transition-colors hover:bg-surface-800 hover:text-surface-300"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex min-h-0 flex-1 flex-col justify-between overflow-y-scroll px-3 py-4">
        <div className="space-y-1">
          {visibleSections.map((section) => {
            const active = isSectionActive(section);
            const isOpen = section.directLink || openSections.has(section.key) || active;

            if (section.directLink) {
              return (
                <ul key={section.key} className="space-y-0.5">
                  {section.items.map((item) => renderNavLink(item))}
                </ul>
              );
            }

            return (
              <div key={section.key}>
                <button
                  type="button"
                  onClick={() => toggleSection(section.key)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors',
                    active
                      ? 'text-primary-400'
                      : 'text-surface-500 hover:text-surface-300'
                  )}
                >
                  <section.icon className="h-3.5 w-3.5" />
                  <span className="flex-1 text-left">{section.title}</span>
                  <ChevronRight
                    className={cn(
                      'h-3.5 w-3.5 transition-transform duration-200',
                      isOpen && 'rotate-90'
                    )}
                  />
                </button>
                <div
                  className={cn(
                    'grid transition-[grid-template-rows] duration-200',
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  )}
                >
                  <ul className="space-y-0.5 overflow-hidden">
                    {section.items.map((item) => renderNavLink(item))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sign out */}
        <div className="mt-4 border-t border-surface-700 pt-4">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-400 transition-all duration-200 hover:bg-error-900/20 hover:text-error-400"
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
    <aside className="fixed left-0 top-0 z-40 hidden h-full w-16 flex-col overflow-y-scroll border-r border-surface-700 bg-surface-900 lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-surface-700">
        <span className="text-xl font-bold tracking-tight text-surface-100">
          H<span className="text-primary-400">.</span>
        </span>
      </div>

      {/* Section icons */}
      <nav className="flex min-h-0 flex-1 flex-col items-center gap-1 py-3">
        {visibleSections.map((section) => {
          const SectionIcon = section.icon;
          const active = isSectionActive(section);
          const isHovered = hoveredSection === section.key;
          const flyoutItems = section.directLink
            ? section.items.slice(0, 1)
            : section.items;

          return (
            <div
              key={section.key}
              className="relative"
              onMouseEnter={() => setHoveredSection(section.key)}
              onMouseLeave={() => setHoveredSection(null)}
              onFocus={() => setHoveredSection(section.key)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setHoveredSection(null);
                }
              }}
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
                    ? 'bg-primary-900/30 text-primary-400'
                    : 'text-surface-400 hover:bg-surface-800 hover:text-surface-100'
                )}
              >
                <SectionIcon className="h-5 w-5" />
              </button>

              {/* Flyout panel */}
              <div
                aria-hidden={!isHovered}
                className={cn(
                  'absolute left-full top-0 z-50 ml-0 w-56 rounded-r-xl border border-l-0 border-surface-700 bg-surface-900 py-2 shadow-2xl shadow-surface-950/40 transition-all duration-150',
                  isHovered
                    ? 'pointer-events-auto translate-x-0 opacity-100'
                    : 'pointer-events-none -translate-x-1 opacity-0'
                )}
              >
                <div className="px-3 pb-1.5 pt-1 text-xs font-semibold uppercase tracking-wider text-surface-500">
                  {section.title}
                </div>
                <ul className="space-y-0.5 px-1.5">
                  {flyoutItems.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        tabIndex={isHovered ? 0 : -1}
                        className={({ isActive: linkActive }) =>
                          cn(
                            'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150',
                            linkActive
                              ? 'bg-primary-900/30 font-medium text-primary-400'
                              : 'text-surface-400 hover:bg-surface-800 hover:text-surface-100'
                          )
                        }
                      >
                        {({ isActive: linkActive }) => (
                          <>
                            <item.icon
                              className={cn(
                                'h-4 w-4',
                                linkActive
                                  ? 'text-primary-400'
                                  : 'text-surface-500'
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
            </div>
          );
        })}
      </nav>

      {/* Bottom: expand + sign out */}
      <div className="flex flex-col items-center gap-1 border-t border-surface-700 py-3">
        <button
          type="button"
          aria-label="Expand sidebar"
          onClick={onToggleExpand}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-surface-500 transition-colors duration-150 hover:bg-surface-800 hover:text-surface-300"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Sign out"
          onClick={logout}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-surface-400 transition-colors duration-150 hover:bg-error-900/20 hover:text-error-400"
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
        'fixed left-0 top-0 z-40 flex h-full w-64 flex-col overflow-hidden border-r border-surface-700 bg-surface-900 transition-transform duration-200 lg:hidden',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-surface-700 px-6">
        <h1 className="text-xl font-bold tracking-tight text-surface-100">
          HYGIEIA<span className="text-primary-400">.</span>
        </h1>
        <button
          type="button"
          aria-label="Close navigation menu"
          className="rounded-lg border border-surface-700 bg-surface-800 p-2 text-surface-400 transition-colors hover:bg-surface-700"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation — collapsible sections */}
      <nav className="flex min-h-0 flex-1 flex-col justify-between overflow-y-scroll px-3 py-4">
        <div className="space-y-1">
          {visibleSections.map((section) => {
            const active = isSectionActive(section);
            const isOpen = section.directLink || openSections.has(section.key) || active;

            if (section.directLink) {
              return (
                <ul key={section.key} className="space-y-0.5">
                  {section.items.map((item) => renderNavLink(item, () => onClose?.()))}
                </ul>
              );
            }

            return (
              <div key={section.key}>
                <button
                  type="button"
                  onClick={() => toggleSection(section.key)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors',
                    active
                      ? 'text-primary-400'
                      : 'text-surface-500 hover:text-surface-300'
                  )}
                >
                  <section.icon className="h-3.5 w-3.5" />
                  <span className="flex-1 text-left">{section.title}</span>
                  <ChevronRight
                    className={cn(
                      'h-3.5 w-3.5 transition-transform duration-200',
                      isOpen && 'rotate-90'
                    )}
                  />
                </button>
                <div
                  className={cn(
                    'grid transition-[grid-template-rows] duration-200',
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  )}
                >
                  <ul className="space-y-0.5 overflow-hidden">
                    {section.items.map((item) => renderNavLink(item, () => onClose?.()))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sign out */}
        <div className="mt-4 border-t border-surface-700 pt-4">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-400 transition-all duration-200 hover:bg-error-900/20 hover:text-error-400"
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
