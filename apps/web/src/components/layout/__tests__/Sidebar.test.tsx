import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '../../../test/test-utils';
import Sidebar from '../Sidebar';
import { useAuthStore } from '../../../stores/authStore';

describe('Sidebar RBAC', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      logout: vi.fn(),
    });
  });

  it('hides global settings for manager role', () => {
    useAuthStore.setState({
      user: {
        id: 'manager-1',
        email: 'manager@example.com',
        fullName: 'Manager User',
        role: 'manager',
      },
      token: 'token',
      isAuthenticated: true,
    });

    render(<Sidebar isOpen />);

    expect(screen.getAllByRole('link', { name: 'People' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Subcontractor Access' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'Global Settings' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Area' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'Payroll' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Reports' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Overview' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Expenses' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Support Guide' }).length).toBeGreaterThan(0);
  });

  it('shows route when explicit user permissions grant access', () => {
    // Use a non-field-worker role with no default permissions,
    // but grant users_read explicitly via the permissions map.
    useAuthStore.setState({
      user: {
        id: 'custom-1',
        email: 'custom@example.com',
        fullName: 'Custom User',
        role: 'viewer',
        permissions: {
          users_read: true,
        },
      },
      token: 'token',
      isAuthenticated: true,
    });

    render(<Sidebar isOpen />);

    expect(screen.getAllByRole('link', { name: 'People' }).length).toBeGreaterThan(0);
  });

  it('shows direct dashboard link in the collapsed rail on hover', () => {
    useAuthStore.setState({
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        fullName: 'Admin User',
        role: 'admin',
      },
      token: 'token',
      isAuthenticated: true,
    });

    render(<Sidebar />);

    const initialDashboardLinks = screen.getAllByRole('link', { name: 'Dashboard' }).length;

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Dashboard' }));

    expect(screen.getAllByRole('link', { name: 'Dashboard' })).toHaveLength(
      initialDashboardLinks + 1
    );
  });

  it('shows CRM links from the collapsed rail on hover', () => {
    useAuthStore.setState({
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        fullName: 'Admin User',
        role: 'admin',
      },
      token: 'token',
      isAuthenticated: true,
    });

    render(<Sidebar />);

    const initialLeadLinks = screen.getAllByRole('link', { name: 'Leads' }).length;

    fireEvent.mouseEnter(screen.getAllByRole('button', { name: 'CRM' })[0]);

    expect(screen.getAllByRole('link', { name: 'Leads' })).toHaveLength(
      initialLeadLinks + 1
    );
  });

  it('shows pricing links from the collapsed rail on hover', () => {
    useAuthStore.setState({
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        fullName: 'Admin User',
        role: 'admin',
      },
      token: 'token',
      isAuthenticated: true,
    });

    render(<Sidebar />);

    fireEvent.mouseEnter(screen.getAllByRole('button', { name: 'Pricing' })[0]);

    expect(screen.getAllByRole('link', { name: 'Commercial' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Residential' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Specialized Job' }).length).toBeGreaterThan(0);
  });

  it('shows support guide for field workers', () => {
    useAuthStore.setState({
      user: {
        id: 'cleaner-1',
        email: 'cleaner@example.com',
        fullName: 'Cleaner User',
        role: 'cleaner',
      },
      token: 'token',
      isAuthenticated: true,
    });

    render(<Sidebar isOpen />);

    expect(screen.getAllByRole('link', { name: 'Support Guide' }).length).toBeGreaterThan(0);
  });

  it('allows active expanded sections to be collapsed manually', () => {
    useAuthStore.setState({
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        fullName: 'Admin User',
        role: 'admin',
      },
      token: 'token',
      isAuthenticated: true,
    });

    render(<Sidebar expanded />, { initialRoute: '/leads' });

    const crmButton = screen.getAllByRole('button', { name: /crm/i })[0];

    expect(crmButton).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(crmButton);

    expect(crmButton).toHaveAttribute('aria-expanded', 'false');
  });
});
