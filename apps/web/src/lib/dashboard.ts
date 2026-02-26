import api from './api';

export type TimePeriod = 'week' | 'month' | 'quarter' | 'custom';

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

export interface DashboardFetchParams {
  period?: TimePeriod;
  dateFrom?: string;
  dateTo?: string;
}

export async function getDashboardStats(
  params: DashboardFetchParams = {}
): Promise<DashboardStats> {
  const queryParams: Record<string, string> = {};

  if (params.dateFrom && params.dateTo) {
    queryParams.dateFrom = params.dateFrom;
    queryParams.dateTo = params.dateTo;
  } else if (params.period && params.period !== 'custom') {
    queryParams.period = params.period;
  } else {
    queryParams.period = 'month';
  }

  const response = await api.get('/dashboard/stats', { params: queryParams });
  return response.data.data;
}

export type ExportType = 'leads' | 'contracts' | 'proposals' | 'accounts';

export async function exportDashboardCsv(type: ExportType): Promise<void> {
  const response = await api.get('/dashboard/export', {
    params: { type },
    responseType: 'blob',
  });
  const blob = new Blob([response.data], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
