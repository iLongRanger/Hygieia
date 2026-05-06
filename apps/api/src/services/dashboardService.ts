import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export type TimePeriod = 'week' | 'month' | 'quarter';

export interface DashboardParams {
  period?: TimePeriod;
  dateFrom?: Date;
  dateTo?: Date;
  userRole?: string;
  userTeamId?: string;
  userId?: string;
}

export interface PeriodComparison {
  newLeads: number;
  newLeadsPrev: number;
  newLeadsChange: number | null;
  newAccounts: number;
  newAccountsPrev: number;
  newAccountsChange: number | null;
  proposalsSent: number;
  proposalsSentPrev: number;
  proposalsSentChange: number | null;
  winRate: number;
  winRatePrev: number;
  winRateChange: number | null;
  mrr: number;
  mrrPrev: number;
  mrrChange: number | null;
}

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

  // Period comparison
  comparison: PeriodComparison;

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
    endDate: string | null;
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

  // Operations — Jobs, Inspections, Time, Invoicing
  jobsScheduledToday: number;
  jobsTodayOverview: {
    scheduled: number;
    inProgress: number;
    completed: number;
    unassigned: number;
  };
  jobsCompletedInPeriod: number;
  jobsMissedInPeriod: number;
  inspectionAvgScore: number | null;
  inspectionsCompletedInPeriod: number;
  activeClockIns: number;
  pendingTimesheets: number;
  outstandingInvoiceAmount: number;
  overdueInvoiceCount: number;
  invoicesPaidInPeriod: number;

  // Team
  activeUsers: number;
  activeTeams: number;
}

function getPeriodDates(period: TimePeriod): { start: Date; end: Date } {
  const now = new Date();
  const end = now;
  let start: Date;
  switch (period) {
    case 'week':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    case 'quarter':
      start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      break;
  }
  return { start, end };
}

function getPreviousPeriodDates(periodStart: Date, periodEnd: Date): { start: Date; end: Date } {
  const durationMs = periodEnd.getTime() - periodStart.getTime();
  return {
    start: new Date(periodStart.getTime() - durationMs),
    end: new Date(periodStart.getTime()),
  };
}

function calcChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function getManagerLeadWhere(userId?: string): Prisma.LeadWhereInput {
  if (!userId) return {};
  return {
    OR: [
      { createdByUserId: userId },
      { assignedToUserId: userId },
      { convertedToAccount: { is: { accountManagerId: userId } } },
    ],
  };
}

function getManagerAccountWhere(userId?: string): Prisma.AccountWhereInput {
  return userId ? { accountManagerId: userId } : {};
}

function getManagerAccountRelationWhere(userId?: string): { account?: { accountManagerId: string } } {
  return userId ? { account: { accountManagerId: userId } } : {};
}

function getManagerJobWhere(userId?: string): Prisma.JobWhereInput {
  return userId ? { account: { accountManagerId: userId } } : {};
}

function getManagerInspectionWhere(userId?: string): Prisma.InspectionWhereInput {
  return userId ? { account: { accountManagerId: userId } } : {};
}

function getManagerTimeEntryWhere(userId?: string): Prisma.TimeEntryWhereInput {
  if (!userId) return {};
  return {
    OR: [
      { job: { is: { account: { accountManagerId: userId } } } },
      { contract: { is: { account: { accountManagerId: userId } } } },
      { facility: { is: { account: { accountManagerId: userId } } } },
    ],
  };
}

function getManagerAppointmentWhere(userId?: string): Prisma.AppointmentWhereInput {
  if (!userId) return {};
  return {
    OR: [
      { createdByUserId: userId },
      { assignedToUserId: userId },
      { account: { is: { accountManagerId: userId } } },
      { facility: { is: { account: { accountManagerId: userId } } } },
      { lead: { is: getManagerLeadWhere(userId) } },
    ],
  };
}

