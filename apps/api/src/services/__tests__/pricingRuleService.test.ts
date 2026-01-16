import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as pricingRuleService from '../pricingRuleService';
import { prisma } from '../../lib/prisma';
import { createTestPricingRule } from '../../test/helpers';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    pricingRule: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('pricingRuleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listPricingRules', () => {
    it('should return paginated pricing rules with default parameters', async () => {
      const mockPricingRules = [
        createTestPricingRule({ id: 'rule-1', name: 'Hourly Rate' }),
        createTestPricingRule({ id: 'rule-2', name: 'Square Foot Rate' }),
      ];

      (prisma.pricingRule.findMany as jest.Mock).mockResolvedValue(mockPricingRules);
      (prisma.pricingRule.count as jest.Mock).mockResolvedValue(2);

      const result = await pricingRuleService.listPricingRules({});

      expect(prisma.pricingRule.findMany).toHaveBeenCalledWith({
        where: { archivedAt: null },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
      expect(result.data).toEqual(mockPricingRules);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter by pricingType', async () => {
      const mockPricingRules = [createTestPricingRule({ pricingType: 'hourly' })];

      (prisma.pricingRule.findMany as jest.Mock).mockResolvedValue(mockPricingRules);
      (prisma.pricingRule.count as jest.Mock).mockResolvedValue(1);

      await pricingRuleService.listPricingRules({ pricingType: 'hourly' });

      expect(prisma.pricingRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            pricingType: 'hourly',
            archivedAt: null,
          }),
        })
      );
    });

    it('should filter by cleaningType', async () => {
      const mockPricingRules = [createTestPricingRule({ cleaningType: 'deep_clean' })];

      (prisma.pricingRule.findMany as jest.Mock).mockResolvedValue(mockPricingRules);
      (prisma.pricingRule.count as jest.Mock).mockResolvedValue(1);

      await pricingRuleService.listPricingRules({ cleaningType: 'deep_clean' });

      expect(prisma.pricingRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cleaningType: 'deep_clean',
          }),
        })
      );
    });

    it('should filter by areaTypeId', async () => {
      const mockPricingRules = [createTestPricingRule({ areaTypeId: 'area-type-123' })];

      (prisma.pricingRule.findMany as jest.Mock).mockResolvedValue(mockPricingRules);
      (prisma.pricingRule.count as jest.Mock).mockResolvedValue(1);

      await pricingRuleService.listPricingRules({ areaTypeId: 'area-type-123' });

      expect(prisma.pricingRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            areaTypeId: 'area-type-123',
          }),
        })
      );
    });

    it('should filter by isActive', async () => {
      const mockPricingRules = [createTestPricingRule({ isActive: true })];

      (prisma.pricingRule.findMany as jest.Mock).mockResolvedValue(mockPricingRules);
      (prisma.pricingRule.count as jest.Mock).mockResolvedValue(1);

      await pricingRuleService.listPricingRules({ isActive: true });

      expect(prisma.pricingRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });

    it('should search by name, description, cleaningType, and areaType', async () => {
      const mockPricingRules = [createTestPricingRule()];

      (prisma.pricingRule.findMany as jest.Mock).mockResolvedValue(mockPricingRules);
      (prisma.pricingRule.count as jest.Mock).mockResolvedValue(1);

      await pricingRuleService.listPricingRules({ search: 'office' });

      expect(prisma.pricingRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'office', mode: 'insensitive' } },
              { description: { contains: 'office', mode: 'insensitive' } },
              { cleaningType: { contains: 'office', mode: 'insensitive' } },
              { areaType: { name: { contains: 'office', mode: 'insensitive' } } },
            ],
          }),
        })
      );
    });

    it('should include archived pricing rules when requested', async () => {
      const mockPricingRules = [createTestPricingRule({ archivedAt: new Date() })];

      (prisma.pricingRule.findMany as jest.Mock).mockResolvedValue(mockPricingRules);
      (prisma.pricingRule.count as jest.Mock).mockResolvedValue(1);

      await pricingRuleService.listPricingRules({ includeArchived: true });

      expect(prisma.pricingRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      );
    });

    it('should paginate results correctly', async () => {
      const mockPricingRules = Array.from({ length: 10 }, (_, i) =>
        createTestPricingRule({ id: `rule-${i}` })
      );

      (prisma.pricingRule.findMany as jest.Mock).mockResolvedValue(mockPricingRules.slice(0, 10));
      (prisma.pricingRule.count as jest.Mock).mockResolvedValue(100);

      const result = await pricingRuleService.listPricingRules({ page: 2, limit: 10 });

      expect(prisma.pricingRule.findMany).toHaveBeenCalledWith(
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
      const mockPricingRules = [createTestPricingRule()];

      (prisma.pricingRule.findMany as jest.Mock).mockResolvedValue(mockPricingRules);
      (prisma.pricingRule.count as jest.Mock).mockResolvedValue(1);

      await pricingRuleService.listPricingRules({ sortBy: 'baseRate', sortOrder: 'asc' });

      expect(prisma.pricingRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { baseRate: 'asc' },
        })
      );
    });

    it('should default to createdAt for invalid sort field', async () => {
      const mockPricingRules = [createTestPricingRule()];

      (prisma.pricingRule.findMany as jest.Mock).mockResolvedValue(mockPricingRules);
      (prisma.pricingRule.count as jest.Mock).mockResolvedValue(1);

      await pricingRuleService.listPricingRules({ sortBy: 'invalidField' });

      expect(prisma.pricingRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });
  });

  describe('getPricingRuleById', () => {
    it('should return pricing rule by id', async () => {
      const mockPricingRule = createTestPricingRule({ id: 'rule-123' });

      (prisma.pricingRule.findUnique as jest.Mock).mockResolvedValue(mockPricingRule);

      const result = await pricingRuleService.getPricingRuleById('rule-123');

      expect(prisma.pricingRule.findUnique).toHaveBeenCalledWith({
        where: { id: 'rule-123' },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockPricingRule);
    });

    it('should return null for non-existent pricing rule', async () => {
      (prisma.pricingRule.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await pricingRuleService.getPricingRuleById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('createPricingRule', () => {
    it('should create a new pricing rule with all fields', async () => {
      const input: pricingRuleService.PricingRuleCreateInput = {
        name: 'Office Cleaning Rate',
        description: 'Standard rate for office cleaning',
        pricingType: 'square_foot',
        baseRate: 0.15,
        minimumCharge: 50,
        squareFootRate: 0.15,
        difficultyMultiplier: 1.2,
        conditionMultipliers: {
          excellent: 0.8,
          good: 1.0,
          fair: 1.3,
          poor: 1.6,
        },
        cleaningType: 'standard',
        areaTypeId: 'area-type-123',
        isActive: true,
        createdByUserId: 'user-123',
      };

      const mockPricingRule = createTestPricingRule(input);

      (prisma.pricingRule.create as jest.Mock).mockResolvedValue(mockPricingRule);

      const result = await pricingRuleService.createPricingRule(input);

      expect(prisma.pricingRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: input.name,
          pricingType: input.pricingType,
          baseRate: input.baseRate,
          createdByUserId: input.createdByUserId,
        }),
        select: expect.any(Object),
      });
      expect(result).toEqual(mockPricingRule);
    });

    it('should create pricing rule with minimal required fields', async () => {
      const input: pricingRuleService.PricingRuleCreateInput = {
        name: 'Simple Rate',
        pricingType: 'fixed',
        baseRate: 100,
        createdByUserId: 'user-123',
      };

      const mockPricingRule = createTestPricingRule(input);

      (prisma.pricingRule.create as jest.Mock).mockResolvedValue(mockPricingRule);

      const result = await pricingRuleService.createPricingRule(input);

      expect(prisma.pricingRule.create).toHaveBeenCalled();
      expect(result).toEqual(mockPricingRule);
    });

    it('should default difficultyMultiplier to 1.0 if not provided', async () => {
      const input: pricingRuleService.PricingRuleCreateInput = {
        name: 'Default Multiplier Rate',
        pricingType: 'hourly',
        baseRate: 25,
        createdByUserId: 'user-123',
      };

      const mockPricingRule = createTestPricingRule({ ...input, difficultyMultiplier: 1.0 });

      (prisma.pricingRule.create as jest.Mock).mockResolvedValue(mockPricingRule);

      await pricingRuleService.createPricingRule(input);

      expect(prisma.pricingRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            difficultyMultiplier: 1.0,
          }),
        })
      );
    });
  });

  describe('updatePricingRule', () => {
    it('should update pricing rule with provided fields', async () => {
      const input: pricingRuleService.PricingRuleUpdateInput = {
        name: 'Updated Rate',
        baseRate: 150,
        isActive: false,
      };

      const mockPricingRule = createTestPricingRule({ ...input, id: 'rule-123' });

      (prisma.pricingRule.update as jest.Mock).mockResolvedValue(mockPricingRule);

      const result = await pricingRuleService.updatePricingRule('rule-123', input);

      expect(prisma.pricingRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-123' },
        data: expect.objectContaining({
          name: 'Updated Rate',
          baseRate: 150,
          isActive: false,
        }),
        select: expect.any(Object),
      });
      expect(result).toEqual(mockPricingRule);
    });

    it('should disconnect areaType when set to null', async () => {
      const input: pricingRuleService.PricingRuleUpdateInput = {
        areaTypeId: null,
      };

      const mockPricingRule = createTestPricingRule({ id: 'rule-123', areaTypeId: null });

      (prisma.pricingRule.update as jest.Mock).mockResolvedValue(mockPricingRule);

      await pricingRuleService.updatePricingRule('rule-123', input);

      expect(prisma.pricingRule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            areaType: { disconnect: true },
          }),
        })
      );
    });

    it('should connect areaType when provided', async () => {
      const input: pricingRuleService.PricingRuleUpdateInput = {
        areaTypeId: 'area-type-456',
      };

      const mockPricingRule = createTestPricingRule({ id: 'rule-123', areaTypeId: 'area-type-456' });

      (prisma.pricingRule.update as jest.Mock).mockResolvedValue(mockPricingRule);

      await pricingRuleService.updatePricingRule('rule-123', input);

      expect(prisma.pricingRule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            areaType: { connect: { id: 'area-type-456' } },
          }),
        })
      );
    });
  });

  describe('archivePricingRule', () => {
    it('should set archivedAt timestamp', async () => {
      const mockPricingRule = createTestPricingRule({ id: 'rule-123', archivedAt: new Date() });

      (prisma.pricingRule.update as jest.Mock).mockResolvedValue(mockPricingRule);

      const result = await pricingRuleService.archivePricingRule('rule-123');

      expect(prisma.pricingRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-123' },
        data: { archivedAt: expect.any(Date) },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockPricingRule);
    });
  });

  describe('restorePricingRule', () => {
    it('should set archivedAt to null', async () => {
      const mockPricingRule = createTestPricingRule({ id: 'rule-123', archivedAt: null });

      (prisma.pricingRule.update as jest.Mock).mockResolvedValue(mockPricingRule);

      const result = await pricingRuleService.restorePricingRule('rule-123');

      expect(prisma.pricingRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-123' },
        data: { archivedAt: null },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockPricingRule);
    });
  });

  describe('deletePricingRule', () => {
    it('should delete pricing rule by id', async () => {
      (prisma.pricingRule.delete as jest.Mock).mockResolvedValue({ id: 'rule-123' });

      const result = await pricingRuleService.deletePricingRule('rule-123');

      expect(prisma.pricingRule.delete).toHaveBeenCalledWith({
        where: { id: 'rule-123' },
        select: { id: true },
      });
      expect(result).toEqual({ id: 'rule-123' });
    });
  });
});
