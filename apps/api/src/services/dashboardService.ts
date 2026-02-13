import { prisma } from '../lib/prisma';

export type TimePeriod = 'week' | 'month' | 'quarter';

export interface DashboardStats {
  // KPI Cards
  totalLeads: number;
  newLeadsInPeriod: number;
  activeAccounts: number;
  newAccountsInPeriod: number;
  activeContracts: number;
  totalMRR: number;
  proposalsSentInPeriod: number;
  proposalWinRate: number;

  // Sales Pipeline
  leadsByStatus: { status: string; count: number }[];
  pipelineValue: number;
  proposalsByStatus: { status: string; count: number; totalAmount: number }[];

  // Revenue & Contracts
  contractsByStatus: { status: string; count: number }[];
  expiringContracts: {
    id: string;
    contractNumber: string;
    title: string;
    accountName: string;
    monthlyValue: number;
    endDate: string;
    status: string;
  }[];
  revenueByMonth: { month: string; mrr: number }[];

  // Operations
  upcomingAppointments: {
    id: string;
    type: string;
    status: string;
    scheduledStart: string;
    assignedToUser: { id: string; fullName: string };
    lead?: { id: string; companyName: string | null; contactName: string } | null;
    account?: { id: string; name: string } | null;
  }[];
  recentActivity: {
    id: string;
    entityType: string;
    entityId: string;
    entityLabel: string;
    action: string;
    performedBy: string;
    createdAt: string;
  }[];

  // Team
  activeUsers: number;
  activeTeams: number;
}

function getPeriodStart(period: TimePeriod): Date {
  const now = new Date();
  switch (period) {
    case 'week':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    case 'month':
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    case 'quarter':
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  }
}

