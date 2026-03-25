import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';
import type {
  ConvertResidentialQuoteInput,
  CreateResidentialPropertyInput,
  CreateResidentialPricingPlanInput,
  CreateResidentialQuoteInput,
  DeclineResidentialQuoteInput,
  ListResidentialPropertiesQuery,
  ListResidentialPricingPlansQuery,
  ListResidentialQuotesQuery,
  ResidentialPricingPlanSettings,
  ResidentialQuoteAddOnInput,
  ResidentialQuotePreviewInput,
  UpdateResidentialPropertyInput,
  UpdateResidentialPricingPlanInput,
  UpdateResidentialQuoteInput,
} from '../schemas/residential';
import type { ServiceWeekday } from './serviceScheduleService';
import {
  autoAdvanceLeadStatusForAccount,
  autoSetLeadStatusForAccount,
} from './leadService';

const PUBLIC_TOKEN_EXPIRY_DAYS = parseInt(process.env.PUBLIC_TOKEN_EXPIRY_DAYS || '30', 10);

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ResidentialQuoteAccessOptions {
  userRole?: string;
  userId?: string;
}

const residentialPropertySelect = {
  id: true,
  accountId: true,
  name: true,
  serviceAddress: true,
  homeProfile: true,
  accessNotes: true,
  parkingAccess: true,
  entryNotes: true,
  pets: true,
  isPrimary: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  account: {
    select: {
      id: true,
      name: true,
      type: true,
    },
  },
} satisfies Prisma.ResidentialPropertySelect;

const residentialPricingPlanSelect = {
  id: true,
  name: true,
  strategyKey: true,
  settings: true,
  isActive: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  createdByUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
} satisfies Prisma.ResidentialPricingPlanSelect;

const residentialQuoteListSelect = {
  id: true,
  quoteNumber: true,
  title: true,
  status: true,
  accountId: true,
  propertyId: true,
  serviceType: true,
  frequency: true,
  customerName: true,
  customerEmail: true,
  totalAmount: true,
  estimatedHours: true,
  confidenceLevel: true,
  manualReviewRequired: true,
  preferredStartDate: true,
  sentAt: true,
  acceptedAt: true,
  convertedAt: true,
  convertedContractId: true,
  createdAt: true,
  archivedAt: true,
  pricingPlan: {
    select: {
      id: true,
      name: true,
    },
  },
  account: {
    select: {
      id: true,
      name: true,
      type: true,
      accountManagerId: true,
      billingEmail: true,
      billingPhone: true,
      billingAddress: true,
      serviceAddress: true,
      residentialProfile: true,
    },
  },
  property: {
    select: {
      id: true,
      name: true,
      serviceAddress: true,
      homeProfile: true,
      accessNotes: true,
      parkingAccess: true,
      entryNotes: true,
      pets: true,
      isPrimary: true,
      status: true,
    },
  },
} satisfies Prisma.ResidentialQuoteSelect;

const residentialQuoteDetailSelect = {
  id: true,
  quoteNumber: true,
  title: true,
  status: true,
  accountId: true,
  propertyId: true,
  serviceType: true,
  frequency: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  homeAddress: true,
  homeProfile: true,
  settingsSnapshot: true,
  priceBreakdown: true,
  subtotal: true,
  addOnTotal: true,
  recurringDiscount: true,
  firstCleanSurcharge: true,
  totalAmount: true,
  estimatedHours: true,
  confidenceLevel: true,
  manualReviewRequired: true,
  manualReviewReasons: true,
  preferredStartDate: true,
  notes: true,
  publicToken: true,
  publicTokenExpiresAt: true,
  sentAt: true,
  viewedAt: true,
  acceptedAt: true,
  signatureName: true,
  signatureDate: true,
  declinedAt: true,
  declineReason: true,
  convertedAt: true,
  convertedContractId: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  pricingPlan: {
    select: {
      id: true,
      name: true,
      strategyKey: true,
      settings: true,
    },
  },
  account: {
    select: {
      id: true,
      name: true,
      type: true,
      accountManagerId: true,
      billingEmail: true,
      billingPhone: true,
      billingAddress: true,
      serviceAddress: true,
      residentialProfile: true,
    },
  },
  property: {
    select: {
      id: true,
      name: true,
      serviceAddress: true,
      homeProfile: true,
      accessNotes: true,
      parkingAccess: true,
      entryNotes: true,
      pets: true,
      isPrimary: true,
      status: true,
    },
  },
  addOns: {
    select: {
      id: true,
      code: true,
      label: true,
      description: true,
      quantity: true,
      pricingType: true,
      unitLabel: true,
      unitPrice: true,
      estimatedMinutes: true,
      lineTotal: true,
      sortOrder: true,
    },
    orderBy: {
      sortOrder: 'asc',
    },
  },
  createdByUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
} satisfies Prisma.ResidentialQuoteSelect;

const publicResidentialQuoteSelect = {
  id: true,
  quoteNumber: true,
  title: true,
  status: true,
  accountId: true,
  propertyId: true,
  serviceType: true,
  frequency: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  account: {
    select: {
      id: true,
      name: true,
      type: true,
      accountManagerId: true,
      billingEmail: true,
      billingPhone: true,
      billingAddress: true,
      serviceAddress: true,
      residentialProfile: true,
    },
  },
  property: {
    select: {
      id: true,
      name: true,
      serviceAddress: true,
      homeProfile: true,
      accessNotes: true,
      parkingAccess: true,
      entryNotes: true,
      pets: true,
      isPrimary: true,
      status: true,
    },
  },
  homeAddress: true,
  homeProfile: true,
  subtotal: true,
  addOnTotal: true,
  recurringDiscount: true,
  firstCleanSurcharge: true,
  totalAmount: true,
  estimatedHours: true,
  preferredStartDate: true,
  notes: true,
  sentAt: true,
  viewedAt: true,
  acceptedAt: true,
  declinedAt: true,
  declineReason: true,
  signatureName: true,
  signatureDate: true,
  publicTokenExpiresAt: true,
  addOns: {
    select: {
      id: true,
      code: true,
      label: true,
      description: true,
      quantity: true,
      pricingType: true,
      unitLabel: true,
      unitPrice: true,
      estimatedMinutes: true,
      lineTotal: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: 'asc' as const },
  },
  createdByUser: {
    select: {
      fullName: true,
      email: true,
    },
  },
} satisfies Prisma.ResidentialQuoteSelect;