async function getComparisonData(
  periodStart: Date,
  periodEnd: Date,
  managerUserId?: string
): Promise<PeriodComparison> {
  const prev = getPreviousPeriodDates(periodStart, periodEnd);
  const leadScope = getManagerLeadWhere(managerUserId);
  const accountScope = getManagerAccountWhere(managerUserId);
  const accountRelationScope = getManagerAccountRelationWhere(managerUserId);

  const [
    newLeads, newLeadsPrev,
    newAccounts, newAccountsPrev,
    proposalsSent, proposalsSentPrev,
    acceptedCur, rejectedCur,
    acceptedPrev, rejectedPrev,
    mrrAgg,
  ] = await Promise.all([
    prisma.lead.count({ where: { archivedAt: null, createdAt: { gte: periodStart, lte: periodEnd }, ...leadScope } }),
    prisma.lead.count({ where: { archivedAt: null, createdAt: { gte: prev.start, lt: prev.end }, ...leadScope } }),
    prisma.account.count({ where: { archivedAt: null, createdAt: { gte: periodStart, lte: periodEnd }, ...accountScope } }),
    prisma.account.count({ where: { archivedAt: null, createdAt: { gte: prev.start, lt: prev.end }, ...accountScope } }),
    prisma.proposal.count({ where: { sentAt: { gte: periodStart, lte: periodEnd }, archivedAt: null, ...accountRelationScope } }),
    prisma.proposal.count({ where: { sentAt: { gte: prev.start, lt: prev.end }, archivedAt: null, ...accountRelationScope } }),
    prisma.proposal.count({ where: { acceptedAt: { gte: periodStart, lte: periodEnd }, archivedAt: null, ...accountRelationScope } }),
    prisma.proposal.count({ where: { rejectedAt: { gte: periodStart, lte: periodEnd }, archivedAt: null, ...accountRelationScope } }),
    prisma.proposal.count({ where: { acceptedAt: { gte: prev.start, lt: prev.end }, archivedAt: null, ...accountRelationScope } }),
    prisma.proposal.count({ where: { rejectedAt: { gte: prev.start, lt: prev.end }, archivedAt: null, ...accountRelationScope } }),
    prisma.contract.aggregate({ _sum: { monthlyValue: true }, where: { status: 'active', ...accountRelationScope } }),
  ]);

  const totalDecidedCur = acceptedCur + rejectedCur;
  const winRate = totalDecidedCur > 0 ? Math.round((acceptedCur / totalDecidedCur) * 100) : 0;
  const totalDecidedPrev = acceptedPrev + rejectedPrev;
  const winRatePrev = totalDecidedPrev > 0 ? Math.round((acceptedPrev / totalDecidedPrev) * 100) : 0;
  const mrr = Number(mrrAgg._sum.monthlyValue ?? 0);

  return {
    newLeads, newLeadsPrev, newLeadsChange: calcChange(newLeads, newLeadsPrev),
    newAccounts, newAccountsPrev, newAccountsChange: calcChange(newAccounts, newAccountsPrev),
    proposalsSent, proposalsSentPrev, proposalsSentChange: calcChange(proposalsSent, proposalsSentPrev),
    winRate, winRatePrev, winRateChange: calcChange(winRate, winRatePrev),
    mrr, mrrPrev: 0, mrrChange: null, // MRR comparison not meaningful without historical snapshots
  };
}

