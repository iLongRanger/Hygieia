import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as opportunityService from '../opportunityService';
import { prisma } from '../../lib/prisma';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    opportunity: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('opportunityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.opportunity.count as jest.Mock).mockResolvedValue(0);
  });

  it('listOpportunities scopes managers to owned or managed opportunities', async () => {
    await opportunityService.listOpportunities(
      { search: 'maple' },
      { userRole: 'manager', userId: 'manager-1' }
    );

    expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          archivedAt: null,
          AND: expect.arrayContaining([
            {
              OR: [
                { createdByUserId: 'manager-1' },
                { ownerUserId: 'manager-1' },
                { account: { accountManagerId: 'manager-1' } },
              ],
            },
            {
              OR: [
                { title: { contains: 'maple', mode: 'insensitive' } },
                { account: { name: { contains: 'maple', mode: 'insensitive' } } },
                { facility: { name: { contains: 'maple', mode: 'insensitive' } } },
                { lead: { contactName: { contains: 'maple', mode: 'insensitive' } } },
                { lead: { companyName: { contains: 'maple', mode: 'insensitive' } } },
              ],
            },
          ]),
        }),
      })
    );
  });
});
