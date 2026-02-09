import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { prisma } from '../../lib/prisma';
import {
  listPricingSettings,
  getDefaultPricingSettings,
  createPricingSettings,
  updatePricingSettings,
  setDefaultPricingSettings,
} from '../pricingSettingsService';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    pricingSettings: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

describe('pricingSettingsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listPricingSettings', () => {
    it('returns paginated pricing plans with archived excluded by default', async () => {
      (prisma.pricingSettings.findMany as jest.Mock).mockResolvedValue([
        { id: 'pricing-1', name: 'Standard' },
      ]);
      (prisma.pricingSettings.count as jest.Mock).mockResolvedValue(1);

      const result = await listPricingSettings({});

      expect(prisma.pricingSettings.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ archivedAt: null }),
          skip: 0,
          take: 20,
        })
      );
      expect(result.pagination.total).toBe(1);
      expect(result.data[0].id).toBe('pricing-1');
    });
  });

  describe('getDefaultPricingSettings', () => {
    it('falls back to latest active plan when no default exists', async () => {
      (prisma.pricingSettings.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'pricing-2', name: 'Fallback Active' });

      const result = await getDefaultPricingSettings();

      expect(prisma.pricingSettings.findFirst).toHaveBeenCalledTimes(2);
      expect(result?.id).toBe('pricing-2');
    });
  });

  describe('createPricingSettings', () => {
    it('applies default values for optional fields', async () => {
      (prisma.pricingSettings.create as jest.Mock).mockResolvedValue({
        id: 'pricing-3',
        name: 'New Plan',
      });

      await createPricingSettings({ name: 'New Plan' });

      expect(prisma.pricingSettings.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'New Plan',
            pricingType: 'square_foot',
            baseRatePerSqFt: 0.1,
            minimumMonthlyCharge: 250,
            laborCostPerHour: 18,
            isActive: true,
            isDefault: false,
          }),
        })
      );
    });
  });

  describe('updatePricingSettings', () => {
    it('persists labor and overhead fields when provided', async () => {
      (prisma.pricingSettings.update as jest.Mock).mockResolvedValue({
        id: 'pricing-1',
        laborCostPerHour: 22,
      });

      await updatePricingSettings('pricing-1', {
        laborCostPerHour: 22,
        laborBurdenPercentage: 0.3,
        insurancePercentage: 0.09,
        adminOverheadPercentage: 0.13,
        travelCostPerVisit: 19,
        equipmentPercentage: 0.06,
        supplyCostPercentage: 0.05,
        supplyCostPerSqFt: 0.01,
        targetProfitMargin: 0.27,
      });

      expect(prisma.pricingSettings.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pricing-1' },
          data: expect.objectContaining({
            laborCostPerHour: 22,
            laborBurdenPercentage: 0.3,
            insurancePercentage: 0.09,
            adminOverheadPercentage: 0.13,
            travelCostPerVisit: 19,
            equipmentPercentage: 0.06,
            supplyCostPercentage: 0.05,
            supplyCostPerSqFt: 0.01,
            targetProfitMargin: 0.27,
          }),
        })
      );
    });
  });

  describe('setDefaultPricingSettings', () => {
    it('throws when pricing plan does not exist', async () => {
      (prisma.pricingSettings.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(setDefaultPricingSettings('missing-id')).rejects.toThrow(
        'Pricing plan not found'
      );
    });

    it('clears previous default and sets requested plan as default', async () => {
      (prisma.pricingSettings.findUnique as jest.Mock).mockResolvedValue({
        id: 'pricing-1',
        archivedAt: null,
      });
      (prisma.pricingSettings.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.pricingSettings.update as jest.Mock).mockResolvedValue({
        id: 'pricing-1',
        isDefault: true,
        isActive: true,
      });

      const result = await setDefaultPricingSettings('pricing-1');

      expect(prisma.pricingSettings.updateMany).toHaveBeenCalledWith({
        where: { isDefault: true },
        data: { isDefault: false },
      });
      expect(prisma.pricingSettings.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pricing-1' },
          data: { isDefault: true, isActive: true },
        })
      );
      expect(result.id).toBe('pricing-1');
    });
  });
});
