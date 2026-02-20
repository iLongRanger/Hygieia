import { prisma } from '../lib/prisma';

export type TimePeriod = 'week' | 'month' | 'quarter';

export interface DashboardParams {
  period?: TimePeriod;
  dateFrom?: Date;
  dateTo?: Date;
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

  // Operations — Jobs, Inspections, Time, Invoicing
  jobsScheduledToday: number;
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

async function getComparisonData(
  periodStart: Date,
  periodEnd: Date
): Promise<PeriodComparison> {
  const prev = getPreviousPeriodDates(periodStart, periodEnd);

  const [
    newLeads, newLeadsPrev,
    newAccounts, newAccountsPrev,
    proposalsSent, proposalsSentPrev,
    acceptedCur, rejectedCur,
    acceptedPrev, rejectedPrev,
    mrrAgg,
  ] = await Promise.all([
    prisma.lead.count({ where: { archivedAt: null, createdAt: { gte: periodStart, lte: periodEnd } } }),
    prisma.lead.count({ where: { archivedAt: null, createdAt: { gte: prev.start, lt: prev.end } } }),
    prisma.account.count({ where: { archivedAt: null, createdAt: { gte: periodStart, lte: periodEnd } } }),
    prisma.account.count({ where: { archivedAt: null, createdAt: { gte: prev.start, lt: prev.end } } }),
    prisma.proposal.count({ where: { sentAt: { gte: periodStart, lte: periodEnd }, archivedAt: null } }),
    prisma.proposal.count({ where: { sentAt: { gte: prev.start, lt: prev.end }, archivedAt: null } }),
    prisma.proposal.count({ where: { acceptedAt: { gte: periodStart, lte: periodEnd }, archivedAt: null } }),
    prisma.proposal.count({ where: { rejectedAt: { gte: periodStart, lte: periodEnd }, archivedAt: null } }),
    prisma.proposal.count({ where: { acceptedAt: { gte: prev.start, lt: prev.end }, archivedAt: null } }),
    prisma.proposal.count({ where: { rejectedAt: { gte: prev.start, lt: prev.end }, archivedAt: null } }),
    prisma.contract.aggregate({ _sum: { monthlyValue: true }, where: { status: 'active' } }),
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

export async function getDashboardStats(
  params: DashboardParams = {}
): Promise<DashboardStats> {
  const { period = 'month', dateFrom, dateTo } = params;

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
    comparison,
    jobsScheduledToday,
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
        status: { in: ['active', 'expired', 'terminated'] },
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

    // Period comparison
    getComparisonData(periodStart, periodEnd),

    // Operations — Jobs
    prisma.job.count({
      where: {
        scheduledDate: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
        },
        status: 'scheduled',
      },
    }),
    prisma.job.count({
      where: { status: 'completed', updatedAt: { gte: periodStart, lte: periodEnd } },
    }),
    prisma.job.count({
      where: { status: 'missed', updatedAt: { gte: periodStart, lte: periodEnd } },
    }),

    // Operations — Inspections
    prisma.inspection.aggregate({
      _avg: { overallScore: true },
      where: { status: 'completed', completedAt: { gte: periodStart, lte: periodEnd } },
    }),
    prisma.inspection.count({
      where: { status: 'completed', completedAt: { gte: periodStart, lte: periodEnd } },
    }),

    // Operations — Time Tracking
    prisma.timeEntry.count({
      where: { status: 'active', clockOut: null },
    }),
    prisma.timesheet.count({
      where: { status: { in: ['draft', 'submitted'] } },
    }),

    // Operations — Invoices
    prisma.invoice.aggregate({
      _sum: { balanceDue: true },
      where: { status: { notIn: ['void', 'written_off', 'paid'] } },
    }),
    prisma.invoice.count({
      where: {
        status: { notIn: ['void', 'written_off', 'paid'] },
        dueDate: { lt: now },
        balanceDue: { gt: 0 },
      },
    }),
    prisma.invoice.count({
      where: { status: 'paid', paidAt: { gte: periodStart, lte: periodEnd } },
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

    jobsScheduledToday,
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
          p.account.name, p.facility.name, p.createdByUser.fullName,
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
          c.account.name, c.facility.name,
          c.startDate.toISOString().slice(0, 10),
          c.endDate?.toISOString().slice(0, 10) ?? '',
          c.createdAt.toISOString().slice(0, 10),
        ])
      );
      return [header, ...rows].join('\n');
    }
  }
}
