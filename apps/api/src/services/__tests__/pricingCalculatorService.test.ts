import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { prisma } from '../../lib/prisma';
import * as pricingSettingsService from '../pricingSettingsService';
import {
  calculateFacilityPricing,
  isFacilityReadyForPricing,
  getFacilityTasksGrouped,
  generateProposalServicesFromFacility,
} from '../pricingCalculatorService';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    facility: {
      findUnique: jest.fn(),
    },
    facilityTask: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../pricingSettingsService', () => ({
  getDefaultPricingSettings: jest.fn(),
  getPricingSettingsById: jest.fn(),
}));

const mockPricingSettings = {
  id: 'pricing-1',
  name: 'Standard Plan',
  laborCostPerHour: 35,
  laborBurdenPercentage: 0.2,
  sqftPerLaborHour: { office: 2500, other: 2500 },
  insurancePercentage: 0.02,
  adminOverheadPercentage: 0.03,
  travelCostPerVisit: 5,
  equipmentPercentage: 0.01,
  supplyCostPercentage: 0.05,
  supplyCostPerSqFt: null,
  targetProfitMargin: 0.25,
  subcontractorPercentage: 0.6,
  minimumMonthlyCharge: 100,
  floorTypeMultipliers: { vct: 1.0 },
  frequencyMultipliers: { weekly: 1.0, monthly: 0.25, '1x_week': 1.0 },
  conditionMultipliers: { standard: 1.0 },
  taskComplexityAddOns: { standard: 0 },
};

describe('pricingCalculatorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (pricingSettingsService.getDefaultPricingSettings as jest.Mock).mockResolvedValue(
      mockPricingSettings
    );
    (pricingSettingsService.getPricingSettingsById as jest.Mock).mockResolvedValue(
      mockPricingSettings
    );
  });

  describe('calculateFacilityPricing', () => {
    it('throws when facility does not exist', async () => {
      (prisma.facility.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        calculateFacilityPricing({
          facilityId: 'facility-1',
          serviceFrequency: 'weekly',
        })
      ).rejects.toThrow('Facility not found');
    });

    it('calculates monthly total for valid facility areas', async () => {
      (prisma.facility.findUnique as jest.Mock).mockResolvedValue({
        id: 'facility-1',
        name: 'Main Office',
        buildingType: 'office',
        areas: [
          {
            id: 'area-1',
            name: 'Office A',
            quantity: 1,
            squareFeet: 1000,
            floorType: 'vct',
            conditionLevel: 'standard',
            areaType: { name: 'Office' },
          },
        ],
      });

      const result = await calculateFacilityPricing({
        facilityId: 'facility-1',
        serviceFrequency: 'weekly',
      });

      expect(result.facilityId).toBe('facility-1');
      expect(result.areas).toHaveLength(1);
      expect(result.monthlyTotal).toBeGreaterThan(0);
      expect(result.pricingPlanId).toBe('pricing-1');
    });

    it('uses subcontractorPercentageOverride when provided', async () => {
      (prisma.facility.findUnique as jest.Mock).mockResolvedValue({
        id: 'facility-1',
        name: 'Main Office',
        buildingType: 'office',
        areas: [
          {
            id: 'area-1',
            name: 'Office A',
            quantity: 1,
            squareFeet: 1000,
            floorType: 'vct',
            conditionLevel: 'standard',
            areaType: { name: 'Office' },
          },
        ],
      });

      const resultDefault = await calculateFacilityPricing({
        facilityId: 'facility-1',
        serviceFrequency: 'weekly',
      });

      const resultOverride = await calculateFacilityPricing({
        facilityId: 'facility-1',
        serviceFrequency: 'weekly',
        subcontractorPercentageOverride: 0.40,
      });

      // Default plan has 0.60, override uses 0.40
      expect(resultDefault.subcontractorPercentage).toBe(0.60);
      expect(resultOverride.subcontractorPercentage).toBe(0.40);

      // Same monthly total, different split
      expect(resultDefault.monthlyTotal).toBe(resultOverride.monthlyTotal);
      expect(resultOverride.subcontractorPayout).toBeLessThan(resultDefault.subcontractorPayout);
      expect(resultOverride.companyRevenue).toBeGreaterThan(resultDefault.companyRevenue);
    });
  });

  describe('isFacilityReadyForPricing', () => {
    it('returns not ready when facility has no areas', async () => {
      (prisma.facility.findUnique as jest.Mock).mockResolvedValue({
        id: 'facility-1',
        areas: [],
      });

      const result = await isFacilityReadyForPricing('facility-1');
      expect(result.isReady).toBe(false);
      expect(result.areaCount).toBe(0);
    });
  });

  describe('getFacilityTasksGrouped', () => {
    it('groups tasks by area and frequency', async () => {
      (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue([
        {
          cleaningFrequency: 'daily',
          customName: null,
          taskTemplate: { name: 'Vacuum Floor' },
          area: { id: 'area-1', name: 'Office A', areaType: { name: 'Office' } },
        },
      ]);

      const result = await getFacilityTasksGrouped('facility-1');
      expect(result.byArea.get('area-1')?.tasks[0].name).toBe('Vacuum Floor');
      expect(result.byFrequency.get('daily')?.[0].name).toBe('Vacuum Floor');
    });
  });

  describe('generateProposalServicesFromFacility', () => {
    it('creates fallback default service when no facility tasks are configured', async () => {
      (prisma.facility.findUnique as jest.Mock).mockResolvedValue({
        id: 'facility-1',
        name: 'Main Office',
        buildingType: 'office',
        areas: [
          {
            id: 'area-1',
            name: 'Office A',
            quantity: 1,
            squareFeet: 1000,
            floorType: 'vct',
            conditionLevel: 'standard',
            areaType: { name: 'Office' },
          },
        ],
      });
      (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue([]);

      const services = await generateProposalServicesFromFacility('facility-1', 'weekly');
      expect(services).toHaveLength(1);
      expect(services[0].serviceName).toContain('Weekly');
      expect(services[0].includedTasks.length).toBeGreaterThan(0);
    });
  });
});

