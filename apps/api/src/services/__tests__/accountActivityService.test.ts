import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as accountActivityService from '../accountActivityService';
import { prisma } from '../../lib/prisma';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    accountActivity: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('accountActivityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('listAccountActivities should return paginated activities', async () => {
    (prisma.accountActivity.findMany as jest.Mock).mockResolvedValue([
      { id: 'activity-1', entryType: 'note' },
    ]);
    (prisma.accountActivity.count as jest.Mock).mockResolvedValue(1);

    const result = await accountActivityService.listAccountActivities('account-1', {
      page: 1,
      limit: 20,
    });

    expect(prisma.accountActivity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId: 'account-1' },
        skip: 0,
        take: 20,
      })
    );
    expect(result.pagination.total).toBe(1);
  });

  it('createAccountActivity should persist activity with actor', async () => {
    (prisma.accountActivity.create as jest.Mock).mockResolvedValue({
      id: 'activity-1',
      entryType: 'complaint',
    });

    const result = await accountActivityService.createAccountActivity({
      accountId: 'account-1',
      entryType: 'complaint',
      note: 'Client complained about missed room.',
      performedByUserId: 'user-1',
    });

    expect(prisma.accountActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accountId: 'account-1',
          entryType: 'complaint',
          note: 'Client complained about missed room.',
          performedByUserId: 'user-1',
        }),
      })
    );
    expect(result.id).toBe('activity-1');
  });
});
