import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as proposalActivityService from '../proposalActivityService';
import { prisma } from '../../lib/prisma';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    proposalActivity: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('proposalActivityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logActivity should persist activity with defaults', async () => {
    (prisma.proposalActivity.create as jest.Mock).mockResolvedValue({
      id: 'activity-1',
      action: 'created',
    });

    const result = await proposalActivityService.logActivity({
      proposalId: 'proposal-1',
      action: 'created',
    });

    expect(prisma.proposalActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          proposalId: 'proposal-1',
          action: 'created',
          performedByUserId: null,
          metadata: {},
          ipAddress: null,
        }),
      })
    );
    expect(result.id).toBe('activity-1');
  });

  it('getProposalActivities should return paginated activities', async () => {
    (prisma.proposalActivity.findMany as jest.Mock).mockResolvedValue([
      { id: 'activity-1', action: 'created' },
    ]);
    (prisma.proposalActivity.count as jest.Mock).mockResolvedValue(1);

    const result = await proposalActivityService.getProposalActivities('proposal-1', { page: 2, limit: 10 });

    expect(prisma.proposalActivity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { proposalId: 'proposal-1' },
        skip: 10,
        take: 10,
      })
    );
    expect(result.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
  });
});
