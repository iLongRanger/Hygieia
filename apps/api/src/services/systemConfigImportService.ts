import { prisma } from '../lib/prisma';
import { BadRequestError } from '../middleware/errorHandler';

type PortableRecord = Record<string, any>;

const SYSTEM_CONFIG_FORMAT = 'hygieia-system-configuration';
const SUPPORTED_SCHEMA_VERSION = 1;

function asArray(value: unknown): PortableRecord[] {
  return Array.isArray(value) ? (value as PortableRecord[]) : [];
}

function stripSystemFields<T extends PortableRecord>(value: T): PortableRecord {
  const {
    id,
    createdAt,
    updatedAt,
    archivedAt,
    createdByUser,
    createdByUserId,
    updatedByUser,
    updatedByUserId,
    areaType,
    fixtureMinutes,
    items,
    tasks,
    addOns,
    ...portable
  } = value;
  return portable;
}

function validateImportPayload(payload: PortableRecord) {
  if (payload?.metadata?.format !== SYSTEM_CONFIG_FORMAT) {
    throw new BadRequestError('Invalid system configuration export format');
  }

  if (payload.metadata.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    throw new BadRequestError(
      `Unsupported system configuration schema version: ${payload.metadata.schemaVersion}`
    );
  }
}

export async function importSystemConfiguration(
  payload: PortableRecord,
  userId: string,
  options: { dryRun?: boolean } = {}
) {
  validateImportPayload(payload);

  const counts = {
    globalSettings: payload.settings?.global ? 1 : 0,
    backgroundServices: asArray(payload.settings?.backgroundServices).length,
    commercialPricingPlans: asArray(payload.pricing?.commercial).length,
    residentialPricingPlans: asArray(payload.pricing?.residential).length,
    specializedCatalogItems: asArray(payload.pricing?.specializedCatalog)
      .length,
    fixtureTypes: asArray(payload.templates?.fixtureTypes).length,
    areaTypes: asArray(payload.templates?.areaTypes).length,
    taskTemplates: asArray(payload.templates?.taskTemplates).length,
    areaTemplates: asArray(payload.templates?.areaTemplates).length,
  };

  if (options.dryRun) {
    return { dryRun: true, imported: counts };
  }

  await prisma.$transaction(async (tx) => {
    const globalSettings = payload.settings?.global;
    if (globalSettings) {
      await tx.globalSettings.upsert({
        where: { id: 'global' },
        create: { ...stripSystemFields(globalSettings), id: 'global' },
        update: stripSystemFields(globalSettings),
      });
    }

    for (const setting of asArray(payload.settings?.backgroundServices)) {
      if (!setting.serviceKey) continue;
      await tx.backgroundServiceSetting.upsert({
        where: { serviceKey: setting.serviceKey },
        create: {
          serviceKey: setting.serviceKey,
          enabled: setting.enabled ?? true,
          intervalMs: setting.intervalMs,
          updatedByUserId: userId,
        },
        update: {
          enabled: setting.enabled,
          intervalMs: setting.intervalMs,
          updatedByUserId: userId,
        },
      });
    }

    for (const pricingPlan of asArray(payload.pricing?.commercial)) {
      if (!pricingPlan.name) continue;
      const data = stripSystemFields(pricingPlan);
      await tx.pricingSettings.upsert({
        where: { name: pricingPlan.name },
        create: data as any,
        update: data as any,
      });
    }

    for (const pricingPlan of asArray(payload.pricing?.residential)) {
      if (!pricingPlan.name) continue;
      const data = {
        ...stripSystemFields(pricingPlan),
        createdByUserId: userId,
      };
      await tx.residentialPricingPlan.upsert({
        where: { name: pricingPlan.name },
        create: data as any,
        update: stripSystemFields(pricingPlan) as any,
      });
    }

    for (const fixtureType of asArray(payload.templates?.fixtureTypes)) {
      if (!fixtureType.name) continue;
      const data = stripSystemFields(fixtureType);
      await tx.fixtureType.upsert({
        where: { name: fixtureType.name },
        create: data as any,
        update: data as any,
      });
    }

    for (const areaType of asArray(payload.templates?.areaTypes)) {
      if (!areaType.name) continue;
      const data = stripSystemFields(areaType);
      await tx.areaType.upsert({
        where: { name: areaType.name },
        create: data as any,
        update: data as any,
      });
    }

    for (const taskTemplate of asArray(payload.templates?.taskTemplates)) {
      if (!taskTemplate.name) continue;
      const areaTypeName = taskTemplate.areaType?.name;
      const areaType = areaTypeName
        ? await tx.areaType.findUnique({
            where: { name: areaTypeName },
            select: { id: true },
          })
        : null;
      const existing = await tx.taskTemplate.findFirst({
        where: {
          name: taskTemplate.name,
          cleaningType: taskTemplate.cleaningType,
          scope: taskTemplate.scope,
          isGlobal: true,
          facilityId: null,
        },
        select: { id: true },
      });
      const fixtureMinutes = [];
      for (const fixture of asArray(taskTemplate.fixtureMinutes)) {
        const fixtureTypeName = fixture.fixtureType?.name;
        if (!fixtureTypeName) continue;
        const fixtureType = await tx.fixtureType.findUnique({
          where: { name: fixtureTypeName },
          select: { id: true },
        });
        if (!fixtureType) continue;
        fixtureMinutes.push({
          fixtureTypeId: fixtureType.id,
          minutesPerFixture: fixture.minutesPerFixture ?? 0,
        });
      }
      const data = {
        ...stripSystemFields(taskTemplate),
        areaTypeId: areaType?.id ?? null,
        facilityId: null,
        isGlobal: true,
        createdByUserId: userId,
      };

      if (existing) {
        await tx.taskFixtureMinutes.deleteMany({
          where: { taskTemplateId: existing.id },
        });
        await tx.taskTemplate.update({
          where: { id: existing.id },
          data: {
            ...stripSystemFields(data),
            fixtureMinutes: { create: fixtureMinutes },
          },
        });
      } else {
        await tx.taskTemplate.create({
          data: {
            ...data,
            fixtureMinutes: { create: fixtureMinutes },
          } as any,
        });
      }
    }

    for (const areaTemplate of asArray(payload.templates?.areaTemplates)) {
      const areaTypeName = areaTemplate.areaType?.name;
      if (!areaTypeName) continue;
      const areaType = await tx.areaType.findUnique({
        where: { name: areaTypeName },
        select: { id: true },
      });
      if (!areaType) continue;

      const template = await tx.areaTemplate.upsert({
        where: { areaTypeId: areaType.id },
        create: {
          name: areaTemplate.name,
          defaultSquareFeet: areaTemplate.defaultSquareFeet,
          areaTypeId: areaType.id,
          createdByUserId: userId,
        },
        update: {
          name: areaTemplate.name,
          defaultSquareFeet: areaTemplate.defaultSquareFeet,
        },
        select: { id: true },
      });

      await tx.areaTemplateItem.deleteMany({
        where: { areaTemplateId: template.id },
      });
      await tx.areaTemplateTask.deleteMany({
        where: { areaTemplateId: template.id },
      });

      for (const item of asArray(areaTemplate.items)) {
        const fixtureTypeName = item.fixtureType?.name;
        if (!fixtureTypeName) continue;
        const fixtureType = await tx.fixtureType.findUnique({
          where: { name: fixtureTypeName },
          select: { id: true },
        });
        if (!fixtureType) continue;
        await tx.areaTemplateItem.create({
          data: {
            areaTemplateId: template.id,
            fixtureTypeId: fixtureType.id,
            defaultCount: item.defaultCount ?? 0,
            minutesPerItem: item.minutesPerItem ?? 0,
            sortOrder: item.sortOrder ?? 0,
          },
        });
      }

      for (const task of asArray(areaTemplate.tasks)) {
        const taskTemplateName = task.taskTemplate?.name;
        const taskTemplate = taskTemplateName
          ? await tx.taskTemplate.findFirst({
              where: {
                name: taskTemplateName,
                isGlobal: true,
                facilityId: null,
              },
              select: { id: true },
            })
          : null;
        await tx.areaTemplateTask.create({
          data: {
            areaTemplateId: template.id,
            taskTemplateId: taskTemplate?.id ?? null,
            name: task.name,
            baseMinutes: task.baseMinutes,
            perSqftMinutes: task.perSqftMinutes,
            perUnitMinutes: task.perUnitMinutes,
            perRoomMinutes: task.perRoomMinutes,
            sortOrder: task.sortOrder ?? 0,
          },
        });
      }
    }

    for (const catalogItem of asArray(payload.pricing?.specializedCatalog)) {
      if (!catalogItem.code) continue;
      const data = {
        ...stripSystemFields(catalogItem),
        createdByUserId: userId,
      };
      const item = await tx.oneTimeServiceCatalogItem.upsert({
        where: { code: catalogItem.code },
        create: data as any,
        update: stripSystemFields(catalogItem) as any,
        select: { id: true },
      });
      await tx.oneTimeServiceCatalogAddon.deleteMany({
        where: { catalogItemId: item.id },
      });
      for (const addOn of asArray(catalogItem.addOns)) {
        if (!addOn.code) continue;
        await tx.oneTimeServiceCatalogAddon.create({
          data: {
            ...stripSystemFields(addOn),
            catalogItemId: item.id,
          } as any,
        });
      }
    }
  });

  return { dryRun: false, imported: counts };
}
