import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prisma } from '../../lib/prisma';
import { markPublicViewed, signContractPublic } from '../contractPublicService';

jest.mock('../leadService', () => ({
  autoAdvanceLeadStatusForAccount: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/prisma', () => ({
  prisma: {
    contract: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('contractPublicService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('markPublicViewed returns newlyViewed=false when already viewed', async () => {
    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      status: 'viewed',
      viewedAt: new Date('2026-03-01T09:00:00.000Z'),
    });

    const result = await markPublicViewed('public-token');

    expect(prisma.contract.update).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 'contract-1', newlyViewed: false });
  });

  it('signContractPublic signs a viewable contract once', async () => {
    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      status: 'viewed',
      publicTokenExpiresAt: new Date('2026-12-01T00:00:00.000Z'),
      accountId: 'account-1',
      signedByName: null,
      signedByEmail: null,
      signedDate: null,
    });
    (prisma.contract.update as jest.Mock).mockResolvedValue({ id: 'contract-1' });
    (prisma.contract.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      status: 'pending_signature',
    });

    const result = await signContractPublic('public-token', 'Jane Client', 'jane@acme.test', '127.0.0.1');

    expect(prisma.contract.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'contract-1' },
        data: expect.objectContaining({
          status: 'pending_signature',
          signedByName: 'Jane Client',
          signedByEmail: 'jane@acme.test',
          signedDate: expect.any(Date),
          signatureIp: '127.0.0.1',
        }),
      })
    );
    expect(result).toEqual({
      contract: { id: 'contract-1', status: 'pending_signature' },
      signedNow: true,
    });
  });

  it('signContractPublic is idempotent for pending_signature contracts', async () => {
    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      status: 'pending_signature',
      publicTokenExpiresAt: new Date('2026-12-01T00:00:00.000Z'),
      accountId: 'account-1',
      signedByName: 'Jane Client',
      signedByEmail: 'jane@acme.test',
      signedDate: new Date('2026-03-01T09:00:00.000Z'),
    });
    (prisma.contract.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      status: 'pending_signature',
    });

    const result = await signContractPublic('public-token', 'Jane Client', 'jane@acme.test', '127.0.0.1');

    expect(prisma.contract.update).not.toHaveBeenCalled();
    expect(result).toEqual({
      contract: { id: 'contract-1', status: 'pending_signature' },
      signedNow: false,
    });
  });
});
