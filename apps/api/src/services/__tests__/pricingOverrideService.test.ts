import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as pricingOverrideService from '../pricingOverrideService';
import { prisma } from '../../lib/prisma';
import { createTestPricingOverride } from '../../test/helpers';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    pricingOverride: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('pricingOverrideService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listPricingOverrides', () => {
    it('should return paginated pricing overrides with default parameters', async () => {
      const mockPricingOverrides = [
        createTestPricingOverride({ id: 'override-1' }),
        createTestPricingOverride({ id: 'override-2' }),
      ];

      (prisma.pricingOverride.findMany as jest.Mock).mockResolvedValue(mockPricingOverrides);
      (prisma.pricingOverride.count as jest.Mock).mockResolvedValue(2);

      const result = await pricingOverrideService.listPricingOverrides({});

      expect(prisma.pricingOverride.findMany).toHaveBeenCalledWith({
        where: {},
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
      expect(result.data).toEqual(mockPricingOverrides);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter by facilityId', async () => {
      const mockPricingOverrides = [createTestPricingOverride({ facilityId: 'facility-123' })];

      (prisma.pricingOverride.findMany as jest.Mock).mockResolvedValue(mockPricingOverrides);
      (prisma.pricingOverride.count as jest.Mock).mockResolvedValue(1);

      await pricingOverrideService.listPricingOverrides({ facilityId: 'facility-123' });

      expect(prisma.pricingOverride.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            facilityId: 'facility-123',
          }),
        })
      );
    });

    it('should filter by pricingRuleId', async () => {
      const mockPricingOverrides = [createTestPricingOverride({ pricingRuleId: 'rule-123' })];

      (prisma.pricingOverride.findMany as jest.Mock).mockResolvedValue(mockPricingOverrides);
      (prisma.pricingOverride.count as jest.Mock).mockResolvedValue(1);

      await pricingOverrideService.listPricingOverrides({ pricingRuleId: 'rule-123' });

      expect(prisma.pricingOverride.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            pricingRuleId: 'rule-123',
          }),
        })
      );
    });

    it('should filter by approvedByUserId', async () => {
      const mockPricingOverrides = [createTestPricingOverride({ approvedByUserId: 'user-123' })];

      (prisma.pricingOverride.findMany as jest.Mock).mockResolvedValue(mockPricingOverrides);
      (prisma.pricingOverride.count as jest.Mock).mockResolvedValue(1);

      await pricingOverrideService.listPricingOverrides({ approvedByUserId: 'user-123' });

      expect(prisma.pricingOverride.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            approvedByUserId: 'user-123',
          }),
        })
      );
    });

    it('should filter for active overrides when isActive is true', async () => {
      const mockPricingOverrides = [createTestPricingOverride()];

      (prisma.pricingOverride.findMany as jest.Mock).mockResolvedValue(mockPricingOverrides);
      (prisma.pricingOverride.count as jest.Mock).mockResolvedValue(1);

      await pricingOverrideService.listPricingOverrides({ isActive: true });

      expect(prisma.pricingOverride.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            effectiveDate: { lte: expect.any(Date) },
            OR: [
              { expiryDate: null },
              { expiryDate: { gt: expect.any(Date) } },
            ],
          }),
        })
      );
    });

    it('should filter for inactive overrides when isActive is false', async () => {
      const mockPricingOverrides = [createTestPricingOverride({ expiryDate: new Date('2020-01-01') })];

      (prisma.pricingOverride.findMany as jest.Mock).mockResolvedValue(mockPricingOverrides);
      (prisma.pricingOverride.count as jest.Mock).mockResolvedValue(1);

      await pricingOverrideService.listPricingOverrides({ isActive: false });

      expect(prisma.pricingOverride.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { effectiveDate: { gt: expect.any(Date) } },
              { expiryDate: { lte: expect.any(Date) } },
            ],
          }),
        })
      );
    });

    it('should search by reason, facility name, account name, and pricing rule name', async () => {
      const mockPricingOverrides = [createTestPricingOverride()];

      (prisma.pricingOverride.findMany as jest.Mock).mockResolvedValue(mockPricingOverrides);
      (prisma.pricingOverride.count as jest.Mock).mockResolvedValue(1);

      await pricingOverrideService.listPricingOverrides({ search: 'special' });

      expect(prisma.pricingOverride.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: [
                  { overrideReason: { contains: 'special', mode: 'insensitive' } },
                  { facility: { name: { contains: 'special', mode: 'insensitive' } } },
                  { facility: { account: { name: { contains: 'special', mode: 'insensitive' } } } },
                  { pricingRule: { name: { contains: 'special', mode: 'insensitive' } } },
                ],
              }),
            ]),
          }),
        })
      );
    });

    it('should paginate results correctly', async () => {
      const mockPricingOverrides = Array.from({ length: 10 }, (_, i) =>
        createTestPricingOverride({ id: `override-${i}` })
      );

      (prisma.pricingOverride.findMany as jest.Mock).mockResolvedValue(mockPricingOverrides.slice(0, 10));
      (prisma.pricingOverride.count as jest.Mock).mockResolvedValue(100);

      const result = await pricingOverrideService.listPricingOverrides({ page: 2, limit: 10 });

      expect(prisma.pricingOverride.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 100,
        totalPages: 10,
      });
    });

    it('should sort by valid fields', async () => {
      const mockPricingOverrides = [createTestPricingOverride()];

      (prisma.pricingOverride.findMany as jest.Mock).mockResolvedValue(mockPricingOverrides);
      (prisma.pricingOverride.count as jest.Mock).mockResolvedValue(1);

      await pricingOverrideService.listPricingOverrides({ sortBy: 'overrideRate', sortOrder: 'asc' });

      expect(prisma.pricingOverride.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { overrideRate: 'asc' },
        })
      );
    });

    it('should default to createdAt for invalid sort field', async () => {
      const mockPricingOverrides = [createTestPricingOverride()];

      (prisma.pricingOverride.findMany as jest.Mock).mockResolvedValue(mockPricingOverrides);
      (prisma.pricingOverride.count as jest.Mock).mockResolvedValue(1);

      await pricingOverrideService.listPricingOverrides({ sortBy: 'invalidField' });

      expect(prisma.pricingOverride.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });
  });

  describe('getPricingOverrideById', () => {
    it('should return pricing override by id', async () => {
      const mockPricingOverride = createTestPricingOverride({ id: 'override-123' });

      (prisma.pricingOverride.findUnique as jest.Mock).mockResolvedValue(mockPricingOverride);

      const result = await pricingOverrideService.getPricingOverrideById('override-123');

      expect(prisma.pricingOverride.findUnique).toHaveBeenCalledWith({
        where: { id: 'override-123' },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockPricingOverride);
    });

    it('should return null for non-existent pricing override', async () => {
      (prisma.pricingOverride.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await pricingOverrideService.getPricingOverrideById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('createPricingOverride', () => {
    it('should create a new pricing override with all fields', async () => {
      const input: pricingOverrideService.PricingOverrideCreateInput = {
        facilityId: 'facility-123',
        pricingRuleId: 'rule-123',
        overrideRate: 35.00,
        overrideReason: 'VIP customer discount',
        effectiveDate: new Date('2024-01-01'),
        expiryDate: new Date('2024-12-31'),
        createdByUserId: 'user-123',
      };

      const mockPricingOverride = createTestPricingOverride(input);

      (prisma.pricingOverride.create as jest.Mock).mockResolvedValue(mockPricingOverride);

      const result = await pricingOverrideService.createPricingOverride(input);

      expect(prisma.pricingOverride.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          facilityId: input.facilityId,
          pricingRuleId: input.pricingRuleId,
          overrideRate: input.overrideRate,
          overrideReason: input.overrideReason,
          createdByUserId: input.createdByUserId,
        }),
        select: expect.any(Object),
      });
      expect(result).toEqual(mockPricingOverride);
    });

    it('should create pricing override with minimal required fields', async () => {
      const input: pricingOverrideService.PricingOverrideCreateInput = {
        facilityId: 'facility-123',
        pricingRuleId: 'rule-123',
        overrideRate: 40.00,
        overrideReason: 'Special rate',
        createdByUserId: 'user-123',
      };

      const mockPricingOverride = createTestPricingOverride(input);

      (prisma.pricingOverride.create as jest.Mock).mockResolvedValue(mockPricingOverride);

      const result = await pricingOverrideService.createPricingOverride(input);

      expect(prisma.pricingOverride.create).toHaveBeenCalled();
      expect(result).toEqual(mockPricingOverride);
    });

    it('should default effectiveDate to current date if not provided', async () => {
      const input: pricingOverrideService.PricingOverrideCreateInput = {
        facilityId: 'facility-123',
        pricingRuleId: 'rule-123',
        overrideRate: 40.00,
        overrideReason: 'Special rate',
        createdByUserId: 'user-123',
      };

      const mockPricingOverride = createTestPricingOverride(input);

      (prisma.pricingOverride.create as jest.Mock).mockResolvedValue(mockPricingOverride);

      await pricingOverrideService.createPricingOverride(input);

      expect(prisma.pricingOverride.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            effectiveDate: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('updatePricingOverride', () => {
    it('should update pricing override with provided fields', async () => {
      const input: pricingOverrideService.PricingOverrideUpdateInput = {
        overrideRate: 45.00,
        overrideReason: 'Updated reason',
      };

      const mockPricingOverride = createTestPricingOverride({ ...input, id: 'override-123' });

      (prisma.pricingOverride.update as jest.Mock).mockResolvedValue(mockPricingOverride);

      const result = await pricingOverrideService.updatePricingOverride('override-123', input);

      expect(prisma.pricingOverride.update).toHaveBeenCalledWith({
        where: { id: 'override-123' },
        data: expect.objectContaining({
          overrideRate: 45.00,
          overrideReason: 'Updated reason',
        }),
        select: expect.any(Object),
      });
      expect(result).toEqual(mockPricingOverride);
    });

    it('should disconnect approvedByUser when set to null', async () => {
      const input: pricingOverrideService.PricingOverrideUpdateInput = {
        approvedByUserId: null,
      };

      const mockPricingOverride = createTestPricingOverride({ id: 'override-123', approvedByUserId: null });

      (prisma.pricingOverride.update as jest.Mock).mockResolvedValue(mockPricingOverride);

      await pricingOverrideService.updatePricingOverride('override-123', input);

      expect(prisma.pricingOverride.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            approvedByUser: { disconnect: true },
          }),
        })
      );
    });

    it('should connect approvedByUser when provided', async () => {
      const input: pricingOverrideService.PricingOverrideUpdateInput = {
        approvedByUserId: 'approver-456',
      };

      const mockPricingOverride = createTestPricingOverride({ id: 'override-123', approvedByUserId: 'approver-456' });

      (prisma.pricingOverride.update as jest.Mock).mockResolvedValue(mockPricingOverride);

      await pricingOverrideService.updatePricingOverride('override-123', input);

      expect(prisma.pricingOverride.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            approvedByUser: { connect: { id: 'approver-456' } },
          }),
        })
      );
    });
  });

  describe('approvePricingOverride', () => {
    it('should set approvedByUserId', async () => {
      const mockPricingOverride = createTestPricingOverride({ id: 'override-123', approvedByUserId: 'approver-123' });

      (prisma.pricingOverride.update as jest.Mock).mockResolvedValue(mockPricingOverride);

      const result = await pricingOverrideService.approvePricingOverride('override-123', 'approver-123');

      expect(prisma.pricingOverride.update).toHaveBeenCalledWith({
        where: { id: 'override-123' },
        data: { approvedByUserId: 'approver-123' },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockPricingOverride);
    });
  });

  describe('deletePricingOverride', () => {
    it('should delete pricing override by id', async () => {
      (prisma.pricingOverride.delete as jest.Mock).mockResolvedValue({ id: 'override-123' });

      const result = await pricingOverrideService.deletePricingOverride('override-123');

      expect(prisma.pricingOverride.delete).toHaveBeenCalledWith({
        where: { id: 'override-123' },
        select: { id: true },
      });
      expect(result).toEqual({ id: 'override-123' });
    });
  });
});
