import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prisma } from '../../lib/prisma';
import { exportSystemConfiguration } from '../systemConfigExportService';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    globalSettings: { findUnique: jest.fn() },
    backgroundServiceSetting: { findMany: jest.fn() },
    pricingSettings: { findMany: jest.fn() },
    residentialPricingPlan: { findMany: jest.fn() },
    fixtureType: { findMany: jest.fn() },
    areaType: { findMany: jest.fn() },
    taskTemplate: { findMany: jest.fn() },
    areaTemplate: { findMany: jest.fn() },
    oneTimeServiceCatalogItem: { findMany: jest.fn() },
  },
}));

describe('systemConfigExportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (prisma.globalSettings.findUnique as jest.Mock).mockResolvedValue({
      companyName: 'Hygieia',
      taxRate: { toNumber: () => 0.12 },
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    });
    (prisma.backgroundServiceSetting.findMany as jest.Mock).mockResolvedValue([
      { serviceKey: 'reminders', enabled: true, intervalMs: 900000 },
    ]);
    (prisma.pricingSettings.findMany as jest.Mock).mockResolvedValue([
      { name: 'Commercial Standard', hourlyRate: { toNumber: () => 45 } },
    ]);
    (prisma.residentialPricingPlan.findMany as jest.Mock).mockResolvedValue([
      {
        name: 'Residential Standard',
        settings: { base: 120 },
        isDefault: true,
      },
    ]);
    (prisma.fixtureType.findMany as jest.Mock).mockResolvedValue([
      { name: 'Toilet', defaultMinutesPerItem: { toNumber: () => 4 } },
    ]);
    (prisma.areaType.findMany as jest.Mock).mockResolvedValue([
      {
        name: 'Kitchen',
        scope: 'residential',
        defaultSquareFeet: { toNumber: () => 120 },
      },
    ]);
    (prisma.taskTemplate.findMany as jest.Mock).mockResolvedValue([
      {
        name: 'Clean counters',
        areaType: { name: 'Kitchen' },
        fixtureMinutes: [
          {
            fixtureType: { name: 'Sink' },
            minutesPerFixture: { toNumber: () => 3 },
          },
        ],
      },
    ]);
    (prisma.areaTemplate.findMany as jest.Mock).mockResolvedValue([
      {
        areaType: { name: 'Kitchen' },
        items: [
          {
            fixtureType: { name: 'Sink' },
            minutesPerItem: { toNumber: () => 3 },
          },
        ],
        tasks: [
          {
            taskTemplate: { name: 'Clean counters' },
            baseMinutes: { toNumber: () => 5 },
          },
        ],
      },
    ]);
    (prisma.oneTimeServiceCatalogItem.findMany as jest.Mock).mockResolvedValue([
      {
        name: 'Window Cleaning',
        code: 'window-cleaning',
        baseRate: { toNumber: () => 150 },
        addOns: [
          { name: 'Tracks', code: 'tracks', price: { toNumber: () => 25 } },
        ],
      },
    ]);
  });

  it('exports portable baseline configuration data', async () => {
    const result = (await exportSystemConfiguration()) as any;

    expect(result.metadata.schemaVersion).toBe(1);
    expect(result.settings.global.taxRate).toBe(0.12);
    expect(result.settings.global.updatedAt).toBe('2026-05-01T00:00:00.000Z');
    expect(result.pricing.commercial[0].hourlyRate).toBe(45);
    expect(result.templates.areaTypes[0]).toEqual(
      expect.objectContaining({ name: 'Kitchen', defaultSquareFeet: 120 })
    );
    expect(result.templates.taskTemplates[0].areaType.name).toBe('Kitchen');
    expect(result.pricing.specializedCatalog[0].addOns[0].price).toBe(25);
  });

  it('only exports global task templates, not service-location-specific templates', async () => {
    await exportSystemConfiguration();

    expect(prisma.taskTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          archivedAt: null,
          isGlobal: true,
          facilityId: null,
        },
      })
    );
  });
});