export async function getDashboardStats(
  period: TimePeriod = 'month'
): Promise<DashboardStats> {
  const periodStart = getPeriodStart(period);
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const sixtyDaysFromNow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 60
  );

  const [
    totalLeads,
    newLeadsInPeriod,
    activeAccounts,
    newAccountsInPeriod,
    activeContracts,
    mrrAggregate,
    proposalsSentInPeriod,
    acceptedInPeriod,
    rejectedInPeriod,
    leadsByStatusRaw,
    pipelineAggregate,
    proposalsByStatusRaw,
    contractsByStatusRaw,
    expiringContractsRaw,
    activeContractsForRevenue,
    upcomingAppointmentsRaw,
    proposalActivities,
    contractActivities,
    accountActivities,
    activeUsers,
    activeTeams,
  ] = await Promise.all([
    // Counts
    prisma.lead.count({ where: { archivedAt: null } }),
    prisma.lead.count({
      where: { archivedAt: null, createdAt: { gte: periodStart } },
    }),
    prisma.account.count({ where: { archivedAt: null } }),
    prisma.account.count({
      where: { archivedAt: null, createdAt: { gte: periodStart } },
    }),
    prisma.contract.count({ where: { status: 'active' } }),

    // MRR
    prisma.contract.aggregate({
      _sum: { monthlyValue: true },
      where: { status: 'active' },
    }),

    // Proposals sent in period
    prisma.proposal.count({
      where: { sentAt: { gte: periodStart }, archivedAt: null },
    }),

    // Win rate: accepted in period
    prisma.proposal.count({
      where: { acceptedAt: { gte: periodStart }, archivedAt: null },
    }),
    // Win rate: rejected in period
    prisma.proposal.count({
      where: { rejectedAt: { gte: periodStart }, archivedAt: null },
    }),

    // Leads by status
    prisma.lead.groupBy({
      by: ['status'],
      _count: { id: true },
      where: { archivedAt: null },
    }),

    // Pipeline value
    prisma.lead.aggregate({
      _sum: { estimatedValue: true },
      where: {
        archivedAt: null,
        status: { notIn: ['won', 'lost'] },
      },
    }),

    // Proposals by status
    prisma.proposal.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { totalAmount: true },
      where: { archivedAt: null },
    }),

    // Contracts by status
    prisma.contract.groupBy({
      by: ['status'],
      _count: { id: true },
    }),

    // Expiring contracts (within 60 days)
    prisma.contract.findMany({
      where: {
        status: 'active',
        endDate: { lte: sixtyDaysFromNow, gte: now },
      },
      select: {
        id: true,
        contractNumber: true,
        title: true,
        monthlyValue: true,
        endDate: true,
        status: true,
        account: { select: { name: true } },
      },
      orderBy: { endDate: 'asc' },
      take: 10,
    }),

    // Active contracts for revenue trend
    prisma.contract.findMany({
      where: {
        status: { in: ['active', 'expired', 'terminated', 'renewed'] },
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: sixMonthsAgo } }],
      },
      select: {
        monthlyValue: true,
        startDate: true,
        endDate: true,
        status: true,
      },
    }),

    // Upcoming appointments
    prisma.appointment.findMany({
      where: {
        scheduledStart: { gte: now },
        status: { in: ['scheduled', 'rescheduled'] },
      },
      select: {
        id: true,
        type: true,
        status: true,
        scheduledStart: true,
        assignedToUser: { select: { id: true, fullName: true } },
        lead: { select: { id: true, companyName: true, contactName: true } },
        account: { select: { id: true, name: true } },
      },
      orderBy: { scheduledStart: 'asc' },
      take: 10,
    }),

    // Recent activity: proposals
    prisma.proposalActivity.findMany({
      select: {
        id: true,
        action: true,
        createdAt: true,
        performedByUser: { select: { fullName: true } },
        proposal: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),

    // Recent activity: contracts
    prisma.contractActivity.findMany({
      select: {
        id: true,
        action: true,
        createdAt: true,
        performedByUser: { select: { fullName: true } },
        contract: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),

    // Recent activity: accounts
    prisma.accountActivity.findMany({
      select: {
        id: true,
        entryType: true,
        createdAt: true,
        performedByUser: { select: { fullName: true } },
        account: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),

    // Users & Teams
    prisma.user.count({ where: { status: 'active' } }),
    prisma.team.count({ where: { isActive: true, archivedAt: null } }),
  ]);

  // Build win rate
  const totalDecided = acceptedInPeriod + rejectedInPeriod;
  const proposalWinRate =
    totalDecided > 0 ? Math.round((acceptedInPeriod / totalDecided) * 100) : 0;

  // Build revenue by month (last 6 months)
  const revenueByMonth: { month: string; mrr: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const monthKey = monthDate.toISOString().slice(0, 7); // YYYY-MM

    let mrr = 0;
    for (const c of activeContractsForRevenue) {
      const start = new Date(c.startDate);
      const end = c.endDate ? new Date(c.endDate) : null;
      if (start <= monthEnd && (!end || end >= monthDate)) {
        mrr += Number(c.monthlyValue);
      }
    }
    revenueByMonth.push({ month: monthKey, mrr: Math.round(mrr * 100) / 100 });
  }

  // Merge recent activities
  const allActivities = [
    ...proposalActivities.map((a) => ({
      id: a.id,
      entityType: 'proposal' as const,
      entityId: a.proposal.id,
      entityLabel: a.proposal.title,
      action: a.action,
      performedBy: a.performedByUser?.fullName ?? 'System',
      createdAt: a.createdAt.toISOString(),
    })),
    ...contractActivities.map((a) => ({
      id: a.id,
      entityType: 'contract' as const,
      entityId: a.contract.id,
      entityLabel: a.contract.title,
      action: a.action,
      performedBy: a.performedByUser?.fullName ?? 'System',
      createdAt: a.createdAt.toISOString(),
    })),
    ...accountActivities.map((a) => ({
      id: a.id,
      entityType: 'account' as const,
      entityId: a.account.id,
      entityLabel: a.account.name,
      action: a.entryType,
      performedBy: a.performedByUser?.fullName ?? 'System',
      createdAt: a.createdAt.toISOString(),
    })),
  ];
  allActivities.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const recentActivity = allActivities.slice(0, 20);

  return {
    totalLeads,
    newLeadsInPeriod,
    activeAccounts,
    newAccountsInPeriod,
    activeContracts,
    totalMRR: Number(mrrAggregate._sum.monthlyValue ?? 0),
    proposalsSentInPeriod,
    proposalWinRate,

    leadsByStatus: leadsByStatusRaw.map((g) => ({
      status: g.status,
      count: g._count.id,
    })),
    pipelineValue: Number(pipelineAggregate._sum.estimatedValue ?? 0),
    proposalsByStatus: proposalsByStatusRaw.map((g) => ({
      status: g.status,
      count: g._count.id,
      totalAmount: Number(g._sum.totalAmount ?? 0),
    })),

    contractsByStatus: contractsByStatusRaw.map((g) => ({
      status: g.status,
      count: g._count.id,
    })),
    expiringContracts: expiringContractsRaw.map((c) => ({
      id: c.id,
      contractNumber: c.contractNumber,
      title: c.title,
      accountName: c.account.name,
      monthlyValue: Number(c.monthlyValue),
      endDate: c.endDate!.toISOString().slice(0, 10),
      status: c.status,
    })),
    revenueByMonth,

    upcomingAppointments: upcomingAppointmentsRaw.map((a) => ({
      id: a.id,
      type: a.type,
      status: a.status,
      scheduledStart: a.scheduledStart.toISOString(),
      assignedToUser: a.assignedToUser,
      lead: a.lead,
      account: a.account,
    })),
    recentActivity,

    activeUsers,
    activeTeams,
  };
}
