import { prisma } from '../lib/prisma';

const CONFIG_EXPORT_SCHEMA_VERSION = 1;

function toPortableValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(toPortableValue);
  }

  if (value && typeof value === 'object') {
    if (
      'toNumber' in value &&
      typeof (value as { toNumber?: unknown }).toNumber === 'function'
    ) {
      return (value as { toNumber: () => number }).toNumber();
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        toPortableValue(entryValue),
      ])
    );
  }

  return value;
}

export async function exportSystemConfiguration() {
  const [
    globalSettings,
    backgroundServices,
    commercialPricingPlans,
    residentialPricingPlans,
    fixtureTypes,
    areaTypes,
    taskTemplates,
    areaTemplates,
    specializedCatalog,
  ] = await Promise.all([
    prisma.globalSettings.findUnique({ where: { id: 'global' } }),
    prisma.backgroundServiceSetting.findMany({
      select: {
        serviceKey: true,
        enabled: true,
        intervalMs: true,
      },
      orderBy: { serviceKey: 'asc' },
    }),
    prisma.pricingSettings.findMany({
      where: { archivedAt: null },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    }),
    prisma.residentialPricingPlan.findMany({
      where: { archivedAt: null },
      select: {
        name: true,
        strategyKey: true,
        settings: true,
        isActive: true,
        isDefault: true,
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    }),
    prisma.fixtureType.findMany({
      select: {
        name: true,
        description: true,
        category: true,
        defaultMinutesPerItem: true,
        isActive: true,
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    }),
    prisma.areaType.findMany({
      select: {
        name: true,
        description: true,
        scope: true,
        defaultSquareFeet: true,
        baseCleaningTimeMinutes: true,
        guidanceItems: true,
      },
      orderBy: [{ scope: 'asc' }, { name: 'asc' }],
    }),
    prisma.taskTemplate.findMany({
      where: {
        archivedAt: null,
        isGlobal: true,
        facilityId: null,
      },
      select: {
        name: true,
        description: true,
        scope: true,
        cleaningType: true,
        estimatedMinutes: true,
        baseMinutes: true,
        perSqftMinutes: true,
        perUnitMinutes: true,
        perRoomMinutes: true,
        difficultyLevel: true,
        requiredEquipment: true,
        requiredSupplies: true,
        instructions: true,
        isGlobal: true,
        version: true,
        isActive: true,
        areaType: { select: { name: true } },
        fixtureMinutes: {
          select: {
            minutesPerFixture: true,
            fixtureType: { select: { name: true } },
          },
          orderBy: { fixtureType: { name: 'asc' } },
        },
      },
      orderBy: [{ scope: 'asc' }, { cleaningType: 'asc' }, { name: 'asc' }],
    }),
    prisma.areaTemplate.findMany({
      select: {
        name: true,
        defaultSquareFeet: true,
        areaType: { select: { name: true } },
        items: {
          select: {
            defaultCount: true,
            minutesPerItem: true,
            sortOrder: true,
            fixtureType: { select: { name: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
        tasks: {
          select: {
            name: true,
            baseMinutes: true,
            perSqftMinutes: true,
            perUnitMinutes: true,
            perRoomMinutes: true,
            sortOrder: true,
            taskTemplate: { select: { name: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { areaType: { name: 'asc' } },
    }),
    prisma.oneTimeServiceCatalogItem.findMany({
      select: {
        name: true,
        code: true,
        description: true,
        serviceType: true,
        unitType: true,
        baseRate: true,
        defaultQuantity: true,
        minimumCharge: true,
        maxDiscountPercent: true,
        requiresSchedule: true,
        isActive: true,
        addOns: {
          select: {
            name: true,
            code: true,
            price: true,
            defaultQuantity: true,
            isActive: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: [{ serviceType: 'asc' }, { name: 'asc' }],
    }),
  ]);

  return toPortableValue({
    metadata: {
      schemaVersion: CONFIG_EXPORT_SCHEMA_VERSION,
      exportedAt: new Date(),
      format: 'hygieia-system-configuration',
    },
    settings: {
      global: globalSettings,
      backgroundServices,
    },
    pricing: {
      commercial: commercialPricingPlans,
      residential: residentialPricingPlans,
      specializedCatalog,
    },
    templates: {
      fixtureTypes,
      areaTypes,
      taskTemplates,
      areaTemplates,
    },
  });
}
