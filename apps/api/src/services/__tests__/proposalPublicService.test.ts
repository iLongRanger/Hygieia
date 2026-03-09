import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prisma } from '../../lib/prisma';
import { markPublicViewed } from '../proposalPublicService';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    proposal: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('proposalPublicService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('markPublicViewed returns newlyViewed=false when already viewed', async () => {
    (prisma.proposal.findUnique as jest.Mock).mockResolvedValue({
      id: 'proposal-1',
      status: 'viewed',
      viewedAt: new Date('2026-03-01T09:00:00.000Z'),
    });

    const result = await markPublicViewed('public-token');

    expect(prisma.proposal.update).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 'proposal-1', newlyViewed: false });
  });
});
