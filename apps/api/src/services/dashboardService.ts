import { prisma } from '../lib/prisma';

export interface DashboardStats {
  totalLeads: number;
  activeAccounts: number;
  totalContacts: number;
  activeUsers: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [totalLeads, activeAccounts, totalContacts, activeUsers] =
    await Promise.all([
      prisma.lead.count({ where: { archivedAt: null } }),
      prisma.account.count({ where: { archivedAt: null } }),
      prisma.contact.count({ where: { archivedAt: null } }),
      prisma.user.count({ where: { status: 'active' } }),
    ]);

  return { totalLeads, activeAccounts, totalContacts, activeUsers };
}
