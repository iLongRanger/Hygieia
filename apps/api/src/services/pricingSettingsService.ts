import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export interface PricingSettingsListParams {
  page?: number;
  limit?: number;
  isActive?: boolean;
  pricingType?: string;
  isDefault?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeArchived?: boolean;
}

export interface PricingSettingsCreateInput {
  name: string;
  pricingType?: string;
  baseRatePerSqFt?: number;
  minimumMonthlyCharge?: number;
  hourlyRate?: number;
  floorTypeMultipliers?: object;
  frequencyMultipliers?: object;
  conditionMultipliers?: object;
  trafficMultipliers?: object;
  buildingTypeMultipliers?: object;
  taskComplexityAddOns?: object;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface PricingSettingsUpdateInput {
  name?: string;
  pricingType?: string;
  baseRatePerSqFt?: number;
  minimumMonthlyCharge?: number;
  hourlyRate?: number;
  floorTypeMultipliers?: object;
  frequencyMultipliers?: object;
  conditionMultipliers?: object;
  trafficMultipliers?: object;
  buildingTypeMultipliers?: object;
  taskComplexityAddOns?: object;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const pricingSettingsSelect = {
  id: true,
  name: true,
  pricingType: true,
  baseRatePerSqFt: true,
  minimumMonthlyCharge: true,
  hourlyRate: true,
  // Labor cost settings
  laborCostPerHour: true,
  laborBurdenPercentage: true,
  sqftPerLaborHour: true,
  // Overhead cost settings
  insurancePercentage: true,
  adminOverheadPercentage: true,
  travelCostPerVisit: true,
  equipmentPercentage: true,
  // Supply cost settings
  supplyCostPercentage: true,
  supplyCostPerSqFt: true,
  // Profit settings
  targetProfitMargin: true,
  // Multipliers
  floorTypeMultipliers: true,
  frequencyMultipliers: true,
  conditionMultipliers: true,
  trafficMultipliers: true,
  buildingTypeMultipliers: true,
  taskComplexityAddOns: true,
  isActive: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
} satisfies Prisma.PricingSettingsSelect;

export async function listPricingSettings(
  params: PricingSettingsListParams
): Promise<
  PaginatedResult<Prisma.PricingSettingsGetPayload<{ select: typeof pricingSettingsSelect }>>
> {
  const {
    page = 1,
    limit = 20,
    isActive,
    pricingType,
    isDefault,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includeArchived = false,
  } = params;

  const where: Prisma.PricingSettingsWhereInput = {};

  if (!includeArchived) {
    where.archivedAt = null;
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (pricingType) {
    where.pricingType = pricingType;
  }

  if (isDefault !== undefined) {
    where.isDefault = isDefault;
  }

  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  const validSortFields = ['createdAt', 'updatedAt', 'name'];
  const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

  const [pricingSettings, total] = await Promise.all([
    prisma.pricingSettings.findMany({
      where,
      select: pricingSettingsSelect,
      orderBy: { [orderByField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.pricingSettings.count({ where }),
  ]);

  return {
    data: pricingSettings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getPricingSettingsById(id: string) {
  return prisma.pricingSettings.findUnique({
    where: { id },
    select: pricingSettingsSelect,
  });
}

export async function getDefaultPricingSettings() {
  const defaultPlan = await prisma.pricingSettings.findFirst({
    where: {
      isDefault: true,
      isActive: true,
      archivedAt: null,
    },
    select: pricingSettingsSelect,
    orderBy: { createdAt: 'desc' },
  });

  if (defaultPlan) {
    return defaultPlan;
  }

  return prisma.pricingSettings.findFirst({
    where: {
      isActive: true,
      archivedAt: null,
    },
    select: pricingSettingsSelect,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getPricingSettingsByName(name: string) {
  return prisma.pricingSettings.findUnique({
    where: { name },
    select: pricingSettingsSelect,
  });
}

export async function createPricingSettings(input: PricingSettingsCreateInput) {
  const defaultFloorTypeMultipliers = {
    vct: 1.0,
    carpet: 1.15,
    tile: 1.1,
    hardwood: 1.2,
    concrete: 0.9,
    other: 1.0,
  };

  const defaultFrequencyMultipliers = {
    '1x_week': 1.0,
    '2x_week': 1.8,
    '3x_week': 2.5,
    '4x_week': 3.2,
    '5x_week': 4.0,
    daily: 4.33,
    weekly: 1.0,
    biweekly: 0.5,
    monthly: 0.25,
    quarterly: 0.083,
  };

  const defaultConditionMultipliers = {
    standard: 1.0,
    medium: 1.25,
    hard: 1.33,
  };

  const defaultTrafficMultipliers = {
    low: 0.9,
    medium: 1.0,
    high: 1.15,
  };

  const defaultBuildingTypeMultipliers = {
    office: 1.0,
    medical: 1.3,
    industrial: 1.15,
    retail: 1.05,
    educational: 1.1,
    warehouse: 0.9,
    residential: 1.0,
    mixed: 1.05,
    other: 1.0,
  };

  const defaultTaskComplexityAddOns = {
    standard: 0,
    sanitization: 0.15,
    biohazard: 0.5,
    high_security: 0.2,
  };

  return prisma.pricingSettings.create({
    data: {
      name: input.name,
      pricingType: input.pricingType ?? 'square_foot',
      baseRatePerSqFt: input.baseRatePerSqFt ?? 0.10,
      minimumMonthlyCharge: input.minimumMonthlyCharge ?? 250,
      hourlyRate: input.hourlyRate ?? 35.00,
      floorTypeMultipliers: input.floorTypeMultipliers ?? defaultFloorTypeMultipliers,
      frequencyMultipliers: input.frequencyMultipliers ?? defaultFrequencyMultipliers,
      conditionMultipliers: input.conditionMultipliers ?? defaultConditionMultipliers,
      trafficMultipliers: input.trafficMultipliers ?? defaultTrafficMultipliers,
      buildingTypeMultipliers: input.buildingTypeMultipliers ?? defaultBuildingTypeMultipliers,
      taskComplexityAddOns: input.taskComplexityAddOns ?? defaultTaskComplexityAddOns,
      isActive: input.isActive ?? true,
      isDefault: input.isDefault ?? false,
    },
    select: pricingSettingsSelect,
  });
}

export async function updatePricingSettings(id: string, input: PricingSettingsUpdateInput) {
  const updateData: Prisma.PricingSettingsUpdateInput = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.pricingType !== undefined) updateData.pricingType = input.pricingType;
  if (input.baseRatePerSqFt !== undefined) updateData.baseRatePerSqFt = input.baseRatePerSqFt;
  if (input.minimumMonthlyCharge !== undefined) updateData.minimumMonthlyCharge = input.minimumMonthlyCharge;
  if (input.hourlyRate !== undefined) updateData.hourlyRate = input.hourlyRate;
  if (input.floorTypeMultipliers !== undefined) updateData.floorTypeMultipliers = input.floorTypeMultipliers;
  if (input.frequencyMultipliers !== undefined) updateData.frequencyMultipliers = input.frequencyMultipliers;
  if (input.conditionMultipliers !== undefined) updateData.conditionMultipliers = input.conditionMultipliers;
  if (input.trafficMultipliers !== undefined) updateData.trafficMultipliers = input.trafficMultipliers;
  if (input.buildingTypeMultipliers !== undefined) updateData.buildingTypeMultipliers = input.buildingTypeMultipliers;
  if (input.taskComplexityAddOns !== undefined) updateData.taskComplexityAddOns = input.taskComplexityAddOns;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;
  if (input.isDefault !== undefined) updateData.isDefault = input.isDefault;

  return prisma.pricingSettings.update({
    where: { id },
    data: updateData,
    select: pricingSettingsSelect,
  });
}

export async function archivePricingSettings(id: string) {
  return prisma.pricingSettings.update({
    where: { id },
    data: {
      archivedAt: new Date(),
      isActive: false,
      isDefault: false,
    },
    select: pricingSettingsSelect,
  });
}

export async function restorePricingSettings(id: string) {
  return prisma.pricingSettings.update({
    where: { id },
    data: { archivedAt: null },
    select: pricingSettingsSelect,
  });
}

export async function deletePricingSettings(id: string) {
  return prisma.pricingSettings.delete({
    where: { id },
    select: { id: true },
  });
}

// Helper function to set the default pricing plan
export async function setDefaultPricingSettings(id: string) {
  const existing = await prisma.pricingSettings.findUnique({
    where: { id },
    select: { id: true, archivedAt: true },
  });

  if (!existing || existing.archivedAt) {
    throw new Error('Pricing plan not found');
  }

  await prisma.pricingSettings.updateMany({
    where: { isDefault: true },
    data: { isDefault: false },
  });

  return prisma.pricingSettings.update({
    where: { id },
    data: { isDefault: true, isActive: true },
    select: pricingSettingsSelect,
  });
}
