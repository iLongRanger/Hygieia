import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as dashboardService from '../dashboardService';
import { prisma } from '../../lib/prisma';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    lead: { count: jest.fn(), groupBy: jest.fn(), aggregate: jest.fn() },
    account: { count: jest.fn() },
    contract: { count: jest.fn(), aggregate: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() },
    proposal: { count: jest.fn(), groupBy: jest.fn() },
    appointment: { findMany: jest.fn() },
    proposalActivity: { findMany: jest.fn() },
    contractActivity: { findMany: jest.fn() },
    accountActivity: { findMany: jest.fn() },
    user: { count: jest.fn() },
    team: { count: jest.fn() },
    job: { count: jest.fn() },
    inspection: { aggregate: jest.fn(), count: jest.fn() },
    timeEntry: { count: jest.fn() },
    timesheet: { count: jest.fn() },
    invoice: { aggregate: jest.fn(), count: jest.fn() },
  },
}));

describe('dashboardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.lead.count as jest.Mock).mockResolvedValue(0);
    (prisma.account.count as jest.Mock).mockResolvedValue(0);
    (prisma.contract.count as jest.Mock).mockResolvedValue(0);
    (prisma.proposal.count as jest.Mock).mockResolvedValue(0);
    (prisma.user.count as jest.Mock).mockResolvedValue(0);
    (prisma.team.count as jest.Mock).mockResolvedValue(0);
    (prisma.job.count as jest.Mock).mockResolvedValue(0);
    (prisma.inspection.aggregate as jest.Mock).mockResolvedValue({ _avg: { overallScore: null } });
    (prisma.inspection.count as jest.Mock).mockResolvedValue(0);
    (prisma.timeEntry.count as jest.Mock).mockResolvedValue(0);
    (prisma.timesheet.count as jest.Mock).mockResolvedValue(0);
    (prisma.invoice.aggregate as jest.Mock).mockResolvedValue({ _sum: { balanceDue: 0 } });
    (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
  });

  it('getDashboardStats should aggregate counts', async () => {
    (prisma.lead.count as jest.Mock)
      .mockResolvedValueOnce(10) // totalLeads
      .mockResolvedValueOnce(2); // newLeadsInPeriod
    (prisma.account.count as jest.Mock)
      .mockResolvedValueOnce(4) // activeAccounts
      .mockResolvedValueOnce(1); // newAccountsInPeriod
    (prisma.contract.count as jest.Mock).mockResolvedValue(3);
    (prisma.contract.aggregate as jest.Mock).mockResolvedValue({ _sum: { monthlyValue: 1250 } });
    (prisma.proposal.count as jest.Mock)
      .mockResolvedValueOnce(5) // proposalsSentInPeriod
      .mockResolvedValueOnce(2) // acceptedInPeriod
      .mockResolvedValueOnce(1); // rejectedInPeriod
    (prisma.lead.groupBy as jest.Mock).mockResolvedValue([
      { status: 'new', _count: { id: 6 } },
      { status: 'qualified', _count: { id: 4 } },
    ]);
    (prisma.lead.aggregate as jest.Mock).mockResolvedValue({ _sum: { estimatedValue: 9000 } });
    (prisma.proposal.groupBy as jest.Mock).mockResolvedValue([
      { status: 'sent', _count: { id: 3 }, _sum: { totalAmount: 3000 } },
    ]);
    (prisma.contract.groupBy as jest.Mock).mockResolvedValue([
      { status: 'active', _count: { id: 3 } },
    ]);
    (prisma.contract.findMany as jest.Mock)
      .mockResolvedValueOnce([]) // expiringContractsRaw
      .mockResolvedValueOnce([]); // activeContractsForRevenue
    (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.proposalActivity.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.contractActivity.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.accountActivity.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.user.count as jest.Mock).mockResolvedValue(3);
    (prisma.team.count as jest.Mock).mockResolvedValue(2);

    const result = await dashboardService.getDashboardStats();

    expect(result).toMatchObject({
      totalLeads: 10,
      newLeadsInPeriod: 2,
      activeAccounts: 4,
      newAccountsInPeriod: 1,
      activeContracts: 3,
      totalMRR: 1250,
      proposalsSentInPeriod: 5,
      proposalWinRate: 67,
      pipelineValue: 9000,
      activeUsers: 3,
      activeTeams: 2,
    });
    expect(result.leadsByStatus).toEqual([
      { status: 'new', count: 6 },
      { status: 'qualified', count: 4 },
    ]);
    expect(result.proposalsByStatus).toEqual([
      { status: 'sent', count: 3, totalAmount: 3000 },
    ]);
    expect(result.contractsByStatus).toEqual([{ status: 'active', count: 3 }]);
    expect(result.jobsTodayOverview).toEqual({
      scheduled: 0,
      inProgress: 0,
      completed: 0,
      unassigned: 0,
    });
    expect(result.expiringContracts).toEqual([]);
    expect(result.upcomingAppointments).toEqual([]);
    expect(result.recentActivity).toEqual([]);
    expect(result.revenueByMonth).toHaveLength(6);
  });
});