function buildEmptyOperationsDashboard(operations: {
  jobsScheduledToday?: number;
  jobsInProgressToday?: number;
  jobsCompletedToday?: number;
  jobsCompletedInPeriod?: number;
  jobsMissedInPeriod?: number;
  inspectionAvgScore?: number | null;
  inspectionsCompletedInPeriod?: number;
  activeClockIns?: number;
  pendingTimesheets?: number;
} = {}): DashboardStats {
  const emptyComparison: PeriodComparison = {
    newLeads: 0, newLeadsPrev: 0, newLeadsChange: null,
    newAccounts: 0, newAccountsPrev: 0, newAccountsChange: null,
    proposalsSent: 0, proposalsSentPrev: 0, proposalsSentChange: null,
    winRate: 0, winRatePrev: 0, winRateChange: null,
    mrr: 0, mrrPrev: 0, mrrChange: null,
  };

  return {
    totalLeads: 0,
    newLeadsInPeriod: 0,
    activeAccounts: 0,
    newAccountsInPeriod: 0,
    activeContracts: 0,
    totalMRR: 0,
    proposalsSentInPeriod: 0,
    proposalWinRate: 0,
    comparison: emptyComparison,
    leadsByStatus: [],
    pipelineValue: 0,
    proposalsByStatus: [],
    contractsByStatus: [],
    expiringContracts: [],
    revenueByMonth: [],
    upcomingAppointments: [],
    recentActivity: [],
    jobsScheduledToday: operations.jobsScheduledToday ?? 0,
    jobsTodayOverview: {
      scheduled: operations.jobsScheduledToday ?? 0,
      inProgress: operations.jobsInProgressToday ?? 0,
      completed: operations.jobsCompletedToday ?? 0,
      unassigned: 0,
    },
    jobsCompletedInPeriod: operations.jobsCompletedInPeriod ?? 0,
    jobsMissedInPeriod: operations.jobsMissedInPeriod ?? 0,
    inspectionAvgScore: operations.inspectionAvgScore ?? null,
    inspectionsCompletedInPeriod: operations.inspectionsCompletedInPeriod ?? 0,
    activeClockIns: operations.activeClockIns ?? 0,
    pendingTimesheets: operations.pendingTimesheets ?? 0,
    outstandingInvoiceAmount: 0,
    overdueInvoiceCount: 0,
    invoicesPaidInPeriod: 0,
    activeUsers: 0,
    activeTeams: 0,
  };
}

async function getCleanerDashboard(
  periodStart: Date,
  periodEnd: Date,
  userId: string
): Promise<DashboardStats> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const userWhere = { assignedToUserId: userId };

  const [
    jobsScheduledToday,
    jobsInProgressToday,
    jobsCompletedToday,
    jobsCompletedInPeriod,
    jobsMissedInPeriod,
    inspectionScoreAgg,
    inspectionsCompletedInPeriod,
    activeClockIns,
    pendingTimesheets,
  ] = await Promise.all([
    prisma.job.count({
      where: { ...userWhere, scheduledDate: { gte: todayStart, lt: todayEnd }, status: 'scheduled' },
    }),
    prisma.job.count({
      where: { ...userWhere, scheduledDate: { gte: todayStart, lt: todayEnd }, status: 'in_progress' },
    }),
    prisma.job.count({
      where: { ...userWhere, scheduledDate: { gte: todayStart, lt: todayEnd }, status: 'completed' },
    }),
    prisma.job.count({
      where: { ...userWhere, status: 'completed', updatedAt: { gte: periodStart, lte: periodEnd } },
    }),
    prisma.job.count({
      where: { ...userWhere, status: 'missed', updatedAt: { gte: periodStart, lte: periodEnd } },
    }),
    prisma.inspection.aggregate({
      _avg: { overallScore: true },
      where: {
        status: 'completed',
        completedAt: { gte: periodStart, lte: periodEnd },
        job: userWhere,
      },
    }),
    prisma.inspection.count({
      where: {
        status: 'completed',
        completedAt: { gte: periodStart, lte: periodEnd },
        job: userWhere,
      },
    }),
    prisma.timeEntry.count({
      where: { status: 'active', clockOut: null, userId },
    }),
    prisma.timesheet.count({
      where: { status: { in: ['draft', 'submitted'] }, userId },
    }),
  ]);

  return buildEmptyOperationsDashboard({
    jobsScheduledToday,
    jobsInProgressToday,
    jobsCompletedToday,
    jobsCompletedInPeriod,
    jobsMissedInPeriod,
    inspectionAvgScore: inspectionScoreAgg._avg.overallScore
      ? Math.round(Number(inspectionScoreAgg._avg.overallScore) * 10) / 10
      : null,
    inspectionsCompletedInPeriod,
    activeClockIns,
    pendingTimesheets,
  });
}

