import api from './api';

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

export async function getDashboardStats(
  period: TimePeriod = 'month'
): Promise<DashboardStats> {
  const response = await api.get('/dashboard/stats', { params: { period } });
  return response.data.data;
}
