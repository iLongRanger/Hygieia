import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PerHourV1Strategy } from '../perHourV1Strategy';
import * as perHourCalculatorService from '../../perHourCalculatorService';
import * as pricingSettingsService from '../../../pricingSettingsService';
import * as pricingCalculatorService from '../../../pricingCalculatorService';
import { prisma } from '../../../../lib/prisma';
import { PRICING_STRATEGY_KEYS } from '../../types';

jest.mock('../../perHourCalculatorService', () => ({
  calculatePerHourPricing: jest.fn(),
}));

jest.mock('../../../pricingSettingsService', () => ({
  getDefaultPricingSettings: jest.fn(),
  getPricingSettingsById: jest.fn(),
}));

jest.mock('../../../pricingCalculatorService', () => ({
  getFacilityTasksGrouped: jest.fn(),
}));

jest.mock('../../../../lib/prisma', () => ({
  prisma: {
    area: {
      findMany: jest.fn(),
    },
  },
}));

const pricingSettingsFixture = {
  id: 'pricing-1',
  name: 'Default Plan',
  pricingType: 'hourly',
  baseRatePerSqFt: 0.12,
  minimumMonthlyCharge: 100,
  hourlyRate: 45,
  laborCostPerHour: 20,
  laborBurdenPercentage: 0.2,
  insurancePercentage: 0.08,
  adminOverheadPercentage: 0.12,
  equipmentPercentage: 0.04,
  supplyCostPercentage: 0.03,
  travelCostPerVisit: 15,
  targetProfitMargin: 0.25,
  floorTypeMultipliers: { hardwood: 1.1 },
  frequencyMultipliers: { weekly: 1.0 },
  conditionMultipliers: { standard: 1.0 },
  trafficMultipliers: { medium: 1.0 },
  sqftPerLaborHour: { office: 2000 },
  taskComplexityAddOns: { standard: 0 },
};

const pricingResultFixture = {
  monthlyTotal: 1000,
  subcontractorPayout: 600,
  companyRevenue: 400,
  subcontractorPercentage: 0.6,
  profitAmount: 200,
  profitMarginApplied: 0.25,
  costBreakdown: {
    totalTravelCost: 0,
  },
  areas: [
    {
      areaId: 'area-1',
      areaName: 'Lobby',
      squareFeet: 100,
      floorType: 'hardwood',
      monthlyPrice: 400,
      monthlyVisits: 4,
    },
  ],
};