type ResidentialPricingPlanRecord = Prisma.ResidentialPricingPlanGetPayload<{
  select: typeof residentialPricingPlanSelect;
}>;

type ResidentialQuoteDetailRecord = Prisma.ResidentialQuoteGetPayload<{
  select: typeof residentialQuoteDetailSelect;
}>;

type ResidentialQuoteListRecord = Prisma.ResidentialQuoteGetPayload<{
  select: typeof residentialQuoteListSelect;
}>;

type ResidentialPropertyRecord = Prisma.ResidentialPropertyGetPayload<{
  select: typeof residentialPropertySelect;
}>;

const frequencyEfficiencyFactors: Record<string, number> = {
  weekly: 0.92,
  biweekly: 0.96,
  every_4_weeks: 0.99,
  one_time: 1,
};

function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) {
    return fallback;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toAddressJsonValue(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return Prisma.JsonNull;
  }
  return value as Prisma.InputJsonValue;
}

function isAddressPopulated(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return Object.values(value as Record<string, unknown>).some((field) => {
    if (typeof field === 'string') {
      return field.trim().length > 0;
    }
    return field !== null && field !== undefined;
  });
}

function getWeekdayFromDate(date: Date): ServiceWeekday {
  const weekdayMap: Record<number, ServiceWeekday> = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  };

  return weekdayMap[date.getUTCDay()] ?? 'monday';
}

function mapResidentialFrequencyToContractFrequency(frequency: string): string {
  switch (frequency) {
    case 'weekly':
      return 'weekly';
    case 'biweekly':
      return 'bi_weekly';
    case 'every_4_weeks':
      return 'every_4_weeks';
    case 'one_time':
    default:
      return 'one_time';
  }
}

function buildResidentialServiceSchedule(
  frequency: string,
  startDate: Date
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (frequency === 'one_time') {
    return Prisma.JsonNull;
  }

  return {
    days: [getWeekdayFromDate(startDate)],
    allowedWindowStart: '08:00',
    allowedWindowEnd: '17:00',
    windowAnchor: 'start_day',
    timezoneSource: 'facility',
  } satisfies Prisma.InputJsonValue;
}

function getBracketAdjustment(
  brackets: ResidentialPricingPlanSettings['sqftBrackets'],
  squareFeet: number
) {
  const matched = brackets.find((bracket) => bracket.upTo === null || squareFeet <= bracket.upTo);
  return matched?.adjustment ?? 0;
}

function getSteppedRecordValue(record: Record<string, number>, value: number) {
  const direct = record[String(value)];
  if (direct !== undefined) {
    return direct;
  }

  const numericKeys = Object.keys(record)
    .map((key) => Number(key))
    .filter((key) => Number.isFinite(key))
    .sort((left, right) => left - right);

  let selectedKey = numericKeys[0] ?? 0;
  for (const key of numericKeys) {
    if (value >= key) {
      selectedKey = key;
    }
  }

  return record[String(selectedKey)] ?? 0;
}

function buildManualReviewReasons(
  input: ResidentialQuotePreviewInput,
  settings: ResidentialPricingPlanSettings,
  addOns: Array<{ requiresManualReview: boolean }>
) {
  const reasons: string[] = [];

  if (input.homeProfile.squareFeet > settings.manualReviewRules.maxAutoSqft) {
    reasons.push(`Home exceeds auto-quote size threshold of ${settings.manualReviewRules.maxAutoSqft} sqft`);
  }

  if (settings.manualReviewRules.heavyConditionRequiresReview && input.homeProfile.condition === 'heavy') {
    reasons.push('Heavy home condition requires manual review');
  }

  if (
    settings.manualReviewRules.postConstructionRequiresReview &&
    input.serviceType === 'post_construction'
  ) {
    reasons.push('Post-construction clean requires manual review');
  }

  if (input.addOns.length > settings.manualReviewRules.maxAddOnsBeforeReview) {
    reasons.push('High add-on count requires manual review');
  }

  if (addOns.some((addOn) => addOn.requiresManualReview)) {
    reasons.push('Selected add-on requires manual review');
  }

  return reasons;
}

function getConfidenceLevel(manualReviewReasons: string[], squareFeet: number, maxAutoSqft: number) {
  if (manualReviewReasons.length > 0) {
    return 'low';
  }
  if (squareFeet >= maxAutoSqft * 0.8) {
    return 'medium';
  }
  return 'high';
}

function resolveAddOnDefinitions(
  addOns: ResidentialQuoteAddOnInput[],
  settings: ResidentialPricingPlanSettings
) {
  return addOns.map((addOn, index) => {
    const definition = settings.addOnPrices[addOn.code];
    if (!definition) {
      throw new BadRequestError(`Unknown residential add-on: ${addOn.code}`);
    }

    const quantity = Math.max(1, addOn.quantity);
    const unitPrice = toNumber(definition.unitPrice);
    const lineTotal =
      definition.pricingType === 'per_unit' ? unitPrice * quantity : unitPrice;
    const estimatedMinutes =
      definition.pricingType === 'per_unit'
        ? toNumber(definition.estimatedMinutes) * quantity
        : toNumber(definition.estimatedMinutes);

    return {
      code: addOn.code,
      label: addOn.label?.trim() || addOn.code.replace(/_/g, ' '),
      description: toNullableString(definition.description),
      pricingType: definition.pricingType,
      unitLabel: toNullableString(definition.unitLabel),
      unitPrice,
      quantity,
      estimatedMinutes,
      lineTotal,
      sortOrder: index,
      requiresManualReview: Boolean(definition.requiresManualReview),
    };
  });
}

