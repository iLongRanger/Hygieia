import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { prisma } from '../../../lib/prisma';
import * as pricingSettingsService from '../../pricingSettingsService';
import { calculatePerHourPricing } from '../perHourCalculatorService';

jest.mock('../../../lib/prisma', () => ({
  prisma: {
    facility: {
      findUnique: jest.fn(),
    },
    facilityTask: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../../pricingSettingsService', () => ({
  getDefaultPricingSettings: jest.fn(),
}));

const basePricingSettings = {
  id: 'settings-1',
  name: 'Default',
  pricingType: 'hourly',
  baseRatePerSqFt: 0.1,
  minimumMonthlyCharge: 0,
  hourlyRate: 35,
  laborCostPerHour: 18,
  laborBurdenPercentage: 0.25,
  insurancePercentage: 0.08,
  adminOverheadPercentage: 0.12,
  equipmentPercentage: 0.05,
  supplyCostPercentage: 0.04,
  supplyCostPerSqFt: null,
  travelCostPerVisit: 15,
  targetProfitMargin: 0.25,
  floorTypeMultipliers: { vct: 1.0 },
  frequencyMultipliers: { weekly: 1.0 },
  conditionMultipliers: { standard: 1.0 },
  trafficMultipliers: { medium: 1.0 },
  sqftPerLaborHour: { office: 2500, other: 2500 },
  taskComplexityAddOns: { standard: 0 },
  subcontractorPercentage: 0.60,
};

describe('calculatePerHourPricing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calculates per-hour pricing with full overhead cost stack', async () => {
    (pricingSettingsService.getDefaultPricingSettings as jest.Mock).mockResolvedValue(basePricingSettings);

    (prisma.facility.findUnique as jest.Mock).mockResolvedValue({
      id: 'facility-1',
      name: 'Test Facility',
      buildingType: 'office',
      areas: [
        {
          id: 'area-1',
          name: 'Restroom A',
          quantity: 1,
          squareFeet: 100,
          floorType: 'vct',
          conditionLevel: 'standard',
          trafficLevel: 'medium',
          roomCount: 1,
          unitCount: 1,
          areaType: { name: 'Restroom' },
          fixtures: [
            { fixtureTypeId: 'fixture-1', count: 1, minutesPerItem: 0, fixtureType: { name: 'Toilet' } },
            { fixtureTypeId: 'fixture-2', count: 1, minutesPerItem: 0, fixtureType: { name: 'Sink' } },
          ],
        },
      ],
    });

    (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'task-1',
        areaId: 'area-1',
        cleaningFrequency: 'weekly',
        baseMinutesOverride: null,
        perSqftMinutesOverride: null,
        perUnitMinutesOverride: null,
        perRoomMinutesOverride: null,
        taskTemplate: {
          baseMinutes: 2,
          perSqftMinutes: 0.01,
          perUnitMinutes: 0.5,
          perRoomMinutes: 0,
          fixtureMinutes: [
            { fixtureTypeId: 'fixture-1', minutesPerFixture: 2.5 },
            { fixtureTypeId: 'fixture-2', minutesPerFixture: 1.5 },
          ],
        },
        fixtureMinutes: [],
      },
    ]);

    const result = await calculatePerHourPricing({
      facilityId: 'facility-1',
      serviceFrequency: 'weekly',
      taskComplexity: 'standard',
      workerCount: 2,
    });

    // Task minutes per occurrence: 2 + (0.01*100) + (0.5*1) + (2.5*1) + (1.5*1) = 7.5
    // Monthly occurrences (weekly): 4.33
    // Monthly minutes: 7.5 * 4.33 = 32.475
    // Monthly hours: 32.475 / 60 = 0.54125
    // Labor cost: 0.54125 * 18 = 9.7425
    // Labor burden (25%): 2.435625
    // Total labor: 12.178125
    // Insurance (8%): 0.97425
    // Admin (12%): 1.461375
    // Equipment (5%): 0.6089
    // Supply (4% of labor+overhead): (12.178125+0.97425+1.461375+0.6089) * 0.04 = 0.6089
    // Area cost: ~15.83
    // Travel: 15 * 4.33 = 64.95
    // Total monthly cost: ~80.78
    // / (1 - 0.25) = ~107.71 monthly total
    expect(result.monthlyTotal).toBeGreaterThan(0);
    expect(result.areas[0].laborBurden).toBeGreaterThan(0);
    expect(result.areas[0].insuranceCost).toBeGreaterThan(0);
    expect(result.areas[0].adminOverheadCost).toBeGreaterThan(0);
    expect(result.areas[0].equipmentCost).toBeGreaterThan(0);
    expect(result.areas[0].supplyCost).toBeGreaterThan(0);
    expect(result.profitAmount).toBeGreaterThan(0);
    expect(result.profitMarginApplied).toBe(0.25);
    expect(result.costBreakdown.totalTravelCost).toBeGreaterThan(0);

    // Worker count should NOT multiply the total
    const resultSingle = await calculatePerHourPricing({
      facilityId: 'facility-1',
      serviceFrequency: 'weekly',
      taskComplexity: 'standard',
      workerCount: 1,
    });
    expect(result.monthlyTotal).toBe(resultSingle.monthlyTotal);
  });

  it('uses selected service frequency as baseline instead of defaulting daily tasks to 30 visits', async () => {
    (pricingSettingsService.getDefaultPricingSettings as jest.Mock).mockResolvedValue(basePricingSettings);

    (prisma.facility.findUnique as jest.Mock).mockResolvedValue({
      id: 'facility-1',
      name: 'Test Facility',
      buildingType: 'office',
      areas: [
        {
          id: 'area-1',
          name: 'Office Area',
          quantity: 1,
          squareFeet: 1000,
          floorType: 'vct',
          conditionLevel: 'standard',
          trafficLevel: 'medium',
          roomCount: 0,
          unitCount: 0,
          areaType: { name: 'Office' },
          fixtures: [],
        },
      ],
    });

    (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'task-daily',
        areaId: 'area-1',
        cleaningFrequency: 'daily',
        baseMinutesOverride: 60,
        perSqftMinutesOverride: null,
        perUnitMinutesOverride: null,
        perRoomMinutesOverride: null,
        taskTemplate: {
          baseMinutes: 60,
          perSqftMinutes: 0,
          perUnitMinutes: 0,
          perRoomMinutes: 0,
          fixtureMinutes: [],
        },
        fixtureMinutes: [],
      },
      {
        id: 'task-monthly',
        areaId: 'area-1',
        cleaningFrequency: 'monthly',
        baseMinutesOverride: 120,
        perSqftMinutesOverride: null,
        perUnitMinutesOverride: null,
        perRoomMinutesOverride: null,
        taskTemplate: {
          baseMinutes: 120,
          perSqftMinutes: 0,
          perUnitMinutes: 0,
          perRoomMinutes: 0,
          fixtureMinutes: [],
        },
        fixtureMinutes: [],
      },
    ]);

    const result = await calculatePerHourPricing({
      facilityId: 'facility-1',
      serviceFrequency: '5x_week',
    });

    // Daily/weekly/biweekly tasks follow selected service cadence (5x/week = 21.67 visits/month).
    // Daily task: 60 min * 21.67 visits = 1300.2 min/month
    // Monthly task: 120 min * 1 visit = 120 min/month
    // Total: 1420.2 min = 23.67 hours
    expect(result.areas[0].laborHours).toBeCloseTo(23.67, 1);
    expect(result.monthlyTotal).toBeGreaterThan(1000);
    // Baseline cadence follows selected frequency, not 30 daily visits.
    expect(result.areas[0].monthlyVisits).toBeCloseTo(21.67, 2);
    expect(result.monthlyVisits).toBeCloseTo(21.67, 2);
  });

  it('uses subcontractorPercentageOverride when provided', async () => {
    (pricingSettingsService.getDefaultPricingSettings as jest.Mock).mockResolvedValue(basePricingSettings);

    (prisma.facility.findUnique as jest.Mock).mockResolvedValue({
      id: 'facility-1',
      name: 'Test Facility',
      buildingType: 'office',
      areas: [
        {
          id: 'area-1',
          name: 'Restroom A',
          quantity: 1,
          squareFeet: 100,
          floorType: 'vct',
          conditionLevel: 'standard',
          trafficLevel: 'medium',
          roomCount: 1,
          unitCount: 1,
          areaType: { name: 'Restroom' },
          fixtures: [],
        },
      ],
    });

    (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'task-1',
        areaId: 'area-1',
        cleaningFrequency: 'weekly',
        baseMinutesOverride: null,
        perSqftMinutesOverride: null,
        perUnitMinutesOverride: null,
        perRoomMinutesOverride: null,
        taskTemplate: {
          baseMinutes: 10,
          perSqftMinutes: 0,
          perUnitMinutes: 0,
          perRoomMinutes: 0,
          fixtureMinutes: [],
        },
        fixtureMinutes: [],
      },
    ]);

    const resultDefault = await calculatePerHourPricing({
      facilityId: 'facility-1',
      serviceFrequency: 'weekly',
    });

    const resultOverride = await calculatePerHourPricing({
      facilityId: 'facility-1',
      serviceFrequency: 'weekly',
      subcontractorPercentageOverride: 0.40,
    });

    expect(resultDefault.subcontractorPercentage).toBe(0.60);
    expect(resultOverride.subcontractorPercentage).toBe(0.40);

    // Same monthly total, different split
    expect(resultDefault.monthlyTotal).toBe(resultOverride.monthlyTotal);
    expect(resultOverride.subcontractorPayout).toBeLessThan(resultDefault.subcontractorPayout);
    expect(resultOverride.companyRevenue).toBeGreaterThan(resultDefault.companyRevenue);
  });

  it('applies multipliers to hours not dollars', async () => {
    const settingsWithMultipliers = {
      ...basePricingSettings,
      floorTypeMultipliers: { vct: 1.0, marble: 1.5 },
      conditionMultipliers: { standard: 1.0, poor: 1.3 },
      trafficMultipliers: { medium: 1.0, high: 1.2 },
    };

    (pricingSettingsService.getDefaultPricingSettings as jest.Mock).mockResolvedValue(settingsWithMultipliers);

    const makeArea = (floorType: string, conditionLevel: string, trafficLevel: string) => ({
      id: 'area-1',
      name: 'Area',
      quantity: 1,
      squareFeet: 1000,
      floorType,
      conditionLevel,
      trafficLevel,
      roomCount: 0,
      unitCount: 0,
      areaType: { name: 'Office' },
      fixtures: [],
    });

    const mockTasks = [
      {
        id: 'task-1',
        areaId: 'area-1',
        cleaningFrequency: 'weekly',
        baseMinutesOverride: 60,
        perSqftMinutesOverride: null,
        perUnitMinutesOverride: null,
        perRoomMinutesOverride: null,
        taskTemplate: {
          baseMinutes: 60,
          perSqftMinutes: 0,
          perUnitMinutes: 0,
          perRoomMinutes: 0,
          fixtureMinutes: [],
        },
        fixtureMinutes: [],
      },
    ];

    // Base case: all multipliers 1.0
    (prisma.facility.findUnique as jest.Mock).mockResolvedValue({
      id: 'facility-1', name: 'Test', buildingType: 'office',
      areas: [makeArea('vct', 'standard', 'medium')],
    });
    (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue(mockTasks);

    const baseResult = await calculatePerHourPricing({
      facilityId: 'facility-1',
      serviceFrequency: 'weekly',
    });

    // With multipliers: marble (1.5) × poor (1.3) × high (1.2) = 2.34x hours
    (prisma.facility.findUnique as jest.Mock).mockResolvedValue({
      id: 'facility-1', name: 'Test', buildingType: 'office',
      areas: [makeArea('marble', 'poor', 'high')],
    });

    const adjustedResult = await calculatePerHourPricing({
      facilityId: 'facility-1',
      serviceFrequency: 'weekly',
    });

    // Hours should scale by 2.34x
    const hourRatio = adjustedResult.areas[0].laborHours / baseResult.areas[0].laborHours;
    expect(hourRatio).toBeCloseTo(2.34, 1);

    // Total should be greater with multipliers
    expect(adjustedResult.monthlyTotal).toBeGreaterThan(baseResult.monthlyTotal);
  });
});
