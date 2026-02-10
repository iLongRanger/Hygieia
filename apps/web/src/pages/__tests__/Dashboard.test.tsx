import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/test-utils';
import Dashboard from '../Dashboard';
import { useAuthStore } from '../../stores/authStore';

const getDashboardStatsMock = vi.fn();

vi.mock('../../lib/dashboard', () => ({
  getDashboardStats: (...args: unknown[]) => getDashboardStatsMock(...args),
}));

vi.mock('../../components/dashboard/LeadFunnelChart', () => ({
  default: () => null,
}));

vi.mock('../../components/dashboard/ProposalChart', () => ({
  default: () => null,
}));

vi.mock('../../components/dashboard/RevenueChart', () => ({
  default: () => null,
}));

vi.mock('../../components/dashboard/ContractStatusChart', () => ({
  default: () => null,
}));

describe('Dashboard', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 'user-1', email: 'admin@example.com', fullName: 'Admin User', role: 'admin' },
      token: 'token',
      isAuthenticated: true,
    });
    getDashboardStatsMock.mockReset();
  });

  it('shows upcoming appointments from the API', async () => {
    getDashboardStatsMock.mockResolvedValue({
      totalLeads: 5,
      newLeadsInPeriod: 1,
      activeAccounts: 2,
      newAccountsInPeriod: 1,
      activeContracts: 1,
      totalMRR: 1200,
      proposalsSentInPeriod: 2,
      proposalWinRate: 50,
      leadsByStatus: [
        { status: 'new', count: 3 },
        { status: 'qualified', count: 2 },
      ],
      pipelineValue: 8000,
      proposalsByStatus: [{ status: 'sent', count: 2, totalAmount: 4000 }],
      contractsByStatus: [{ status: 'active', count: 1 }],
      expiringContracts: [],
      revenueByMonth: [
        { month: '2025-09', mrr: 900 },
        { month: '2025-10', mrr: 900 },
        { month: '2025-11', mrr: 1000 },
        { month: '2025-12', mrr: 1000 },
        { month: '2026-01', mrr: 1200 },
        { month: '2026-02', mrr: 1200 },
      ],
      upcomingAppointments: [
        {
          id: 'appt-1',
          type: 'walk_through',
          status: 'scheduled',
          scheduledStart: new Date('2026-02-01T15:00:00Z').toISOString(),
          assignedToUser: {
            id: 'user-2',
            fullName: 'Rep One',
          },
          lead: {
            id: 'lead-1',
            contactName: 'Jane Doe',
            companyName: 'Acme Corp',
          },
          account: null,
        },
      ],
      recentActivity: [],
      activeUsers: 1,
      activeTeams: 1,
    });

    render(<Dashboard />);

    expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Rep One')).toBeInTheDocument();
    expect(getDashboardStatsMock).toHaveBeenCalledWith('month');
  });
});
