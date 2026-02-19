import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prisma } from '../../lib/prisma';
import {
  acceptQuotation,
  createQuotation,
  getQuotationById,
  listQuotations,
  markQuotationAsViewed,
  updateQuotation,
} from '../quotationService';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    quotation: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    quotationService: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    quotationActivity: {
      create: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (tx: any) => Promise<any>) => callback(prisma)),
  },
}));

describe('quotationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma)
    );
  });

  it('listQuotations applies default archive filter and search', async () => {
    (prisma.quotation.findMany as jest.Mock).mockResolvedValue([{ id: 'qt-1' }]);
    (prisma.quotation.count as jest.Mock).mockResolvedValue(1);

    await listQuotations({ search: 'acme' });

    expect(prisma.quotation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          archivedAt: null,
          OR: expect.any(Array),
        }),
      })
    );
  });

  it('getQuotationById throws when not found', async () => {
    (prisma.quotation.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(getQuotationById('missing')).rejects.toThrow('Quotation not found');
  });

  it('createQuotation generates number and calculates totals', async () => {
    const year = new Date().getFullYear();
    (prisma.quotation.findFirst as jest.Mock).mockResolvedValue({
      quotationNumber: `QT-${year}-0004`,
    });
    (prisma.quotation.create as jest.Mock).mockResolvedValue({ id: 'qt-5' });

    await createQuotation({
      accountId: 'account-1',
      title: 'Monthly Cleaning',
      taxRate: 0.1,
      createdByUserId: 'user-1',
      services: [
        { serviceName: 'General Cleaning', price: 100 },
        { serviceName: 'Restroom', price: 50 },
      ],
    });

    expect(prisma.quotation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'draft',
          subtotal: 150,
          taxRate: 0.1,
          taxAmount: 15,
          totalAmount: 165,
          services: {
            create: [
              expect.objectContaining({ sortOrder: 0, includedTasks: [] }),
              expect.objectContaining({ sortOrder: 1, includedTasks: [] }),
            ],
          },
        }),
      })
    );
  });

  it('updateQuotation rebuilds services and recalculates totals', async () => {
    (prisma.quotation.findUnique as jest.Mock).mockResolvedValue({
      id: 'qt-1',
      subtotal: 200,
      taxRate: 0.08,
    });
    (prisma.quotation.update as jest.Mock).mockResolvedValue({ id: 'qt-1' });

    await updateQuotation('qt-1', {
      taxRate: 0.05,
      services: [
        { serviceName: 'A', price: 80 },
        { serviceName: 'B', price: 20 },
      ],
    });

    expect(prisma.quotationService.deleteMany).toHaveBeenCalledWith({
      where: { quotationId: 'qt-1' },
    });
    expect(prisma.quotationService.createMany).toHaveBeenCalledWith({
      data: [
        {
          quotationId: 'qt-1',
          serviceName: 'A',
          description: undefined,
          price: 80,
          includedTasks: [],
          sortOrder: 0,
        },
        {
          quotationId: 'qt-1',
          serviceName: 'B',
          description: undefined,
          price: 20,
          includedTasks: [],
          sortOrder: 1,
        },
      ],
    });
    expect(prisma.quotation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subtotal: 100,
          taxRate: 0.05,
          taxAmount: 5,
          totalAmount: 105,
        }),
      })
    );
  });

  it('markQuotationAsViewed updates first-time views', async () => {
    (prisma.quotation.findUnique as jest.Mock).mockResolvedValue({
      id: 'qt-1',
      status: 'sent',
      viewedAt: null,
    });
    (prisma.quotation.update as jest.Mock).mockResolvedValue({ id: 'qt-1', status: 'viewed' });

    await markQuotationAsViewed('qt-1');

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

  it('markQuotationAsViewed returns existing quotation when already viewed', async () => {
    (prisma.quotation.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        id: 'qt-1',
        status: 'viewed',
        viewedAt: new Date('2026-02-01T10:00:00.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'qt-1',
        quotationNumber: 'QT-2026-0001',
      });

    const result = await markQuotationAsViewed('qt-1');

    expect(prisma.quotation.update).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ id: 'qt-1' }));
  });

  it('acceptQuotation stores signature details when provided', async () => {
    (prisma.quotation.findUnique as jest.Mock).mockResolvedValue({
      id: 'qt-1',
      status: 'viewed',
    });
    (prisma.quotation.update as jest.Mock).mockResolvedValue({ id: 'qt-1', status: 'accepted' });

    await acceptQuotation('qt-1', 'Jane Doe');

    expect(prisma.quotation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'accepted',
          acceptedAt: expect.any(Date),
          signatureName: 'Jane Doe',
          signatureDate: expect.any(Date),
        }),
      })
    );
  });
});
