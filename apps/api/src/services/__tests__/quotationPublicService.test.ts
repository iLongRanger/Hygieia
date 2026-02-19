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
      update: jest.fn(),
    },
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
      status: 'accepted',
      publicTokenExpiresAt: new Date('2026-12-01T00:00:00.000Z'),
    });

    await expect(
      acceptQuotationPublic('public-token', 'Jane Doe', '127.0.0.1')
    ).rejects.toThrow('This quotation can no longer be accepted');
  });

  it('acceptQuotationPublic updates accepted details for valid token', async () => {
    (prisma.quotation.findUnique as jest.Mock).mockResolvedValue({
      id: 'qt-1',
      status: 'viewed',
      publicTokenExpiresAt: new Date('2026-12-01T00:00:00.000Z'),
    });
    (prisma.quotation.update as jest.Mock).mockResolvedValue({ id: 'qt-1', status: 'accepted' });

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