async function getSubcontractorDashboard(
  periodStart: Date,
  periodEnd: Date,
  teamId: string
): Promise<DashboardStats> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const teamWhere = { assignedTeamId: teamId };

  const [
    jobsScheduledToday,
    jobsInProgressToday,
    jobsCompletedToday,
    jobsCompletedInPeriod,
    jobsMissedInPeriod,
    inspectionScoreAgg,
    inspectionsCompletedInPeriod,
    activeClockIns,
    pendingTimesheets,
  ] = await Promise.all([
    prisma.job.count({
      where: { ...teamWhere, scheduledDate: { gte: todayStart, lt: todayEnd }, status: 'scheduled' },
    }),
    prisma.job.count({
      where: { ...teamWhere, scheduledDate: { gte: todayStart, lt: todayEnd }, status: 'in_progress' },
    }),
    prisma.job.count({
      where: { ...teamWhere, scheduledDate: { gte: todayStart, lt: todayEnd }, status: 'completed' },
    }),
    prisma.job.count({
      where: { ...teamWhere, status: 'completed', updatedAt: { gte: periodStart, lte: periodEnd } },
    }),
    prisma.job.count({
      where: { ...teamWhere, status: 'missed', updatedAt: { gte: periodStart, lte: periodEnd } },
    }),
    prisma.inspection.aggregate({
      _avg: { overallScore: true },
      where: {
        status: 'completed',
        completedAt: { gte: periodStart, lte: periodEnd },
        job: teamWhere,
      },
    }),
    prisma.inspection.count({
      where: {
        status: 'completed',
        completedAt: { gte: periodStart, lte: periodEnd },
        job: teamWhere,
      },
    }),
    prisma.timeEntry.count({
      where: { status: 'active', clockOut: null, user: { teamId } },
    }),
    prisma.timesheet.count({
      where: { status: { in: ['draft', 'submitted'] }, user: { teamId } },
    }),
  ]);

  // Zero out all sales/revenue data for subcontractors
  const emptyComparison: PeriodComparison = {
    newLeads: 0, newLeadsPrev: 0, newLeadsChange: null,
    newAccounts: 0, newAccountsPrev: 0, newAccountsChange: null,
    proposalsSent: 0, proposalsSentPrev: 0, proposalsSentChange: null,
    winRate: 0, winRatePrev: 0, winRateChange: null,
    mrr: 0, mrrPrev: 0, mrrChange: null,
  };

  return {
    totalLeads: 0,
    newLeadsInPeriod: 0,
    activeAccounts: 0,
    newAccountsInPeriod: 0,
    activeContracts: 0,
    totalMRR: 0,
    proposalsSentInPeriod: 0,
    proposalWinRate: 0,
    comparison: emptyComparison,
    leadsByStatus: [],
    pipelineValue: 0,
    proposalsByStatus: [],
    contractsByStatus: [],
    expiringContracts: [],
    revenueByMonth: [],
    upcomingAppointments: [],
    recentActivity: [],
    jobsScheduledToday,
    jobsTodayOverview: {
      scheduled: jobsScheduledToday,
      inProgress: jobsInProgressToday,
      completed: jobsCompletedToday,
      unassigned: 0,
    },
    jobsCompletedInPeriod,
    jobsMissedInPeriod,
    inspectionAvgScore: inspectionScoreAgg._avg.overallScore
      ? Math.round(Number(inspectionScoreAgg._avg.overallScore) * 10) / 10
      : null,
    inspectionsCompletedInPeriod,
    activeClockIns,
    pendingTimesheets,
    outstandingInvoiceAmount: 0,
    overdueInvoiceCount: 0,
    invoicesPaidInPeriod: 0,
    activeUsers: 0,
    activeTeams: 0,
  };
}

