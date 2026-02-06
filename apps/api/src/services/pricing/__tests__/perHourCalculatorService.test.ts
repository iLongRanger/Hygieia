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

describe('calculatePerHourPricing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calculates per-hour pricing with fixtures and worker count', async () => {
    (pricingSettingsService.getDefaultPricingSettings as jest.Mock).mockResolvedValue({
      id: 'settings-1',
      name: 'Default',
      pricingType: 'hourly',
      baseRatePerSqFt: 0.1,
      minimumMonthlyCharge: 0,
      hourlyRate: 35,
      floorTypeMultipliers: { vct: 1.0 },
      frequencyMultipliers: { weekly: 1.0 },
      conditionMultipliers: { standard: 1.0 },
      trafficMultipliers: { medium: 1.0 },
      buildingTypeMultipliers: { office: 1.0, other: 1.0 },
      taskComplexityAddOns: { standard: 0 },
    });

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
            { fixtureTypeId: 'fixture-1', count: 1, fixtureType: { name: 'Toilet' } },
            { fixtureTypeId: 'fixture-2', count: 1, fixtureType: { name: 'Sink' } },
          ],
        },
      ],
    });

    (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'task-1',
        areaId: 'area-1',
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

    // Minutes: 2 + (0.01*100) + (0.5*1) + (2.5*1) + (1.5*1) = 7.5
    // Hours: 0.125
    // Per-visit cost: 0.125 * 35 = 4.375
    // Monthly visits (weekly) = 4.33
    // Monthly total = 4.375 * 4.33 * 2 workers = 37.89 (rounded)
    expect(result.monthlyTotal).toBeCloseTo(37.89, 2);
    expect(result.areas[0].laborHours).toBeCloseTo(0.13, 2);
  });
});
