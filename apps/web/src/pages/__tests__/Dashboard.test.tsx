import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/test-utils';
import Dashboard from '../Dashboard';
import { useAuthStore } from '../../stores/authStore';

const getDashboardStatsMock = vi.fn();
const listContractsMock = vi.fn();
const listJobsMock = vi.fn();

vi.mock('../../lib/dashboard', () => ({
  getDashboardStats: (...args: unknown[]) => getDashboardStatsMock(...args),
}));

vi.mock('../../lib/contracts', () => ({
  listContracts: (...args: unknown[]) => listContractsMock(...args),
}));

vi.mock('../../lib/jobs', () => ({
  listJobs: (...args: unknown[]) => listJobsMock(...args),
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
    listContractsMock.mockReset();
    listJobsMock.mockReset();
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
      comparison: {
        newLeads: 1,
        newLeadsPrev: 0,
        newLeadsChange: 100,
        newAccounts: 1,
        newAccountsPrev: 0,
        newAccountsChange: 100,
        proposalsSent: 2,
        proposalsSentPrev: 0,
        proposalsSentChange: 100,
        winRate: 50,
        winRatePrev: 0,
        winRateChange: 50,
        mrr: 1200,
        mrrPrev: 900,
        mrrChange: 33,
      },
      leadsByStatus: [
        { status: 'lead', count: 3 },
        { status: 'walk_through_booked', count: 2 },
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
      jobsScheduledToday: 0,
      jobsTodayOverview: {
        scheduled: 0,
        inProgress: 0,
        completed: 0,
        unassigned: 0,
      },
      jobsCompletedInPeriod: 0,
      jobsMissedInPeriod: 0,
      inspectionAvgScore: null,
      inspectionsCompletedInPeriod: 0,
      activeClockIns: 0,
      pendingTimesheets: 0,
      outstandingInvoiceAmount: 0,
      overdueInvoiceCount: 0,
      invoicesPaidInPeriod: 0,
      activeUsers: 1,
      activeTeams: 1,
    });

    render(<Dashboard />);

    expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Rep One')).toBeInTheDocument();
    expect(screen.getByText('0 unassigned • 0 in progress • 0 completed')).toBeInTheDocument();
    expect(getDashboardStatsMock).toHaveBeenCalledWith({ period: 'month' });
  });
  it('shows team-focused dashboard labels for subcontractors', async () => {
    useAuthStore.setState({
      user: { id: 'sub-1', email: 'sub@example.com', fullName: 'Sub User', role: 'subcontractor' },
      token: 'token',
      isAuthenticated: true,
    });
    listContractsMock.mockImplementation(async () => ({
      data: [
        {
          id: 'contract-1',
          contractNumber: 'CONT-1',
          title: 'Team Contract',
          status: 'active',
          facility: { name: 'HQ' },
          assignedTeam: { id: 'team-1', name: 'Sub Team A' },
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
    }));
    listJobsMock.mockImplementation(async () => ({
      data: [
        {
          id: 'job-1',
          jobNumber: 'JOB-1',
          status: 'scheduled',
          scheduledDate: new Date().toISOString(),
          scheduledStartTime: '08:00',
          facility: { name: 'HQ' },
          assignedTeam: { id: 'team-1', name: 'Sub Team A' },
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }));

    render(<Dashboard />);

    expect(await screen.findAllByText('Assigned Contracts')).toHaveLength(2);
    expect(screen.getByText('1 currently active')).toBeInTheDocument();
    expect(screen.getAllByText('Team assignment')).toHaveLength(2);
    expect(screen.getByText('HQ')).toBeInTheDocument();
  });
});