export async function listResidentialPricingPlans(
  params: ListResidentialPricingPlansQuery
): Promise<PaginatedResult<ResidentialPricingPlanRecord>> {
  const {
    page = 1,
    limit = 20,
    isActive,
    isDefault,
    includeArchived = false,
    search,
  } = params;

  const where: Prisma.ResidentialPricingPlanWhereInput = {};
  if (!includeArchived) {
    where.archivedAt = null;
  }
  if (isActive !== undefined) {
    where.isActive = isActive;
  }
  if (isDefault !== undefined) {
    where.isDefault = isDefault;
  }
  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  const [data, total] = await Promise.all([
    prisma.residentialPricingPlan.findMany({
      where,
      select: residentialPricingPlanSelect,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.residentialPricingPlan.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getResidentialPricingPlanById(id: string) {
  return prisma.residentialPricingPlan.findUnique({
    where: { id },
    select: residentialPricingPlanSelect,
  });
}

export async function getDefaultResidentialPricingPlan() {
  const defaultPlan = await prisma.residentialPricingPlan.findFirst({
    where: {
      isDefault: true,
      isActive: true,
      archivedAt: null,
    },
    select: residentialPricingPlanSelect,
    orderBy: { createdAt: 'desc' },
  });

  if (defaultPlan) {
    return defaultPlan;
  }

  return prisma.residentialPricingPlan.findFirst({
    where: {
      isActive: true,
      archivedAt: null,
    },
    select: residentialPricingPlanSelect,
    orderBy: { createdAt: 'desc' },
  });
}

export async function createResidentialPricingPlan(
  input: CreateResidentialPricingPlanInput,
  createdByUserId: string
) {
  return prisma.residentialPricingPlan.create({
    data: {
      name: input.name,
      strategyKey: input.strategyKey ?? input.settings.strategyKey,
      settings: input.settings,
      isActive: input.isActive ?? true,
      isDefault: input.isDefault ?? false,
      createdByUserId,
    },
    select: residentialPricingPlanSelect,
  });
}

export async function updateResidentialPricingPlan(
  id: string,
  input: UpdateResidentialPricingPlanInput
) {
  const updateData: Prisma.ResidentialPricingPlanUpdateInput = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.strategyKey !== undefined) updateData.strategyKey = input.strategyKey;
  if (input.settings !== undefined) updateData.settings = input.settings;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;
  if (input.isDefault !== undefined) updateData.isDefault = input.isDefault;

  return prisma.residentialPricingPlan.update({
    where: { id },
    data: updateData,
    select: residentialPricingPlanSelect,
  });
}

export async function archiveResidentialPricingPlan(id: string) {
  return prisma.residentialPricingPlan.update({
    where: { id },
    data: {
      archivedAt: new Date(),
      isActive: false,
      isDefault: false,
    },
    select: residentialPricingPlanSelect,
  });
}

export async function restoreResidentialPricingPlan(id: string) {
  return prisma.residentialPricingPlan.update({
    where: { id },
    data: { archivedAt: null },
    select: residentialPricingPlanSelect,
  });
}

export async function setDefaultResidentialPricingPlan(id: string) {
  const existing = await prisma.residentialPricingPlan.findUnique({
    where: { id },
    select: { id: true, archivedAt: true },
  });

  if (!existing || existing.archivedAt) {
    throw new NotFoundError('Residential pricing plan not found');
  }

  await prisma.residentialPricingPlan.updateMany({
    where: { isDefault: true },
    data: { isDefault: false },
  });

  return prisma.residentialPricingPlan.update({
    where: { id },
    data: { isDefault: true, isActive: true },
    select: residentialPricingPlanSelect,
  });
}

export async function listResidentialProperties(
  params: ListResidentialPropertiesQuery
): Promise<PaginatedResult<ResidentialPropertyRecord>> {
  const {
    page = 1,
    limit = 50,
    accountId,
    includeArchived = false,
    search,
    status,
  } = params;

  const where: Prisma.ResidentialPropertyWhereInput = {};
  if (!includeArchived) {
    where.archivedAt = null;
  }
  if (accountId) {
    where.accountId = accountId;
  }
  if (status) {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { account: { is: { name: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.residentialProperty.findMany({
      where,
      select: residentialPropertySelect,
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.residentialProperty.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function createResidentialProperty(
  input: CreateResidentialPropertyInput,
  createdByUserId: string
) {
  const account = await resolveResidentialAccount(input.accountId);

  return prisma.$transaction(async (tx) => {
    if (input.isPrimary) {
      await tx.residentialProperty.updateMany({
        where: { accountId: input.accountId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const property = await tx.residentialProperty.create({
      data: {
        accountId: input.accountId,
        name: input.name.trim(),
        serviceAddress: (input.serviceAddress ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        homeProfile: input.homeProfile as Prisma.InputJsonValue,
        accessNotes: toNullableString(input.accessNotes),
        parkingAccess: toNullableString(input.parkingAccess),
        entryNotes: toNullableString(input.entryNotes),
        pets: input.pets ?? null,
        isPrimary: Boolean(input.isPrimary),
        status: input.status ?? 'active',
        createdByUserId,
      },
      select: residentialPropertySelect,
    });

    if (property.isPrimary) {
      await tx.account.update({
        where: { id: account.id },
        data: {
          serviceAddress: (input.serviceAddress ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          residentialProfile: input.homeProfile as Prisma.InputJsonValue,
        },
      });
    }

    return property;
  });
}

export async function updateResidentialProperty(id: string, input: UpdateResidentialPropertyInput) {
  const existing = await resolveResidentialProperty(id);

  return prisma.$transaction(async (tx) => {
    if (input.isPrimary) {
      await tx.residentialProperty.updateMany({
        where: { accountId: existing.accountId, isPrimary: true, id: { not: id } },
        data: { isPrimary: false },
      });
    }

    const property = await tx.residentialProperty.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.serviceAddress !== undefined
          ? { serviceAddress: (input.serviceAddress ?? Prisma.JsonNull) as Prisma.InputJsonValue }
          : {}),
        ...(input.homeProfile !== undefined
          ? { homeProfile: input.homeProfile as Prisma.InputJsonValue }
          : {}),
        ...(input.accessNotes !== undefined ? { accessNotes: toNullableString(input.accessNotes) } : {}),
        ...(input.parkingAccess !== undefined ? { parkingAccess: toNullableString(input.parkingAccess) } : {}),
        ...(input.entryNotes !== undefined ? { entryNotes: toNullableString(input.entryNotes) } : {}),
        ...(input.pets !== undefined ? { pets: input.pets } : {}),
        ...(input.isPrimary !== undefined ? { isPrimary: input.isPrimary } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.status === 'archived' ? { archivedAt: new Date() } : {}),
        ...(input.status === 'active' ? { archivedAt: null } : {}),
      },
      select: residentialPropertySelect,
    });

    if (property.isPrimary) {
      await tx.account.update({
        where: { id: property.accountId },
        data: {
          serviceAddress: (property.serviceAddress ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          residentialProfile: property.homeProfile as Prisma.InputJsonValue,
        },
      });
    }

    return property;
  });
}

async function resolveResidentialPricingPlan(pricingPlanId?: string | null) {
  if (pricingPlanId) {
    const plan = await prisma.residentialPricingPlan.findUnique({
      where: { id: pricingPlanId },
      select: residentialPricingPlanSelect,
    });
    if (!plan || plan.archivedAt || !plan.isActive) {
      throw new BadRequestError('Residential pricing plan is not available');
    }
    return plan;
  }

  const defaultPlan = await getDefaultResidentialPricingPlan();
  if (!defaultPlan) {
    throw new BadRequestError('No active residential pricing plan found');
  }
  return defaultPlan;
}

async function resolveResidentialAccount(accountId: string) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      name: true,
      type: true,
      accountManagerId: true,
      billingEmail: true,
      billingPhone: true,
      billingAddress: true,
      serviceAddress: true,
      residentialProfile: true,
      archivedAt: true,
    },
  });

  if (!account || account.archivedAt) {
    throw new BadRequestError('Residential account is not available');
  }
  if (account.type !== 'residential') {
    throw new BadRequestError('Residential quotes require a residential account');
  }

  return account;
}

async function resolveResidentialProperty(propertyId: string, accountId?: string) {
  const property = await prisma.residentialProperty.findUnique({
    where: { id: propertyId },
    select: residentialPropertySelect,
  });

  if (!property || property.archivedAt || property.status !== 'active') {
    throw new BadRequestError('Residential property is not available');
  }

  if (property.account.type !== 'residential') {
    throw new BadRequestError('Residential properties must belong to a residential account');
  }

  if (accountId && property.accountId !== accountId) {
    throw new BadRequestError('Residential property does not belong to the selected account');
  }

  return property;
}

async function ensureResidentialFacility(input: {
  accountId: string;
  propertyId: string;
  propertyName: string;
  accountName: string;
  createdByUserId: string;
  homeAddress: unknown;
  homeProfile: unknown;
}) {
  if (!isAddressPopulated(input.homeAddress)) {
    throw new BadRequestError('Residential service address is required before contract conversion');
  }

  const homeProfile =
    input.homeProfile && typeof input.homeProfile === 'object' && !Array.isArray(input.homeProfile)
      ? (input.homeProfile as Record<string, unknown>)
      : {};
  const facilityName = input.propertyName.trim() || `${input.accountName} Residence`;

  const existingFacility = await prisma.facility.findFirst({
    where: {
      residentialPropertyId: input.propertyId,
      archivedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (existingFacility) {
    const updated = await prisma.facility.update({
      where: { id: existingFacility.id },
      data: {
        name: facilityName,
        residentialPropertyId: input.propertyId,
        address: input.homeAddress as Prisma.InputJsonValue,
        buildingType: toNullableString(homeProfile.homeType) ?? 'residential',
        accessInstructions: toNullableString(homeProfile.entryNotes),
        parkingInfo: toNullableString(homeProfile.parkingAccess),
        specialRequirements: toNullableString(homeProfile.specialInstructions),
      },
      select: {
        id: true,
        name: true,
      },
    });

    return updated;
  }

  return prisma.facility.create({
    data: {
      accountId: input.accountId,
      residentialPropertyId: input.propertyId,
      name: facilityName,
      address: input.homeAddress as Prisma.InputJsonValue,
      buildingType: toNullableString(homeProfile.homeType) ?? 'residential',
      accessInstructions: toNullableString(homeProfile.entryNotes),
      parkingInfo: toNullableString(homeProfile.parkingAccess),
      specialRequirements: toNullableString(homeProfile.specialInstructions),
      createdByUserId: input.createdByUserId,
    },
    select: {
      id: true,
      name: true,
    },
  });
}

function applyResidentialQuoteAccessWhere(
  where: Prisma.ResidentialQuoteWhereInput,
  access: ResidentialQuoteAccessOptions = {}
) {
  if (access.userRole === 'manager' && access.userId) {
    where.account = {
      is: {
        accountManagerId: access.userId,
      },
    };
  }
}

export async function previewResidentialQuote(input: ResidentialQuotePreviewInput) {
  const plan = await resolveResidentialPricingPlan(input.pricingPlanId);
  return calculateResidentialQuotePreview(input, plan);
}

export function calculateResidentialQuotePreview(
  input: ResidentialQuotePreviewInput,
  pricingPlan: ResidentialPricingPlanRecord
) {
  const settings = pricingPlan.settings as ResidentialPricingPlanSettings;
  const { homeProfile } = input;

  const baseHomePrice = settings.homeTypeBasePrices[homeProfile.homeType];
  const sqftAdjustment = getBracketAdjustment(settings.sqftBrackets, homeProfile.squareFeet);
  const bedroomAdjustment = getSteppedRecordValue(
    settings.bedroomAdjustments,
    homeProfile.bedrooms
  );
  const bathroomAdjustment =
    homeProfile.fullBathrooms * settings.bathroomAdjustments.fullBath +
    homeProfile.halfBathrooms * settings.bathroomAdjustments.halfBath;
  const levelAdjustment = getSteppedRecordValue(
    settings.levelAdjustments,
    homeProfile.levels
  );

  const baseSubtotal =
    baseHomePrice + sqftAdjustment + bedroomAdjustment + bathroomAdjustment + levelAdjustment;
  const conditionMultiplier = settings.conditionMultipliers[homeProfile.condition];
  const serviceMultiplier = settings.serviceTypeMultipliers[input.serviceType];
  const serviceSubtotal = baseSubtotal * conditionMultiplier * serviceMultiplier;
  const recurringDiscount =
    input.frequency === 'one_time'
      ? 0
      : serviceSubtotal * settings.frequencyDiscounts[input.frequency];

  const firstCleanSurchargeEnabled =
    settings.firstCleanSurcharge.enabled &&
    homeProfile.isFirstVisit &&
    settings.firstCleanSurcharge.appliesTo.includes(input.serviceType);
  const firstCleanSurcharge = firstCleanSurchargeEnabled
    ? settings.firstCleanSurcharge.type === 'flat'
      ? settings.firstCleanSurcharge.value
      : serviceSubtotal * settings.firstCleanSurcharge.value
    : 0;

  const addOns = resolveAddOnDefinitions(input.addOns, settings);
  const addOnTotal = addOns.reduce((sum, addOn) => sum + addOn.lineTotal, 0);

  const totalBeforeMinimum =
    serviceSubtotal - recurringDiscount + firstCleanSurcharge + addOnTotal;
  const minimumApplied = totalBeforeMinimum < settings.minimumPrice;
  const finalTotal = Math.max(totalBeforeMinimum, settings.minimumPrice);

  const estimatedMinutes =
    settings.estimatedHours.baseHoursByHomeType[homeProfile.homeType] * 60 +
    (homeProfile.squareFeet / 1000) * settings.estimatedHours.minutesPer1000SqFt +
    homeProfile.bedrooms * settings.estimatedHours.minutesPerBedroom +
    homeProfile.fullBathrooms * settings.estimatedHours.minutesPerFullBath +
    homeProfile.halfBathrooms * settings.estimatedHours.minutesPerHalfBath +
    addOns.reduce((sum, addOn) => sum + addOn.estimatedMinutes, 0);

  const estimatedHours =
    (estimatedMinutes / 60) *
    settings.estimatedHours.conditionMultipliers[homeProfile.condition] *
    settings.estimatedHours.serviceTypeMultipliers[input.serviceType] *
    (frequencyEfficiencyFactors[input.frequency] ?? 1);

  const manualReviewReasons = buildManualReviewReasons(input, settings, addOns);
  const confidenceLevel = getConfidenceLevel(
    manualReviewReasons,
    homeProfile.squareFeet,
    settings.manualReviewRules.maxAutoSqft
  );

  return {
    pricingPlan: {
      id: pricingPlan.id,
      name: pricingPlan.name,
      strategyKey: pricingPlan.strategyKey,
    },
    breakdown: {
      baseHomePrice,
      sqftAdjustment,
      bedroomAdjustment,
      bathroomAdjustment,
      levelAdjustment,
      baseSubtotal,
      conditionMultiplier,
      serviceMultiplier,
      serviceSubtotal,
      recurringDiscount,
      firstCleanSurcharge,
      addOnTotal,
      minimumApplied,
      minimumPrice: settings.minimumPrice,
      totalBeforeMinimum,
      finalTotal,
      estimatedHours: Number(estimatedHours.toFixed(2)),
      confidenceLevel,
      manualReviewRequired: manualReviewReasons.length > 0,
      manualReviewReasons,
      addOns: addOns.map((addOn) => ({
        code: addOn.code,
        label: addOn.label,
        pricingType: addOn.pricingType,
        quantity: addOn.quantity,
        unitLabel: addOn.unitLabel,
        unitPrice: addOn.unitPrice,
        estimatedMinutes: addOn.estimatedMinutes,
        lineTotal: addOn.lineTotal,
      })),
      guidance: [
        `${homeProfile.fullBathrooms} full bath${homeProfile.fullBathrooms === 1 ? '' : 's'} drives a ${bathroomAdjustment.toFixed(0)} price adjustment.`,
        input.frequency === 'one_time'
          ? 'One-time service keeps the full per-visit rate.'
          : `${input.frequency.replace(/_/g, ' ')} frequency applies a ${Math.round(
              settings.frequencyDiscounts[input.frequency] * 100
            )}% recurring discount.`,
        minimumApplied
          ? `Minimum price floor of ${settings.minimumPrice.toFixed(0)} applied to protect margin.`
          : 'Quote remains above the current minimum price floor.',
      ],
    },
    settingsSnapshot: settings,
  };
}

async function generateResidentialQuoteNumber() {
  const date = new Date();
  const prefix = `RQ-${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(
    date.getUTCDate()
  ).padStart(2, '0')}`;

  const latest = await prisma.residentialQuote.findFirst({
    where: {
      quoteNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      quoteNumber: 'desc',
    },
    select: {
      quoteNumber: true,
    },
  });

  let sequence = 1;
  if (latest) {
    const parts = latest.quoteNumber.split('-');
    const lastSequence = parseInt(parts[2] || '0', 10);
    if (Number.isFinite(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }

  return `${prefix}-${String(sequence).padStart(4, '0')}`;
}

export async function listResidentialQuotes(
  params: ListResidentialQuotesQuery,
  access: ResidentialQuoteAccessOptions = {}
): Promise<PaginatedResult<ResidentialQuoteListRecord>> {
  const {
    page = 1,
    limit = 20,
    accountId,
    propertyId,
    status,
    includeArchived = false,
    search,
  } = params;

  const where: Prisma.ResidentialQuoteWhereInput = {};
  if (!includeArchived) {
    where.archivedAt = null;
  }
  if (status) {
    where.status = status;
  }
  if (accountId) {
    where.accountId = accountId;
  }
  if (propertyId) {
    where.propertyId = propertyId;
  }
  if (search) {
    where.OR = [
      { quoteNumber: { contains: search, mode: 'insensitive' } },
      { title: { contains: search, mode: 'insensitive' } },
      { customerName: { contains: search, mode: 'insensitive' } },
      { customerEmail: { contains: search, mode: 'insensitive' } },
    ];
  }

  applyResidentialQuoteAccessWhere(where, access);

  const [data, total] = await Promise.all([
    prisma.residentialQuote.findMany({
      where,
      select: residentialQuoteListSelect,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.residentialQuote.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getResidentialQuoteById(id: string, access: ResidentialQuoteAccessOptions = {}) {
  const where: Prisma.ResidentialQuoteWhereInput = { id };
  applyResidentialQuoteAccessWhere(where, access);
  return prisma.residentialQuote.findFirst({
    where,
    select: residentialQuoteDetailSelect,
  });
}

function buildResidentialQuoteUpsertData(
  input: CreateResidentialQuoteInput,
  preview: ReturnType<typeof calculateResidentialQuotePreview>,
  pricingPlanId: string | null
) {
  return {
    accountId: input.accountId,
    propertyId: input.propertyId,
    title: input.title,
    serviceType: input.serviceType,
    frequency: input.frequency,
    customerName: input.customerName,
    customerEmail: toNullableString(input.customerEmail),
    customerPhone: toNullableString(input.customerPhone),
    homeAddress: input.homeAddress ?? Prisma.JsonNull,
    homeProfile: input.homeProfile as Prisma.InputJsonValue,
    pricingPlanId,
    settingsSnapshot: preview.settingsSnapshot as Prisma.InputJsonValue,
    priceBreakdown: preview.breakdown as Prisma.InputJsonValue,
    subtotal: preview.breakdown.serviceSubtotal,
    addOnTotal: preview.breakdown.addOnTotal,
    recurringDiscount: preview.breakdown.recurringDiscount,
    firstCleanSurcharge: preview.breakdown.firstCleanSurcharge,
    totalAmount: preview.breakdown.finalTotal,
    estimatedHours: preview.breakdown.estimatedHours,
    confidenceLevel: preview.breakdown.confidenceLevel,
    manualReviewRequired: preview.breakdown.manualReviewRequired,
    manualReviewReasons: preview.breakdown.manualReviewReasons as Prisma.InputJsonValue,
    preferredStartDate: input.preferredStartDate ?? null,
    notes: toNullableString(input.notes),
  } satisfies Omit<Prisma.ResidentialQuoteUncheckedCreateInput, 'quoteNumber' | 'createdByUserId'>;
}

async function syncResidentialPropertyProfileFromQuote(
  input: CreateResidentialQuoteInput,
  property: ResidentialPropertyRecord
) {
  await prisma.$transaction(async (tx) => {
    await tx.account.update({
      where: { id: input.accountId },
      data: {
        billingEmail: toNullableString(input.customerEmail),
        billingPhone: toNullableString(input.customerPhone),
        ...(property.isPrimary
          ? {
              serviceAddress: (input.homeAddress ?? Prisma.JsonNull) as Prisma.InputJsonValue,
              residentialProfile: input.homeProfile as Prisma.InputJsonValue,
            }
          : {}),
      },
    });

    await tx.residentialProperty.update({
      where: { id: property.id },
      data: {
        serviceAddress: (input.homeAddress ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        homeProfile: input.homeProfile as Prisma.InputJsonValue,
        parkingAccess: toNullableString(input.homeProfile.parkingAccess),
        entryNotes: toNullableString(input.homeProfile.entryNotes),
        pets: input.homeProfile.hasPets ?? null,
      },
    });
  });
}

export async function createResidentialQuote(
  input: CreateResidentialQuoteInput,
  createdByUserId: string
) {
  await resolveResidentialAccount(input.accountId);
  const property = await resolveResidentialProperty(input.propertyId, input.accountId);
  const pricingPlan = await resolveResidentialPricingPlan(input.pricingPlanId);
  const preview = calculateResidentialQuotePreview(input, pricingPlan);
  const quoteNumber = await generateResidentialQuoteNumber();

  await syncResidentialPropertyProfileFromQuote(input, property);

  return prisma.residentialQuote.create({
    data: {
      quoteNumber,
      ...buildResidentialQuoteUpsertData(input, preview, pricingPlan.id),
      createdByUserId,
      status: preview.breakdown.manualReviewRequired ? 'review_required' : 'draft',
      addOns: {
        create: preview.breakdown.addOns.map((addOn, index) => ({
          code: addOn.code,
          label: addOn.label,
          description: null,
          quantity: addOn.quantity,
          pricingType: addOn.pricingType,
          unitLabel: addOn.unitLabel,
          unitPrice: addOn.unitPrice,
          estimatedMinutes: addOn.estimatedMinutes,
          lineTotal: addOn.lineTotal,
          sortOrder: index,
        })),
      },
    },
    select: residentialQuoteDetailSelect,
  });
}

export async function updateResidentialQuote(id: string, input: UpdateResidentialQuoteInput) {
  const existing = await prisma.residentialQuote.findUnique({
    where: { id },
    select: residentialQuoteDetailSelect,
  });

  if (!existing) {
    throw new NotFoundError('Residential quote not found');
  }

  if (existing.status === 'converted') {
    throw new BadRequestError('Converted residential quotes cannot be edited');
  }

  const mergedInput: CreateResidentialQuoteInput = {
    accountId: input.accountId ?? existing.accountId ?? '',
    propertyId: input.propertyId ?? existing.propertyId,
    title: input.title ?? existing.title,
    serviceType: (input.serviceType ?? existing.serviceType) as CreateResidentialQuoteInput['serviceType'],
    frequency: (input.frequency ?? existing.frequency) as CreateResidentialQuoteInput['frequency'],
    customerName: input.customerName ?? existing.customerName,
    customerEmail: input.customerEmail ?? existing.customerEmail,
    customerPhone: input.customerPhone ?? existing.customerPhone,
    homeAddress: (input.homeAddress ?? (existing.homeAddress as any)) ?? null,
    homeProfile: (input.homeProfile ?? (existing.homeProfile as any)) as CreateResidentialQuoteInput['homeProfile'],
    pricingPlanId: input.pricingPlanId ?? existing.pricingPlan?.id ?? null,
    addOns:
      input.addOns ??
      existing.addOns.map((addOn) => ({
        code: addOn.code,
        quantity: addOn.quantity,
        label: addOn.label,
      })),
    preferredStartDate: input.preferredStartDate ?? existing.preferredStartDate,
    notes: input.notes ?? existing.notes,
  };

  await resolveResidentialAccount(mergedInput.accountId);
  const property = await resolveResidentialProperty(
    input.propertyId ?? existing.propertyId,
    mergedInput.accountId
  );
  const pricingPlan = await resolveResidentialPricingPlan(mergedInput.pricingPlanId);
  const preview = calculateResidentialQuotePreview(mergedInput, pricingPlan);
  const nextStatus =
    input.status ??
    (existing.status === 'declined'
      ? (preview.breakdown.manualReviewRequired ? 'review_required' : 'draft')
      : existing.status);

  const resolvedStatus = (() => {
    if (input.status) {
      return input.status;
    }

    if (preview.breakdown.manualReviewRequired) {
      if (nextStatus === 'review_approved' || nextStatus === 'sent' || nextStatus === 'viewed' || nextStatus === 'accepted' || nextStatus === 'converted') {
        return nextStatus;
      }
      return 'review_required';
    }

    if (nextStatus === 'review_required' || nextStatus === 'review_approved') {
      return 'draft';
    }

    return nextStatus;
  })();

  await syncResidentialPropertyProfileFromQuote(
    {
      ...mergedInput,
      propertyId: property.id,
    },
    property
  );

  return prisma.residentialQuote.update({
    where: { id },
    data: {
      ...buildResidentialQuoteUpsertData(mergedInput, preview, pricingPlan.id),
      status: resolvedStatus,
      addOns: {
        deleteMany: {},
        create: preview.breakdown.addOns.map((addOn, index) => ({
          code: addOn.code,
          label: addOn.label,
          description: null,
          quantity: addOn.quantity,
          pricingType: addOn.pricingType,
          unitLabel: addOn.unitLabel,
          unitPrice: addOn.unitPrice,
          estimatedMinutes: addOn.estimatedMinutes,
          lineTotal: addOn.lineTotal,
          sortOrder: index,
        })),
      },
    },
    select: residentialQuoteDetailSelect,
  });
}

export async function sendResidentialQuote(id: string) {
  const quote = await getResidentialQuoteById(id);
  if (!quote) {
    throw new NotFoundError('Residential quote not found');
  }

  if (quote.status === 'converted') {
    throw new BadRequestError('Converted residential quotes cannot be sent');
  }

  if (quote.manualReviewRequired && quote.status !== 'review_approved' && quote.status !== 'sent' && quote.status !== 'viewed') {
    throw new BadRequestError('This residential quote requires internal approval before it can be sent');
  }

  const updatedQuote = await prisma.residentialQuote.update({
    where: { id },
    data: {
      status: 'sent',
      sentAt: new Date(),
    },
    select: residentialQuoteDetailSelect,
  });

  if (updatedQuote.accountId) {
    await autoAdvanceLeadStatusForAccount(updatedQuote.accountId, 'proposal_sent');
  }

  return updatedQuote;
}

export async function approveResidentialQuoteReview(id: string) {
  const quote = await getResidentialQuoteById(id);
  if (!quote) {
    throw new NotFoundError('Residential quote not found');
  }

  if (!quote.manualReviewRequired) {
    throw new BadRequestError('This residential quote does not require manual review');
  }

  if (quote.status === 'converted') {
    throw new BadRequestError('Converted residential quotes cannot be approved');
  }

  return prisma.residentialQuote.update({
    where: { id },
    data: {
      status: 'review_approved',
    },
    select: residentialQuoteDetailSelect,
  });
}

export async function generateResidentialQuotePublicToken(id: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + PUBLIC_TOKEN_EXPIRY_DAYS);

  await prisma.residentialQuote.update({
    where: { id },
    data: {
      publicToken: token,
      publicTokenExpiresAt: expiresAt,
    },
  });

  return token;
}

export async function getResidentialQuoteByPublicToken(token: string) {
  const quote = await prisma.residentialQuote.findUnique({
    where: { publicToken: token },
    select: publicResidentialQuoteSelect,
  });

  if (!quote) return null;
  if (quote.publicTokenExpiresAt && new Date() > quote.publicTokenExpiresAt) {
    return null;
  }

  return quote;
}

export async function markResidentialQuotePublicViewed(token: string, _ipAddress?: string) {
  const quote = await prisma.residentialQuote.findUnique({
    where: { publicToken: token },
    select: {
      id: true,
      status: true,
      viewedAt: true,
      publicTokenExpiresAt: true,
    },
  });

  if (!quote) return null;
  if (quote.publicTokenExpiresAt && new Date() > quote.publicTokenExpiresAt) {
    return null;
  }

  if (!quote.viewedAt) {
    const updated = await prisma.residentialQuote.update({
      where: { id: quote.id },
      data: {
        status: quote.status === 'sent' ? 'viewed' : quote.status,
        viewedAt: new Date(),
      },
      select: { id: true },
    });
    return { ...updated, newlyViewed: true };
  }

  return { id: quote.id, newlyViewed: false };
}

export async function acceptResidentialQuotePublic(
  token: string,
  signatureName: string,
  ipAddress?: string
) {
  const quote = await prisma.residentialQuote.findUnique({
    where: { publicToken: token },
    select: {
      id: true,
      status: true,
      publicTokenExpiresAt: true,
    },
  });

  if (!quote) throw new BadRequestError('Residential quote not found');
  if (quote.publicTokenExpiresAt && new Date() > quote.publicTokenExpiresAt) {
    throw new BadRequestError('This residential quote link has expired');
  }
  if (!['sent', 'viewed', 'accepted'].includes(quote.status)) {
    throw new BadRequestError('This residential quote can no longer be accepted');
  }

  const acceptedNow = quote.status !== 'accepted';
  if (acceptedNow) {
    await prisma.residentialQuote.update({
      where: { id: quote.id },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
        signatureName,
        signatureDate: new Date(),
        signatureIp: ipAddress ?? null,
        declinedAt: null,
        declineReason: null,
      },
    });

    const fullQuote = await prisma.residentialQuote.findUnique({
      where: { id: quote.id },
      select: { accountId: true },
    });
    if (fullQuote?.accountId) {
      await autoAdvanceLeadStatusForAccount(fullQuote.accountId, 'negotiation');
    }
  }

  const resolvedQuote = await prisma.residentialQuote.findUniqueOrThrow({
    where: { id: quote.id },
    select: publicResidentialQuoteSelect,
  });

  return { quote: resolvedQuote, acceptedNow };
}

export async function declineResidentialQuotePublic(
  token: string,
  reason: string,
  _ipAddress?: string
) {
  const quote = await prisma.residentialQuote.findUnique({
    where: { publicToken: token },
    select: {
      id: true,
      status: true,
      publicTokenExpiresAt: true,
    },
  });

  if (!quote) throw new BadRequestError('Residential quote not found');
  if (quote.publicTokenExpiresAt && new Date() > quote.publicTokenExpiresAt) {
    throw new BadRequestError('This residential quote link has expired');
  }
  if (!['sent', 'viewed', 'declined'].includes(quote.status)) {
    throw new BadRequestError('This residential quote can no longer be declined');
  }

  const declinedNow = quote.status !== 'declined';
  if (declinedNow) {
    await prisma.residentialQuote.update({
      where: { id: quote.id },
      data: {
        status: 'declined',
        declinedAt: new Date(),
        declineReason: reason,
      },
    });
  }

  const resolvedQuote = await prisma.residentialQuote.findUniqueOrThrow({
    where: { id: quote.id },
    select: publicResidentialQuoteSelect,
  });

  return { quote: resolvedQuote, declinedNow };
}

export async function acceptResidentialQuote(id: string) {
  const quote = await getResidentialQuoteById(id);
  if (!quote) {
    throw new NotFoundError('Residential quote not found');
  }

  if (!['draft', 'quoted', 'review_required', 'review_approved', 'sent', 'viewed'].includes(quote.status)) {
    throw new BadRequestError('Residential quote cannot be accepted from its current status');
  }

  const updatedQuote = await prisma.residentialQuote.update({
    where: { id },
    data: {
      status: 'accepted',
      acceptedAt: new Date(),
      declinedAt: null,
      declineReason: null,
    },
    select: residentialQuoteDetailSelect,
  });

  if (updatedQuote.accountId) {
    await autoAdvanceLeadStatusForAccount(updatedQuote.accountId, 'negotiation');
  }

  return updatedQuote;
}

export async function declineResidentialQuote(
  id: string,
  input: DeclineResidentialQuoteInput
) {
  const quote = await getResidentialQuoteById(id);
  if (!quote) {
    throw new NotFoundError('Residential quote not found');
  }

  if (quote.status === 'converted') {
    throw new BadRequestError('Converted residential quotes cannot be declined');
  }

  const updatedQuote = await prisma.residentialQuote.update({
    where: { id },
    data: {
      status: 'declined',
      declinedAt: new Date(),
      declineReason: toNullableString(input.reason),
    },
    select: residentialQuoteDetailSelect,
  });

  if (updatedQuote.accountId) {
    await autoSetLeadStatusForAccount(updatedQuote.accountId, 'lost');
  }

  return updatedQuote;
}

export async function archiveResidentialQuote(id: string) {
  return prisma.residentialQuote.update({
    where: { id },
    data: {
      archivedAt: new Date(),
    },
    select: residentialQuoteDetailSelect,
  });
}

export async function restoreResidentialQuote(id: string) {
  return prisma.residentialQuote.update({
    where: { id },
    data: {
      archivedAt: null,
    },
    select: residentialQuoteDetailSelect,
  });
}

async function generateContractNumber() {
  const now = new Date();
  const prefix = `CONT-${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

  const latest = await prisma.contract.findFirst({
    where: {
      contractNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      contractNumber: 'desc',
    },
    select: {
      contractNumber: true,
    },
  });

  let sequence = 1;
  if (latest) {
    const lastSequence = parseInt(latest.contractNumber.split('-')[2] || '0', 10);
    if (Number.isFinite(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }

  return `${prefix}-${String(sequence).padStart(4, '0')}`;
}

export async function convertResidentialQuoteToContract(
  id: string,
  input: ConvertResidentialQuoteInput,
  userId: string
) {
  const quote = await getResidentialQuoteById(id);
  if (!quote) {
    throw new NotFoundError('Residential quote not found');
  }

  if (quote.status !== 'accepted') {
    throw new BadRequestError('Residential quote must be accepted before conversion');
  }

  if (quote.convertedContractId) {
    const existingContract = await prisma.contract.findUnique({
      where: { id: quote.convertedContractId },
      select: { id: true, contractNumber: true },
    });
    if (existingContract) {
      return existingContract;
    }
  }

  let account =
    quote.accountId
      ? await prisma.account.findUnique({
          where: { id: quote.accountId },
          select: {
            id: true,
            name: true,
            type: true,
            serviceAddress: true,
            residentialProfile: true,
          },
        })
      : null;

  if (!account) {
    const accountNameBase = `${quote.customerName} Residence`;
    account = await prisma.account.create({
      data: {
        name: accountNameBase,
        type: 'residential',
        billingEmail: quote.customerEmail,
        billingPhone: quote.customerPhone,
        billingAddress: toAddressJsonValue(quote.homeAddress),
        serviceAddress: toAddressJsonValue(quote.homeAddress),
        residentialProfile: (quote.homeProfile as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        paymentTerms: input.paymentTerms,
        createdByUserId: userId,
      },
      select: {
        id: true,
        name: true,
        type: true,
        serviceAddress: true,
        residentialProfile: true,
      },
    });
  }

  if (account.type !== 'residential') {
    throw new BadRequestError('Residential quotes can only convert against residential accounts');
  }

  const property = quote.propertyId
    ? await resolveResidentialProperty(quote.propertyId, account.id)
    : null;

  if (!property) {
    throw new BadRequestError('Residential quote must be linked to an active residential property');
  }

  const resolvedHomeAddress =
    quote.homeAddress ?? property.serviceAddress ?? account.serviceAddress ?? null;
  const resolvedHomeProfile =
    quote.homeProfile ?? property.homeProfile ?? account.residentialProfile ?? null;
  const facility = await ensureResidentialFacility({
    accountId: account.id,
    propertyId: property.id,
    propertyName: property.name,
    accountName: account.name,
    createdByUserId: userId,
    homeAddress: resolvedHomeAddress,
    homeProfile: resolvedHomeProfile,
  });

  if (quote.customerEmail || quote.customerPhone) {
    const primaryContact = await prisma.contact.findFirst({
      where: {
        accountId: account.id,
        OR: [
          ...(quote.customerEmail ? [{ email: quote.customerEmail }] : []),
          ...(quote.customerPhone ? [{ phone: quote.customerPhone }, { mobile: quote.customerPhone }] : []),
        ],
      },
      select: { id: true },
    });

    if (!primaryContact) {
      await prisma.contact.create({
        data: {
          accountId: account.id,
          name: quote.customerName,
          email: quote.customerEmail,
          phone: quote.customerPhone,
          mobile: quote.customerPhone,
          isPrimary: true,
          isBilling: true,
          createdByUserId: userId,
          notes: `Created from residential quote ${quote.quoteNumber}`,
        },
      });
    }
  }

  const contractNumber = await generateContractNumber();
  const startDate = input.startDate ?? quote.preferredStartDate ?? new Date();
  const mappedFrequency = mapResidentialFrequencyToContractFrequency(quote.frequency);
  const serviceSchedule = buildResidentialServiceSchedule(mappedFrequency, startDate);
  const contract = await prisma.contract.create({
    data: {
      contractNumber,
      title: input.title ?? quote.title,
      status: 'draft',
      serviceCategory: 'residential',
      accountId: account.id,
      residentialPropertyId: property.id,
      facilityId: facility.id,
      startDate,
      serviceFrequency: mappedFrequency,
      serviceSchedule,
      monthlyValue: quote.totalAmount,
      totalValue: quote.totalAmount,
      billingCycle: 'monthly',
      paymentTerms: input.paymentTerms,
      createdByUserId: userId,
      residentialServiceType: quote.serviceType,
      residentialFrequency: quote.frequency,
      homeProfileSnapshot: (quote.homeProfile as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      quoteSourceType: 'residential_quote',
      quoteSourceId: quote.id,
      specialInstructions: quote.notes,
    },
    select: {
      id: true,
      contractNumber: true,
    },
  });

  await prisma.residentialQuote.update({
    where: { id: quote.id },
    data: {
      status: 'converted',
      convertedAt: new Date(),
      convertedContractId: contract.id,
    },
  });

  return contract;
}
