import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as contractActivityService from '../contractActivityService';
import { prisma } from '../../lib/prisma';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    contractActivity: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('contractActivityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logContractActivity should create activity with default metadata', async () => {
    (prisma.contractActivity.create as jest.Mock).mockResolvedValue({
      id: 'activity-1',
      action: 'created',
    });

    const result = await contractActivityService.logContractActivity({
      contractId: 'contract-1',
      action: 'created',
    });

    expect(prisma.contractActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contractId: 'contract-1',
          action: 'created',
          performedByUserId: null,
          metadata: {},
        }),
      })
    );
    expect(result.id).toBe('activity-1');
  });

  it('getContractActivities should return paginated result', async () => {
    (prisma.contractActivity.findMany as jest.Mock).mockResolvedValue([
      { id: 'activity-1', action: 'created' },
    ]);
    (prisma.contractActivity.count as jest.Mock).mockResolvedValue(3);

    const result = await contractActivityService.getContractActivities('contract-1', { page: 1, limit: 2 });

    expect(prisma.contractActivity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { contractId: 'contract-1' },
        skip: 0,
        take: 2,
      })
    );
    expect(result.pagination).toEqual({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
    });
  });
});