describe('PerHourV1Strategy', () => {
  const strategy = new PerHourV1Strategy();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('quote should include strategy metadata and settings snapshot', async () => {
    (perHourCalculatorService.calculatePerHourPricing as jest.Mock).mockResolvedValue(
      pricingResultFixture
    );
    (pricingSettingsService.getPricingSettingsById as jest.Mock).mockResolvedValue(
      pricingSettingsFixture
    );

    const result = await strategy.quote({
      facilityId: 'facility-1',
      serviceFrequency: 'weekly',
      pricingPlanId: 'pricing-1',
      workerCount: 3,
    });

    expect(perHourCalculatorService.calculatePerHourPricing).toHaveBeenCalledWith(
      expect.objectContaining({
        facilityId: 'facility-1',
        serviceFrequency: 'weekly',
        pricingPlanId: 'pricing-1',
        workerCount: 3,
      })
    );
    expect(pricingSettingsService.getPricingSettingsById).toHaveBeenCalledWith(
      'pricing-1'
    );
    expect(result.strategyKey).toBe(PRICING_STRATEGY_KEYS.PER_HOUR_V1);
    expect(result.strategyVersion).toBe('1.0.0');
    expect(result.settingsSnapshot).toEqual(
      expect.objectContaining({
        pricingPlanId: 'pricing-1',
        pricingPlanName: 'Default Plan',
        workerCount: 3,
        hourlyRate: 45,
      })
    );
  });

  it('quote should throw when no pricing settings are found', async () => {
    (perHourCalculatorService.calculatePerHourPricing as jest.Mock).mockResolvedValue(
      pricingResultFixture
    );
    (pricingSettingsService.getDefaultPricingSettings as jest.Mock).mockResolvedValue(
      null
    );

    await expect(
      strategy.quote({
        facilityId: 'facility-1',
        serviceFrequency: 'weekly',
      })
    ).rejects.toThrow('No pricing plan found');
  });

  it('generateProposalServices should return fallback line when no areas exist', async () => {
    (perHourCalculatorService.calculatePerHourPricing as jest.Mock).mockResolvedValue(
      {
        ...pricingResultFixture,
        monthlyTotal: 350,
        areas: [],
      }
    );
    (pricingCalculatorService.getFacilityTasksGrouped as jest.Mock).mockResolvedValue({
      byArea: new Map(),
    });
    (prisma.area.findMany as jest.Mock).mockResolvedValue([]);

    const result = await strategy.generateProposalServices({
      facilityId: 'facility-1',
      serviceFrequency: 'weekly',
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        serviceName: 'Weekly Cleaning Service',
        serviceType: 'weekly',
        frequency: 'weekly',
        monthlyPrice: 350,
        includedTasks: [],
      })
    );
  });

  it('generateProposalServices should build weighted area service lines', async () => {
    (perHourCalculatorService.calculatePerHourPricing as jest.Mock).mockResolvedValue(
      {
        ...pricingResultFixture,
        monthlyTotal: 1000,
        areas: [
          {
            areaId: 'area-1',
            areaName: 'Lobby',
            squareFeet: 100,
            floorType: 'hardwood',
            monthlyPrice: 200,
          },
          {
            areaId: 'area-2',
            areaName: 'Kitchen',
            squareFeet: 200,
            floorType: 'tile',
            monthlyPrice: 300,
          },
        ],
      }
    );
    (pricingCalculatorService.getFacilityTasksGrouped as jest.Mock).mockResolvedValue({
      byArea: new Map([
        [
          'area-1',
          {
            tasks: [
              { name: 'Dust Surfaces', frequency: 'daily' },
              { name: 'Vacuum', frequency: 'weekly' },
            ],
          },
        ],
        [
          'area-2',
          {
            tasks: [{ name: 'Mop Floor', frequency: 'weekly' }],
          },
        ],
      ]),
    });
    (prisma.area.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'area-1',
        fixtures: [{ count: 2, fixtureType: { name: 'Sink' } }],
      },
      {
        id: 'area-2',
        fixtures: [],
      },
    ]);

    const result = await strategy.generateProposalServices({
      facilityId: 'facility-1',
      serviceFrequency: 'weekly',
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(
      expect.objectContaining({
        serviceName: 'Lobby',
        serviceType: 'weekly',
        frequency: 'weekly',
        monthlyPrice: 400,
        includedTasks: ['Dust Surfaces', 'Vacuum'],
      })
    );
    expect(result[0].description).toContain('100 sq ft hardwood flooring');
    expect(result[0].description).toContain('Items: Sink x2');
    expect(result[0].description).toContain('Daily: Dust Surfaces');
    expect(result[0].description).toContain('Weekly: Vacuum');

    expect(result[1]).toEqual(
      expect.objectContaining({
        serviceName: 'Kitchen',
        monthlyPrice: 600,
        includedTasks: ['Mop Floor'],
      })
    );
  });

  it('compareFrequencies should return monthly totals per frequency', async () => {
    (perHourCalculatorService.calculatePerHourPricing as jest.Mock).mockImplementation(
      async ({ serviceFrequency }: { serviceFrequency: string }) => {
        const totals: Record<string, number> = {
          weekly: 500,
          monthly: 250,
        };
        return {
          ...pricingResultFixture,
          monthlyTotal: totals[serviceFrequency] ?? 0,
        };
      }
    );

    const result = await strategy.compareFrequencies('facility-1', [
      'weekly',
      'monthly',
    ]);

    expect(result).toEqual([
      { frequency: 'weekly', monthlyTotal: 500 },
      { frequency: 'monthly', monthlyTotal: 250 },
    ]);
    expect(perHourCalculatorService.calculatePerHourPricing).toHaveBeenCalledTimes(
      2
    );
  });
});
