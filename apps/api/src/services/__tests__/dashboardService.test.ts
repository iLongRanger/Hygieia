import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as dashboardService from '../dashboardService';
import { prisma } from '../../lib/prisma';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    lead: { count: jest.fn() },
    account: { count: jest.fn() },
    contact: { count: jest.fn() },
    user: { count: jest.fn() },
  },
}));

describe('dashboardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getDashboardStats should aggregate counts', async () => {
    (prisma.lead.count as jest.Mock).mockResolvedValue(10);
    (prisma.account.count as jest.Mock).mockResolvedValue(4);
    (prisma.contact.count as jest.Mock).mockResolvedValue(20);
    (prisma.user.count as jest.Mock).mockResolvedValue(3);

    const result = await dashboardService.getDashboardStats();

    expect(result).toEqual({
      totalLeads: 10,
      activeAccounts: 4,
      totalContacts: 20,
      activeUsers: 3,
    });
  });
});
