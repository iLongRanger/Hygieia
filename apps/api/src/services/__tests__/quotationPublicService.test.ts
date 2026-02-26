import crypto from 'crypto';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prisma } from '../../lib/prisma';
import {
  acceptQuotationPublic,
  generatePublicToken,
  getQuotationByPublicToken,
  markPublicViewed,
  rejectQuotationPublic,
} from '../quotationPublicService';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    quotation: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    job: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    jobTask: {
      createMany: jest.fn(),
    },
    jobActivity: {
      create: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (tx: any) => Promise<any>) => callback(prisma)),
  },
}));

describe('quotationPublicService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('generatePublicToken stores token and expiry timestamp', async () => {
    jest.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.alloc(32, 7));
    (prisma.quotation.update as jest.Mock).mockResolvedValue({ id: 'qt-1' });

    const token = await generatePublicToken('qt-1');

    expect(token).toHaveLength(64);
    expect(prisma.quotation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'qt-1' },
        data: expect.objectContaining({
          publicToken: token,
          publicTokenExpiresAt: expect.any(Date),
        }),
      })
    );
  });

  it('getQuotationByPublicToken returns null for expired token', async () => {
    (prisma.quotation.findUnique as jest.Mock).mockResolvedValue({
      id: 'qt-1',
      publicTokenExpiresAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await getQuotationByPublicToken('expired-token');

    expect(result).toBeNull();
  });

  it('markPublicViewed updates status when quotation is first viewed', async () => {
    (prisma.quotation.findUnique as jest.Mock).mockResolvedValue({
      id: 'qt-1',
      status: 'sent',
      viewedAt: null,
    });
    (prisma.quotation.update as jest.Mock).mockResolvedValue({ id: 'qt-1' });

    await markPublicViewed('public-token');

    expect(prisma.quotation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'qt-1' },
        data: expect.objectContaining({
          status: 'viewed',
          viewedAt: expect.any(Date),
        }),
      })
    );
  });

  it('acceptQuotationPublic rejects non-actionable statuses', async () => {
    (prisma.quotation.findUnique as jest.Mock).mockResolvedValue({
      id: 'qt-1',
      status: 'rejected',
      publicTokenExpiresAt: new Date('2026-12-01T00:00:00.000Z'),
      facilityId: 'facility-1',
      scheduledDate: new Date('2026-03-01T00:00:00.000Z'),
      scheduledStartTime: new Date('2026-03-01T09:00:00.000Z'),
      scheduledEndTime: new Date('2026-03-01T10:00:00.000Z'),
      pricingApprovalStatus: 'not_required',
    });

    await expect(
      acceptQuotationPublic('public-token', 'Jane Doe', '127.0.0.1')
    ).rejects.toThrow('This quotation can no longer be accepted');
  });

  it('acceptQuotationPublic updates accepted details for valid token', async () => {
    (prisma.quotation.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        id: 'qt-1',
        status: 'viewed',
        publicTokenExpiresAt: new Date('2026-12-01T00:00:00.000Z'),
        facilityId: 'facility-1',
        scheduledDate: new Date('2026-03-01T00:00:00.000Z'),
        scheduledStartTime: new Date('2026-03-01T09:00:00.000Z'),
        scheduledEndTime: new Date('2026-03-01T10:00:00.000Z'),
        pricingApprovalStatus: 'not_required',
        generatedJob: null,
      })
      .mockResolvedValueOnce({
        id: 'qt-1',
        status: 'accepted',
        quotationNumber: 'QT-2026-0001',
        title: 'Special Job',
        description: null,
        accountId: 'account-1',
        facilityId: 'facility-1',
        scheduledDate: new Date('2026-03-01T00:00:00.000Z'),
        scheduledStartTime: new Date('2026-03-01T09:00:00.000Z'),
        scheduledEndTime: new Date('2026-03-01T10:00:00.000Z'),
        createdByUserId: 'user-1',
        generatedJob: null,
        services: [],
      });
    (prisma.quotation.update as jest.Mock).mockResolvedValue({ id: 'qt-1', status: 'accepted' });
    (prisma.job.findFirst as jest.Mock).mockResolvedValue({ jobNumber: 'WO-2026-0001' });
    (prisma.job.create as jest.Mock).mockResolvedValue({ id: 'job-2', jobNumber: 'WO-2026-0002' });
    (prisma.jobActivity.create as jest.Mock).mockResolvedValue({ id: 'a-1' });
    (prisma.quotation.findUniqueOrThrow as jest.Mock).mockResolvedValue({ id: 'qt-1', status: 'accepted' });

    await acceptQuotationPublic('public-token', 'Jane Doe', '127.0.0.1');

    expect(prisma.quotation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'qt-1' },
        data: expect.objectContaining({
          status: 'accepted',
          acceptedAt: expect.any(Date),
          signatureName: 'Jane Doe',
          signatureDate: expect.any(Date),
          signatureIp: '127.0.0.1',
        }),
      })
    );
  });

  it('rejectQuotationPublic rejects expired links', async () => {
    (prisma.quotation.findUnique as jest.Mock).mockResolvedValue({
      id: 'qt-1',
      status: 'sent',
      publicTokenExpiresAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await expect(
      rejectQuotationPublic('public-token', 'Too expensive', '127.0.0.1')
    ).rejects.toThrow('This quotation link has expired');
  });
});
