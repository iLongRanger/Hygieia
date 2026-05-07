import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prisma } from '../../lib/prisma';
import { importSystemConfiguration } from '../systemConfigImportService';

const mockTx = {
  globalSettings: { upsert: jest.fn() },
  backgroundServiceSetting: { upsert: jest.fn() },
  pricingSettings: { upsert: jest.fn() },
  residentialPricingPlan: { upsert: jest.fn() },
  fixtureType: { upsert: jest.fn(), findUnique: jest.fn() },
  areaType: { upsert: jest.fn(), findUnique: jest.fn() },
  taskTemplate: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  taskFixtureMinutes: { deleteMany: jest.fn() },
  areaTemplate: { upsert: jest.fn() },
  areaTemplateItem: { deleteMany: jest.fn(), create: jest.fn() },
  areaTemplateTask: { deleteMany: jest.fn(), create: jest.fn() },
  oneTimeServiceCatalogItem: { upsert: jest.fn() },
  oneTimeServiceCatalogAddon: { deleteMany: jest.fn(), create: jest.fn() },
};

jest.mock('../../lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

function createPayload() {
  return {
    metadata: {
      schemaVersion: 1,
      format: 'hygieia-system-configuration',
    },
    settings: {
      global: { companyName: 'Hygieia', taxRate: 0.12 },
      backgroundServices: [
        { serviceKey: 'reminders', enabled: true, intervalMs: 900000 },
      ],
    },
    pricing: {
      commercial: [{ name: 'Commercial Standard', hourlyRate: 45 }],
      residential: [
        {
          name: 'Residential Standard',
          strategyKey: 'residential_flat_v1',
          settings: {},
        },
      ],
      specializedCatalog: [
        {
          name: 'Window Cleaning',
          code: 'window-cleaning',
          unitType: 'flat',
          baseRate: 150,
          addOns: [{ name: 'Tracks', code: 'tracks', price: 25 }],
        },
      ],
    },
    templates: {
      fixtureTypes: [{ name: 'Sink', defaultMinutesPerItem: 3 }],
      areaTypes: [{ name: 'Kitchen', scope: 'residential' }],
      taskTemplates: [
        {
          name: 'Clean counters',
          scope: 'residential',
          cleaningType: 'standard',
          estimatedMinutes: 5,
          areaType: { name: 'Kitchen' },
          fixtureMinutes: [
            { fixtureType: { name: 'Sink' }, minutesPerFixture: 3 },
          ],
        },
      ],
      areaTemplates: [
        {
          name: 'Kitchen',
          areaType: { name: 'Kitchen' },
          items: [
            {
              fixtureType: { name: 'Sink' },
              defaultCount: 1,
              minutesPerItem: 3,
            },
          ],
          tasks: [{ taskTemplate: { name: 'Clean counters' }, baseMinutes: 5 }],
        },
      ],
    },
  };
}

describe('systemConfigImportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (callback: any) => callback(mockTx)
    );
    mockTx.areaType.findUnique.mockResolvedValue({ id: 'area-type-1' });
    mockTx.fixtureType.findUnique.mockResolvedValue({ id: 'fixture-type-1' });
    mockTx.taskTemplate.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'task-template-1',
      });
    mockTx.areaTemplate.upsert.mockResolvedValue({ id: 'area-template-1' });
    mockTx.oneTimeServiceCatalogItem.upsert.mockResolvedValue({
      id: 'catalog-1',
    });
  });

  it('returns counts without writing in dry-run mode', async () => {
    const result = await importSystemConfiguration(createPayload(), 'user-1', {
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
    expect(result.imported).toEqual(
      expect.objectContaining({
        globalSettings: 1,
        commercialPricingPlans: 1,
        taskTemplates: 1,
      })
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects invalid export format', async () => {
    await expect(
      importSystemConfiguration({ metadata: {} }, 'user-1')
    ).rejects.toThrow('Invalid system configuration export format');
  });

  it('merges baseline setup data by stable keys', async () => {
    const result = await importSystemConfiguration(createPayload(), 'user-1');

    expect(result.dryRun).toBe(false);
    expect(mockTx.globalSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'global' } })
    );
    expect(mockTx.pricingSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { name: 'Commercial Standard' } })
    );
    expect(mockTx.oneTimeServiceCatalogItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { code: 'window-cleaning' } })
    );
    expect(mockTx.oneTimeServiceCatalogAddon.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          catalogItemId: 'catalog-1',
          code: 'tracks',
        }),
      })
    );
  });
});
