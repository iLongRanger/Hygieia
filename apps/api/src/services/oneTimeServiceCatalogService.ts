import { prisma } from '../lib/prisma';
import type {
  CreateOneTimeServiceCatalogItemInput,
  ListOneTimeServiceCatalogQuery,
  UpdateOneTimeServiceCatalogItemInput,
} from '../schemas/oneTimeServiceCatalog';
import { NotFoundError } from '../middleware/errorHandler';

const itemSelect = {
  id: true,
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
  createdAt: true,
  updatedAt: true,
  addOns: {
    select: {
      id: true,
      name: true,
      code: true,
      price: true,
      defaultQuantity: true,
      isActive: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: 'asc' as const },
  },
} as const;

export async function listOneTimeServiceCatalog(params: ListOneTimeServiceCatalogQuery) {
  const where = {
    ...(params.includeInactive ? {} : { isActive: true }),
    ...(params.serviceType ? { serviceType: params.serviceType } : {}),
  };

  const data = await prisma.oneTimeServiceCatalogItem.findMany({
    where,
    select: itemSelect,
    orderBy: [{ serviceType: 'asc' }, { name: 'asc' }],
  });

  return { data };
}

export async function createOneTimeServiceCatalogItem(
  input: CreateOneTimeServiceCatalogItemInput,
  createdByUserId: string
) {
  return prisma.oneTimeServiceCatalogItem.create({
    data: {
      name: input.name,
      code: input.code,
      description: input.description,
      serviceType: input.serviceType,
      unitType: input.unitType,
      baseRate: input.baseRate,
      defaultQuantity: input.defaultQuantity,
      minimumCharge: input.minimumCharge,
      maxDiscountPercent: input.maxDiscountPercent,
      requiresSchedule: input.requiresSchedule,
      isActive: input.isActive,
      createdByUserId,
      addOns: {
        create: (input.addOns ?? []).map((addOn, index) => ({
          name: addOn.name,
          code: addOn.code,
          price: addOn.price,
          defaultQuantity: addOn.defaultQuantity,
          isActive: addOn.isActive,
          sortOrder: addOn.sortOrder ?? index,
        })),
      },
    },
    select: itemSelect,
  });
}

export async function updateOneTimeServiceCatalogItem(
  id: string,
  input: UpdateOneTimeServiceCatalogItemInput
) {
  const existing = await prisma.oneTimeServiceCatalogItem.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new NotFoundError('One-time service catalog item not found');

  return prisma.$transaction(async (tx) => {
    if (input.addOns) {
      await tx.oneTimeServiceCatalogAddon.deleteMany({ where: { catalogItemId: id } });
      if (input.addOns.length > 0) {
        await tx.oneTimeServiceCatalogAddon.createMany({
          data: input.addOns.map((addOn, index) => ({
            catalogItemId: id,
            name: addOn.name,
            code: addOn.code,
            price: addOn.price,
            defaultQuantity: addOn.defaultQuantity,
            isActive: addOn.isActive,
            sortOrder: addOn.sortOrder ?? index,
          })),
        });
      }
    }

    return tx.oneTimeServiceCatalogItem.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.serviceType !== undefined ? { serviceType: input.serviceType } : {}),
        ...(input.unitType !== undefined ? { unitType: input.unitType } : {}),
        ...(input.baseRate !== undefined ? { baseRate: input.baseRate } : {}),
        ...(input.defaultQuantity !== undefined ? { defaultQuantity: input.defaultQuantity } : {}),
        ...(input.minimumCharge !== undefined ? { minimumCharge: input.minimumCharge } : {}),
        ...(input.maxDiscountPercent !== undefined ? { maxDiscountPercent: input.maxDiscountPercent } : {}),
        ...(input.requiresSchedule !== undefined ? { requiresSchedule: input.requiresSchedule } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      select: itemSelect,
    });
  });
}

export async function deleteOneTimeServiceCatalogItem(id: string) {
  const existing = await prisma.oneTimeServiceCatalogItem.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new NotFoundError('One-time service catalog item not found');

  await prisma.oneTimeServiceCatalogItem.delete({ where: { id } });
}