export async function getDashboardStats(
  params: DashboardParams = {}
): Promise<DashboardStats> {
  const { period = 'month', dateFrom, dateTo, userRole, userTeamId, userId } = params;

  let periodStart: Date;
  let periodEnd: Date;

  if (dateFrom && dateTo) {
    periodStart = dateFrom;
    periodEnd = dateTo;
  } else {
    const dates = getPeriodDates(period);
    periodStart = dates.start;
    periodEnd = dates.end;
  }

  // Cleaners get a per-user operations dashboard (no sales / company-wide data)
  if (userRole === 'cleaner') {
    if (!userId) {
      return buildEmptyOperationsDashboard();
    }
    return getCleanerDashboard(periodStart, periodEnd, userId);
  }

  // Subcontractors get a scoped dashboard with only operations data for their team
  if (userRole === 'subcontractor') {
    if (!userTeamId) {
      return buildEmptyOperationsDashboard();
    }
    return getSubcontractorDashboard(periodStart, periodEnd, userTeamId);
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const sixtyDaysFromNow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 60
  );
  const managerUserId = userRole === 'manager' ? userId : undefined;
  const leadScope = getManagerLeadWhere(managerUserId);
  const accountScope = getManagerAccountWhere(managerUserId);
  const accountRelationScope = getManagerAccountRelationWhere(managerUserId);
  const jobScope = getManagerJobWhere(managerUserId);
  const inspectionScope = getManagerInspectionWhere(managerUserId);
  const timeEntryScope = getManagerTimeEntryWhere(managerUserId);
  const appointmentScope = getManagerAppointmentWhere(managerUserId);

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
    comparison,
    jobsScheduledToday,
    jobsInProgressToday,
    jobsCompletedToday,
    jobsUnassignedToday,
    jobsCompletedInPeriod,
    jobsMissedInPeriod,
    inspectionScoreAgg,
    inspectionsCompletedInPeriod,
    activeClockIns,
    pendingTimesheets,
    outstandingInvoiceAgg,
    overdueInvoiceCount,
    invoicesPaidInPeriod,
  ] = await Promise.all([
    // Counts
    prisma.lead.count({ where: { archivedAt: null, ...leadScope } }),
    prisma.lead.count({
      where: { archivedAt: null, createdAt: { gte: periodStart }, ...leadScope },
    }),
    prisma.account.count({ where: { archivedAt: null, ...accountScope } }),
    prisma.account.count({
      where: { archivedAt: null, createdAt: { gte: periodStart }, ...accountScope },
    }),
    prisma.contract.count({ where: { status: 'active', ...accountRelationScope } }),

    // MRR
    prisma.contract.aggregate({
      _sum: { monthlyValue: true },
      where: { status: 'active', ...accountRelationScope },
    }),

    // Proposals sent in period
    prisma.proposal.count({
      where: { sentAt: { gte: periodStart }, archivedAt: null, ...accountRelationScope },
    }),

    // Win rate: accepted in period
    prisma.proposal.count({
      where: { acceptedAt: { gte: periodStart }, archivedAt: null, ...accountRelationScope },
    }),
    // Win rate: rejected in period
    prisma.proposal.count({
      where: { rejectedAt: { gte: periodStart }, archivedAt: null, ...accountRelationScope },
    }),

    // Leads by status
    prisma.lead.groupBy({
      by: ['status'],
      _count: { id: true },
      where: { archivedAt: null, ...leadScope },
    }),

    // Pipeline value
    prisma.lead.aggregate({
      _sum: { estimatedValue: true },
      where: {
        archivedAt: null,
        status: { notIn: ['won', 'lost'] },
        ...leadScope,
      },
    }),

    // Proposals by status
    prisma.proposal.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { totalAmount: true },
      where: { archivedAt: null, ...accountRelationScope },
    }),

    // Contracts by status
    prisma.contract.groupBy({
      by: ['status'],
      _count: { id: true },
      where: accountRelationScope,
    }),

    // Expiring contracts (within 60 days)
    prisma.contract.findMany({
      where: {
        status: 'active',
        endDate: { lte: sixtyDaysFromNow, gte: now },
        ...accountRelationScope,
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
        status: { in: ['active', 'expired', 'terminated'] },
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: sixMonthsAgo } }],
        ...accountRelationScope,
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
        ...appointmentScope,
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
      where: managerUserId ? { proposal: accountRelationScope } : undefined,
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
      where: managerUserId ? { contract: accountRelationScope } : undefined,
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
      where: managerUserId ? { account: accountScope } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),

    // Users & Teams
    managerUserId ? Promise.resolve(0) : prisma.user.count({ where: { status: 'active' } }),
    managerUserId ? Promise.resolve(0) : prisma.team.count({ where: { isActive: true, archivedAt: null } }),

    // Period comparison
    getComparisonData(periodStart, periodEnd, managerUserId),

    // Operations — Jobs
    prisma.job.count({
      where: {
        scheduledDate: {
          gte: todayStart,
          lt: todayEnd,
        },
        status: 'scheduled',
        ...jobScope,
      },
    }),
    prisma.job.count({
      where: {
        scheduledDate: {
          gte: todayStart,
          lt: todayEnd,
        },
        status: 'in_progress',
        ...jobScope,
      },
    }),
    prisma.job.count({
      where: {
        scheduledDate: {
          gte: todayStart,
          lt: todayEnd,
        },
        status: 'completed',
        ...jobScope,
      },
    }),
    prisma.job.count({
      where: {
        scheduledDate: {
          gte: todayStart,
          lt: todayEnd,
        },
        status: { in: ['scheduled', 'in_progress'] },
        assignedTeamId: null,
        assignedToUserId: null,
        ...jobScope,
      },
    }),
    prisma.job.count({
      where: { status: 'completed', updatedAt: { gte: periodStart, lte: periodEnd }, ...jobScope },
    }),
    prisma.job.count({
      where: { status: 'missed', updatedAt: { gte: periodStart, lte: periodEnd }, ...jobScope },
    }),

    // Operations — Inspections
    prisma.inspection.aggregate({
      _avg: { overallScore: true },
      where: { status: 'completed', completedAt: { gte: periodStart, lte: periodEnd }, ...inspectionScope },
    }),
    prisma.inspection.count({
      where: { status: 'completed', completedAt: { gte: periodStart, lte: periodEnd }, ...inspectionScope },
    }),

    // Operations — Time Tracking
    prisma.timeEntry.count({
      where: { status: 'active', clockOut: null, ...timeEntryScope },
    }),
    prisma.timesheet.count({
      where: managerUserId
        ? {
            status: { in: ['draft', 'submitted'] },
            entries: { some: timeEntryScope },
          }
        : { status: { in: ['draft', 'submitted'] } },
    }),

    // Operations — Invoices
    prisma.invoice.aggregate({
      _sum: { balanceDue: true },
      where: { status: { notIn: ['void', 'written_off', 'paid'] }, ...accountRelationScope },
    }),
    prisma.invoice.count({
      where: {
        status: { notIn: ['void', 'written_off', 'paid'] },
        dueDate: { lt: now },
        balanceDue: { gt: 0 },
        ...accountRelationScope,
      },
    }),
    prisma.invoice.count({
      where: { status: 'paid', paidAt: { gte: periodStart, lte: periodEnd }, ...accountRelationScope },
    }),
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

    comparison,

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
      endDate: c.endDate?.toISOString().slice(0, 10) ?? null,
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

    jobsScheduledToday,
    jobsTodayOverview: {
      scheduled: jobsScheduledToday,
      inProgress: jobsInProgressToday,
      completed: jobsCompletedToday,
      unassigned: jobsUnassignedToday,
    },
    jobsCompletedInPeriod,
    jobsMissedInPeriod,
    inspectionAvgScore: inspectionScoreAgg._avg.overallScore
      ? Math.round(Number(inspectionScoreAgg._avg.overallScore) * 10) / 10
      : null,
    inspectionsCompletedInPeriod,
    activeClockIns,
    pendingTimesheets,
    outstandingInvoiceAmount: Number(outstandingInvoiceAgg._sum.balanceDue ?? 0),
    overdueInvoiceCount,
    invoicesPaidInPeriod,

    activeUsers,
    activeTeams,
  };
}

