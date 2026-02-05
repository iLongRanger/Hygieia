import api from './api';

export interface DashboardStats {
  totalLeads: number;
  activeAccounts: number;
  totalContacts: number;
  activeUsers: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await api.get('/dashboard/stats');
  return response.data.data;
}
