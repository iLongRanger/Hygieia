import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prisma } from '../../lib/prisma';
import { acceptProposalPublic, markPublicViewed, rejectProposalPublic } from '../proposalPublicService';

jest.mock('../leadService', () => ({
  autoAdvanceLeadStatusForAccount: jest.fn().mockResolvedValue(undefined),
  autoSetLeadStatusForAccount: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/prisma', () => ({
  prisma: {
    proposal: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
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

  it('acceptProposalPublic updates accepted details for valid token', async () => {
    (prisma.proposal.findUnique as jest.Mock).mockResolvedValue({
      id: 'proposal-1',
      status: 'viewed',
      publicTokenExpiresAt: new Date('2026-12-01T00:00:00.000Z'),
      accountId: 'account-1',
    });
    (prisma.proposal.update as jest.Mock).mockResolvedValue({ id: 'proposal-1', status: 'accepted' });
    (prisma.proposal.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      id: 'proposal-1',
      status: 'accepted',
    });

    const result = await acceptProposalPublic('public-token', 'Jane Doe', '127.0.0.1');

    expect(prisma.proposal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'proposal-1' },
        data: expect.objectContaining({
          status: 'accepted',
          acceptedAt: expect.any(Date),
          signatureName: 'Jane Doe',
          signatureDate: expect.any(Date),
          signatureIp: '127.0.0.1',
        }),
      })
    );
    expect(result).toEqual({
      proposal: { id: 'proposal-1', status: 'accepted' },
      acceptedNow: true,
    });
  });

  it('acceptProposalPublic is idempotent after the first acceptance', async () => {
    (prisma.proposal.findUnique as jest.Mock).mockResolvedValue({
      id: 'proposal-1',
      status: 'accepted',
      publicTokenExpiresAt: new Date('2026-12-01T00:00:00.000Z'),
      accountId: 'account-1',
    });
    (prisma.proposal.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      id: 'proposal-1',
      status: 'accepted',
    });

    const result = await acceptProposalPublic('public-token', 'Jane Doe', '127.0.0.1');

    expect(prisma.proposal.update).not.toHaveBeenCalled();
    expect(result).toEqual({
      proposal: { id: 'proposal-1', status: 'accepted' },
      acceptedNow: false,
    });
  });

  it('rejectProposalPublic is idempotent after the first rejection', async () => {
    (prisma.proposal.findUnique as jest.Mock).mockResolvedValue({
      id: 'proposal-1',
      status: 'rejected',
      publicTokenExpiresAt: new Date('2026-12-01T00:00:00.000Z'),
      accountId: 'account-1',
    });
    (prisma.proposal.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      id: 'proposal-1',
      status: 'rejected',
    });

    const result = await rejectProposalPublic('public-token', 'Budget constraints', '127.0.0.1');

    expect(prisma.proposal.update).not.toHaveBeenCalled();
    expect(result).toEqual({
      proposal: { id: 'proposal-1', status: 'rejected' },
      rejectedNow: false,
    });
  });
});