// --- CSV Export ---

export type ExportType = 'leads' | 'contracts' | 'proposals' | 'accounts';

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(values: unknown[]): string {
  return values.map(escapeCsv).join(',');
}

export async function exportDashboardCsv(type: ExportType): Promise<string> {
  switch (type) {
    case 'leads': {
      const leads = await prisma.lead.findMany({
        where: { archivedAt: null },
        select: {
          id: true,
          status: true,
          contactName: true,
          companyName: true,
          primaryEmail: true,
          primaryPhone: true,
          estimatedValue: true,
          probability: true,
          createdAt: true,
          leadSource: { select: { name: true } },
          assignedToUser: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      const header = 'ID,Status,Contact Name,Company,Email,Phone,Estimated Value,Probability,Source,Assigned To,Created At';
      const rows = leads.map((l) =>
        toCsvRow([
          l.id, l.status, l.contactName, l.companyName, l.primaryEmail,
          l.primaryPhone, l.estimatedValue ? Number(l.estimatedValue) : '',
          l.probability, l.leadSource?.name, l.assignedToUser?.fullName,
          l.createdAt.toISOString().slice(0, 10),
        ])
      );
      return [header, ...rows].join('\n');
    }

    case 'accounts': {
      const accounts = await prisma.account.findMany({
        where: { archivedAt: null },
        select: {
          id: true,
          name: true,
          type: true,
          industry: true,
          billingEmail: true,
          billingPhone: true,
          paymentTerms: true,
          createdAt: true,
          accountManager: { select: { fullName: true } },
          _count: { select: { contacts: true, facilities: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      const header = 'ID,Name,Type,Industry,Billing Email,Billing Phone,Payment Terms,Manager,Contacts,Facilities,Created At';
      const rows = accounts.map((a) =>
        toCsvRow([
          a.id, a.name, a.type, a.industry, a.billingEmail, a.billingPhone,
          a.paymentTerms, a.accountManager?.fullName, a._count.contacts,
          a._count.facilities, a.createdAt.toISOString().slice(0, 10),
        ])
      );
      return [header, ...rows].join('\n');
    }

    case 'proposals': {
      const proposals = await prisma.proposal.findMany({
        where: { archivedAt: null },
        select: {
          id: true,
          proposalNumber: true,
          title: true,
          status: true,
          totalAmount: true,
          sentAt: true,
          acceptedAt: true,
          rejectedAt: true,
          createdAt: true,
          account: { select: { name: true } },
          facility: { select: { name: true } },
          createdByUser: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      const header = 'ID,Number,Title,Status,Total Amount,Account,Facility,Created By,Sent At,Accepted At,Rejected At,Created At';
      const rows = proposals.map((p) =>
        toCsvRow([
          p.id, p.proposalNumber, p.title, p.status, Number(p.totalAmount),
          p.account.name, p.facility?.name ?? '', p.createdByUser.fullName,
          p.sentAt?.toISOString().slice(0, 10) ?? '',
          p.acceptedAt?.toISOString().slice(0, 10) ?? '',
          p.rejectedAt?.toISOString().slice(0, 10) ?? '',
          p.createdAt.toISOString().slice(0, 10),
        ])
      );
      return [header, ...rows].join('\n');
    }

    case 'contracts': {
      const contracts = await prisma.contract.findMany({
        select: {
          id: true,
          contractNumber: true,
          title: true,
          status: true,
          monthlyValue: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          account: { select: { name: true } },
          facility: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      const header = 'ID,Number,Title,Status,Monthly Value,Account,Facility,Start Date,End Date,Created At';
      const rows = contracts.map((c) =>
        toCsvRow([
          c.id, c.contractNumber, c.title, c.status, Number(c.monthlyValue),
          c.account.name, c.facility?.name ?? '',
          c.startDate.toISOString().slice(0, 10),
          c.endDate?.toISOString().slice(0, 10) ?? '',
          c.createdAt.toISOString().slice(0, 10),
        ])
      );
      return [header, ...rows].join('\n');
    }
  }
}
