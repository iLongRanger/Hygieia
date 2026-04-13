import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { calculateFacilityPricing, type FacilityPricingScopeOverride } from './pricingCalculatorService';
import {
  calculatePerHourPricing,
  type PerHourPricingScopeOverride,
} from './pricing/perHourCalculatorService';
import { resolvePricingPlan } from './pricing/strategyRegistry';
import { normalizeServiceSchedule } from './serviceScheduleService';
import type {
  CreateContractAmendmentInput,
  RecalculateContractAmendmentInput,
  UpdateContractAmendmentInput,
} from '../schemas/contract';

const OPEN_AMENDMENT_STATUSES = ['draft', 'submitted', 'approved', 'sent', 'viewed', 'signed'] as const;

const amendmentListSelect = {
  id: true,
  contractId: true,
  amendmentNumber: true,
  status: true,
  amendmentType: true,
  title: true,
  summary: true,
  reason: true,
  effectiveDate: true,
  pricingPlanId: true,
  oldMonthlyValue: true,
  newMonthlyValue: true,
  monthlyDelta: true,
  oldServiceFrequency: true,
  newServiceFrequency: true,
  approvedAt: true,
  sentAt: true,
  viewedAt: true,
  publicToken: true,
  publicTokenExpiresAt: true,
  signedDate: true,
  signedByName: true,
  signedByEmail: true,
  appliedAt: true,
  canceledAt: true,
  rejectedAt: true,
  rejectedReason: true,
  createdAt: true,
  updatedAt: true,
  createdByUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  approvedByUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  appliedByUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
} satisfies Prisma.ContractAmendmentSelect;

const amendmentDetailSelect = {
  ...amendmentListSelect,
  oldServiceSchedule: true,
  newServiceSchedule: true,
  pricingSnapshot: true,
  snapshots: {
    select: {
      id: true,
      snapshotType: true,
      scopeJson: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
  activities: {
    select: {
      id: true,
      action: true,
      metadata: true,
      createdAt: true,
      performedByUser: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.ContractAmendmentSelect;

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) return null;
  return Number(value);
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function buildAreaMatchKey(input: {
  areaTypeId?: string | null;
  name?: string | null;
}) {
  return `${input.areaTypeId ?? ''}::${normalizeText(input.name)}`;
}

function buildTaskMatchKey(input: {
  areaId?: string | null;
  taskTemplateId?: string | null;
  customName?: string | null;
  cleaningFrequency?: string | null;
}) {
  return [
    input.areaId ?? '',
    input.taskTemplateId ?? '',
    normalizeText(input.customName),
    normalizeText(input.cleaningFrequency),
  ].join('::');
}

function mapAmendment<
  T extends {
    oldMonthlyValue: Prisma.Decimal | number | null | undefined;
    newMonthlyValue: Prisma.Decimal | number | null | undefined;
    monthlyDelta: Prisma.Decimal | number | null | undefined;
  },
>(amendment: T) {
  return {
    ...amendment,
    oldMonthlyValue: toNumber(amendment.oldMonthlyValue),
    newMonthlyValue: toNumber(amendment.newMonthlyValue),
    monthlyDelta: toNumber(amendment.monthlyDelta),
  };
}

interface AmendmentWorkingScope {
  facility?: {
    id?: string;
    name?: string;
    buildingType?: string | null;
  } | null;
  areas?: Record<string, unknown>[];
  tasks?: Record<string, unknown>[];
  contract?: {
    serviceFrequency?: string | null;
    serviceSchedule?: Record<string, unknown> | null;
  } | null;
}

function toWorkingScope(value: unknown): AmendmentWorkingScope {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as AmendmentWorkingScope;
}

async function buildContractScopeSnapshot(contractId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      id: true,
      contractNumber: true,
      title: true,
      status: true,
      startDate: true,
      endDate: true,
      monthlyValue: true,
      billingCycle: true,
      paymentTerms: true,
      serviceFrequency: true,
      serviceSchedule: true,
      account: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
      facility: {
        select: {
          id: true,
          name: true,
          address: true,
          buildingType: true,
          accessInstructions: true,
          parkingInfo: true,
          specialRequirements: true,
          notes: true,
        },
      },
    },
  });

  if (!contract) {
    throw new Error('Contract not found');
  }

  const areas = contract.facility
    ? await prisma.area.findMany({
        where: {
          facilityId: contract.facility.id,
          archivedAt: null,
        },
        select: {
          id: true,
          areaTypeId: true,
          name: true,
          quantity: true,
          length: true,
          width: true,
          squareFeet: true,
          floorType: true,
          conditionLevel: true,
          roomCount: true,
          unitCount: true,
          trafficLevel: true,
          notes: true,
          areaType: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
      })
    : [];

  const tasks = contract.facility
    ? await prisma.facilityTask.findMany({
        where: {
          facilityId: contract.facility.id,
          archivedAt: null,
        },
        select: {
          id: true,
          areaId: true,
          taskTemplateId: true,
          customName: true,
          customInstructions: true,
          estimatedMinutes: true,
          baseMinutesOverride: true,
          perSqftMinutesOverride: true,
          perUnitMinutesOverride: true,
          perRoomMinutesOverride: true,
          isRequired: true,
          cleaningFrequency: true,
          conditionMultiplier: true,
          priority: true,
          area: {
            select: {
              id: true,
              name: true,
            },
          },
          taskTemplate: {
            select: {
              id: true,
              name: true,
              cleaningType: true,
              areaTypeId: true,
            },
          },
        },
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      })
    : [];

  return {
    capturedAt: new Date().toISOString(),
    contract: {
      id: contract.id,
      contractNumber: contract.contractNumber,
      title: contract.title,
      status: contract.status,
      startDate: contract.startDate.toISOString(),
      endDate: contract.endDate?.toISOString() ?? null,
      monthlyValue: Number(contract.monthlyValue),
      billingCycle: contract.billingCycle,
      paymentTerms: contract.paymentTerms,
      serviceFrequency: contract.serviceFrequency,
      serviceSchedule: contract.serviceSchedule,
    },
    account: contract.account,
    facility: contract.facility,
    areas: areas.map((area) => ({
      ...area,
      length: toNumber(area.length),
      width: toNumber(area.width),
      squareFeet: toNumber(area.squareFeet),
    })),
    tasks: tasks.map((task) => ({
      ...task,
      baseMinutesOverride: toNumber(task.baseMinutesOverride),
      perSqftMinutesOverride: toNumber(task.perSqftMinutesOverride),
      perUnitMinutesOverride: toNumber(task.perUnitMinutesOverride),
      perRoomMinutesOverride: toNumber(task.perRoomMinutesOverride),
      conditionMultiplier: toNumber(task.conditionMultiplier),
    })),
  };
}

async function createAmendmentActivity(
  tx: Prisma.TransactionClient,
  amendmentId: string,
  action: string,
  performedByUserId?: string,
  metadata?: Record<string, unknown>
) {
  await tx.contractAmendmentActivity.create({
    data: {
      amendmentId,
      action,
      performedByUserId: performedByUserId ?? null,
      metadata: (metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}

function getLatestWorkingScope(
  amendment: { snapshots?: { snapshotType: string; scopeJson: unknown }[] }
): AmendmentWorkingScope {
  const snapshots = amendment.snapshots ?? [];
  for (let index = snapshots.length - 1; index >= 0; index -= 1) {
    if (snapshots[index]?.snapshotType === 'working') {
      return toWorkingScope(snapshots[index]?.scopeJson);
    }
  }
  return {};
}

function toSafeString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function toSafeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function trimToNullableString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function buildSqftScopeOverride(
  facility: { id?: string; name?: string; buildingType?: string | null } | null | undefined,
  workingScope: AmendmentWorkingScope
): FacilityPricingScopeOverride {
  const draftFacility = workingScope.facility ?? facility;
  const areas = Array.isArray(workingScope.areas) ? workingScope.areas : [];

  return {
    facilityId: toSafeString(draftFacility?.id, 'amendment-scope'),
    facilityName: toSafeString(draftFacility?.name, 'Contract Amendment Scope'),
    buildingType: typeof draftFacility?.buildingType === 'string' ? draftFacility.buildingType : 'other',
    areas: areas.map((area, index) => ({
      id: toSafeString(area.id ?? area.tempId, `draft-area-${index + 1}`),
      name: toSafeString(area.name ?? area.areaType?.name ?? area.areaTypeName, `Area ${index + 1}`),
      areaTypeName: toSafeString(area.areaType?.name ?? area.areaTypeName, 'Area'),
      squareFeet: Math.max(0, toSafeNumber(area.squareFeet)),
      floorType: toSafeString(area.floorType, 'vct'),
      conditionLevel: toSafeString(area.conditionLevel, 'standard'),
      trafficLevel: toSafeString(area.trafficLevel, 'medium'),
      quantity: Math.max(1, Math.round(toSafeNumber(area.quantity, 1))),
    })),
  };
}

function buildPerHourScopeOverride(
  facility: { id?: string; name?: string; buildingType?: string | null } | null | undefined,
  workingScope: AmendmentWorkingScope
): PerHourPricingScopeOverride {
  const draftFacility = workingScope.facility ?? facility;
  const areas = Array.isArray(workingScope.areas) ? workingScope.areas : [];
  const tasks = Array.isArray(workingScope.tasks) ? workingScope.tasks : [];

  return {
    facilityId: toSafeString(draftFacility?.id, 'amendment-scope'),
    facilityName: toSafeString(draftFacility?.name, 'Contract Amendment Scope'),
    buildingType: typeof draftFacility?.buildingType === 'string' ? draftFacility.buildingType : 'other',
    areas: areas.map((area, index) => ({
      id: toSafeString(area.id ?? area.tempId, `draft-area-${index + 1}`),
      name: toSafeString(area.name ?? area.areaType?.name ?? area.areaTypeName, `Area ${index + 1}`),
      squareFeet: Math.max(0, toSafeNumber(area.squareFeet)),
      quantity: Math.max(1, Math.round(toSafeNumber(area.quantity, 1))),
      floorType: toSafeString(area.floorType, 'vct'),
      conditionLevel: toSafeString(area.conditionLevel, 'standard'),
      trafficLevel: toSafeString(area.trafficLevel, 'medium'),
      roomCount: Math.max(0, Math.round(toSafeNumber(area.roomCount, 0))),
      unitCount: Math.max(0, Math.round(toSafeNumber(area.unitCount, 0))),
    })),
    tasks: tasks.map((task, index) => ({
      id: toSafeString(task.id ?? task.tempId, `draft-task-${index + 1}`),
      areaId:
        task.areaId === null || task.areaId === undefined || task.areaId === ''
          ? null
          : toSafeString(task.areaId, `draft-area-${index + 1}`),
      cleaningFrequency: toSafeString(task.cleaningFrequency, 'daily'),
      customName: typeof task.customName === 'string' ? task.customName : null,
      estimatedMinutes: task.estimatedMinutes == null ? null : toSafeNumber(task.estimatedMinutes),
      baseMinutesOverride:
        task.baseMinutesOverride == null ? null : toSafeNumber(task.baseMinutesOverride),
      perSqftMinutesOverride:
        task.perSqftMinutesOverride == null ? null : toSafeNumber(task.perSqftMinutesOverride),
      perUnitMinutesOverride:
        task.perUnitMinutesOverride == null ? null : toSafeNumber(task.perUnitMinutesOverride),
      perRoomMinutesOverride:
        task.perRoomMinutesOverride == null ? null : toSafeNumber(task.perRoomMinutesOverride),
      taskTemplate: task.taskTemplate
        ? {
            id: typeof task.taskTemplate.id === 'string' ? task.taskTemplate.id : undefined,
            name: typeof task.taskTemplate.name === 'string' ? task.taskTemplate.name : undefined,
          }
        : null,
    })),
  };
}

async function calculateAmendmentScopePricing(params: {
  contractId: string;
  accountId: string;
  facility: { id?: string; name?: string; buildingType?: string | null } | null | undefined;
  workingScope: AmendmentWorkingScope;
  serviceFrequency: string;
  pricingPlanId?: string | null;
}) {
  const pricingPlan = await resolvePricingPlan({
    pricingPlanId: params.pricingPlanId ?? undefined,
    facilityId: params.facility?.id,
    accountId: params.accountId,
  });

  if (!pricingPlan) {
    throw new Error('No pricing plan found');
  }

  if (pricingPlan.pricingType === 'hourly') {
    return calculatePerHourPricing({
      facilityId: params.facility?.id ?? params.contractId,
      serviceFrequency: params.serviceFrequency,
      pricingPlanId: pricingPlan.id,
      facilityOverride: buildPerHourScopeOverride(params.facility, params.workingScope),
    });
  }

  return calculateFacilityPricing({
    facilityId: params.facility?.id ?? params.contractId,
    serviceFrequency: params.serviceFrequency,
    pricingPlanId: pricingPlan.id,
    facilityOverride: buildSqftScopeOverride(params.facility, params.workingScope),
  });
}

export async function listContractAmendments(contractId: string) {
  const amendments = await prisma.contractAmendment.findMany({
    where: {
      contractId,
      archivedAt: null,
    },
    select: amendmentListSelect,
    orderBy: [{ amendmentNumber: 'desc' }, { createdAt: 'desc' }],
  });

  return amendments.map(mapAmendment);
}

export async function getContractAmendmentById(amendmentId: string) {
  const amendment = await prisma.contractAmendment.findUnique({
    where: { id: amendmentId },
    select: amendmentDetailSelect,
  });

  return amendment ? mapAmendment(amendment) : null;
}

export async function createContractAmendment(
  contractId: string,
  input: CreateContractAmendmentInput,
  createdByUserId: string
) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      id: true,
      status: true,
      title: true,
      monthlyValue: true,
      serviceFrequency: true,
      serviceSchedule: true,
    },
  });

  if (!contract) {
    throw new Error('Contract not found');
  }

  if (contract.status !== 'active') {
    throw new Error('Only active contracts can be amended');
  }

  const openAmendment = await prisma.contractAmendment.findFirst({
    where: {
      contractId,
      archivedAt: null,
      status: { in: [...OPEN_AMENDMENT_STATUSES] },
    },
    select: { id: true, amendmentNumber: true, status: true },
  });

  if (openAmendment) {
    throw new Error(
      `Contract already has an open amendment (#${openAmendment.amendmentNumber}) in ${openAmendment.status} status`
    );
  }

  const lastAmendment = await prisma.contractAmendment.findFirst({
    where: { contractId },
    orderBy: { amendmentNumber: 'desc' },
    select: { amendmentNumber: true },
  });

  const amendmentNumber = (lastAmendment?.amendmentNumber ?? 0) + 1;
  const baseSnapshot = await buildContractScopeSnapshot(contractId);
  const workingScope = input.workingScope ?? baseSnapshot;
  const oldMonthlyValue = Number(contract.monthlyValue);
  const newMonthlyValue =
    input.newMonthlyValue === undefined ? oldMonthlyValue : input.newMonthlyValue;
  const monthlyDelta = newMonthlyValue === null ? null : newMonthlyValue - oldMonthlyValue;

  const amendment = await prisma.$transaction(async (tx) => {
    const created = await tx.contractAmendment.create({
      data: {
        contractId,
        amendmentNumber,
        status: 'draft',
        amendmentType: input.amendmentType ?? 'scope_change',
        title: input.title ?? `${contract.title} Amendment #${amendmentNumber}`,
        summary: input.summary ?? null,
        reason: input.reason ?? null,
        effectiveDate: input.effectiveDate,
        pricingPlanId: input.pricingPlanId ?? null,
        oldMonthlyValue,
        newMonthlyValue,
        monthlyDelta,
        oldServiceFrequency: contract.serviceFrequency ?? null,
        newServiceFrequency:
          input.newServiceFrequency === undefined
            ? contract.serviceFrequency ?? null
            : input.newServiceFrequency,
        oldServiceSchedule:
          (contract.serviceSchedule as Prisma.InputJsonValue | null | undefined) ??
          Prisma.JsonNull,
        newServiceSchedule:
          input.newServiceSchedule === undefined
            ? ((contract.serviceSchedule as Prisma.InputJsonValue | null | undefined) ??
              Prisma.JsonNull)
            : ((input.newServiceSchedule as Prisma.InputJsonValue | null | undefined) ??
              Prisma.JsonNull),
        pricingSnapshot:
          (input.pricingSnapshot as Prisma.InputJsonValue | null | undefined) ?? undefined,
        createdByUserId,
      },
      select: amendmentDetailSelect,
    });

    await tx.contractAmendmentScopeSnapshot.createMany({
      data: [
        {
          amendmentId: created.id,
          snapshotType: 'before',
          scopeJson: baseSnapshot as Prisma.InputJsonValue,
        },
        {
          amendmentId: created.id,
          snapshotType: 'working',
          scopeJson: workingScope as Prisma.InputJsonValue,
        },
      ],
    });

    await createAmendmentActivity(tx, created.id, 'created', createdByUserId, {
      amendmentNumber,
      effectiveDate: input.effectiveDate.toISOString(),
    });

    return created;
  });

  return mapAmendment(amendment);
}

export async function updateContractAmendment(
  amendmentId: string,
  input: UpdateContractAmendmentInput,
  updatedByUserId: string
) {
  const existing = await prisma.contractAmendment.findUnique({
    where: { id: amendmentId },
    select: {
      id: true,
      status: true,
      pricingSnapshot: true,
      oldMonthlyValue: true,
      oldServiceFrequency: true,
      oldServiceSchedule: true,
    },
  });

  if (!existing) {
    throw new Error('Amendment not found');
  }

  if (!['draft', 'submitted'].includes(existing.status)) {
    throw new Error(`Cannot update amendment in ${existing.status} status`);
  }

  if (input.status === 'submitted' && input.pricingSnapshot === undefined && !existingHasPricing(existing)) {
    throw new Error('Amendment must be recalculated before submission');
  }

  const nextMonthlyValue =
    input.newMonthlyValue === undefined
      ? undefined
      : input.newMonthlyValue === null
        ? null
        : input.newMonthlyValue;

  const updated = await prisma.$transaction(async (tx) => {
    const amendment = await tx.contractAmendment.update({
      where: { id: amendmentId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.summary !== undefined ? { summary: input.summary } : {}),
        ...(input.reason !== undefined ? { reason: input.reason } : {}),
        ...(input.effectiveDate !== undefined ? { effectiveDate: input.effectiveDate } : {}),
        ...(input.pricingPlanId !== undefined ? { pricingPlanId: input.pricingPlanId } : {}),
        ...(input.amendmentType !== undefined ? { amendmentType: input.amendmentType } : {}),
        ...(nextMonthlyValue !== undefined
          ? {
              newMonthlyValue: nextMonthlyValue,
              monthlyDelta:
                nextMonthlyValue === null
                  ? null
                  : nextMonthlyValue - Number(existing.oldMonthlyValue),
            }
          : {}),
        ...(input.newServiceFrequency !== undefined
          ? { newServiceFrequency: input.newServiceFrequency }
          : {}),
        ...(input.newServiceSchedule !== undefined
          ? {
              newServiceSchedule:
                (input.newServiceSchedule as Prisma.InputJsonValue | null | undefined) ??
                Prisma.JsonNull,
            }
          : {}),
        ...(input.pricingSnapshot !== undefined
          ? {
              pricingSnapshot:
                (input.pricingSnapshot as Prisma.InputJsonValue | null | undefined) ??
                Prisma.JsonNull,
            }
          : {}),
        ...(input.status !== undefined
          ? {
              status: input.status,
              canceledAt: input.status === 'canceled' ? new Date() : null,
            }
          : {}),
      },
      select: amendmentDetailSelect,
    });

    if (input.workingScope !== undefined) {
      await tx.contractAmendmentScopeSnapshot.create({
        data: {
          amendmentId,
          snapshotType: 'working',
          scopeJson: (input.workingScope as Prisma.InputJsonValue | null | undefined) ??
            Prisma.JsonNull,
        },
      });
    }

    await createAmendmentActivity(tx, amendmentId, 'updated', updatedByUserId, {
      fields: Object.keys(input),
      status: input.status ?? undefined,
    });

    return amendment;
  });

  return mapAmendment(updated);
}

function existingHasPricing(existing: {
  oldMonthlyValue: Prisma.Decimal | number | null | undefined;
  oldServiceFrequency?: string | null;
  oldServiceSchedule?: unknown;
  [key: string]: unknown;
}) {
  return Boolean((existing as { pricingSnapshot?: unknown }).pricingSnapshot);
}

export async function recalculateContractAmendment(
  amendmentId: string,
  input: RecalculateContractAmendmentInput,
  updatedByUserId: string
) {
  const existing = await prisma.contractAmendment.findUnique({
    where: { id: amendmentId },
    select: {
      ...amendmentDetailSelect,
      contract: {
        select: {
          id: true,
          accountId: true,
          serviceFrequency: true,
          serviceSchedule: true,
          facility: {
            select: {
              id: true,
              name: true,
              buildingType: true,
            },
          },
        },
      },
    },
  });

  if (!existing) {
    throw new Error('Amendment not found');
  }

  if (existing.status !== 'draft') {
    throw new Error('Only draft amendments can be recalculated');
  }

  const workingScope = (input.workingScope ?? getLatestWorkingScope(existing)) as AmendmentWorkingScope;
  const serviceFrequency =
    input.newServiceFrequency ??
    existing.newServiceFrequency ??
    existing.oldServiceFrequency ??
    existing.contract.serviceFrequency;

  if (!serviceFrequency) {
    throw new Error('Service frequency is required to recalculate amendment pricing');
  }

  const pricing = await calculateAmendmentScopePricing({
    contractId: existing.contract.id,
    accountId: existing.contract.accountId,
    facility: existing.contract.facility,
    workingScope,
    serviceFrequency,
    pricingPlanId: input.pricingPlanId ?? existing.pricingPlanId,
  });

  const newMonthlyValue = Number(pricing.monthlyTotal);
  const monthlyDelta = newMonthlyValue - (toNumber(existing.oldMonthlyValue) ?? 0);

  const amendment = await prisma.$transaction(async (tx) => {
    const updated = await tx.contractAmendment.update({
      where: { id: amendmentId },
      data: {
        pricingPlanId: pricing.pricingPlanId,
        newMonthlyValue,
        monthlyDelta,
        newServiceFrequency: serviceFrequency,
        ...(input.newServiceSchedule !== undefined
          ? {
              newServiceSchedule:
                (input.newServiceSchedule as Prisma.InputJsonValue | null | undefined) ??
                Prisma.JsonNull,
            }
          : {}),
        pricingSnapshot: pricing as unknown as Prisma.InputJsonValue,
      },
      select: amendmentDetailSelect,
    });

    if (input.workingScope !== undefined) {
      await tx.contractAmendmentScopeSnapshot.create({
        data: {
          amendmentId,
          snapshotType: 'working',
          scopeJson:
            (input.workingScope as Prisma.InputJsonValue | null | undefined) ?? Prisma.JsonNull,
        },
      });
    }

    await createAmendmentActivity(tx, amendmentId, 'recalculated', updatedByUserId, {
      pricingPlanId: pricing.pricingPlanId,
      serviceFrequency,
      monthlyTotal: newMonthlyValue,
      monthlyDelta,
    });

    return updated;
  });

  return {
    amendment: mapAmendment(amendment),
    pricing,
  };
}

export async function approveContractAmendment(amendmentId: string, approvedByUserId: string) {
  const existing = await prisma.contractAmendment.findUnique({
    where: { id: amendmentId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!existing) {
    throw new Error('Amendment not found');
  }

  if (existing.status !== 'submitted') {
    throw new Error(`Cannot approve amendment in ${existing.status} status`);
  }

  const approved = await prisma.$transaction(async (tx) => {
    const amendment = await tx.contractAmendment.update({
      where: { id: amendmentId },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvedByUserId,
        rejectedAt: null,
        rejectedReason: null,
      },
      select: amendmentDetailSelect,
    });

    await createAmendmentActivity(tx, amendmentId, 'approved', approvedByUserId);
    return amendment;
  });

  return mapAmendment(approved);
}

export async function rejectContractAmendment(
  amendmentId: string,
  rejectedReason: string,
  rejectedByUserId: string
) {
  const existing = await prisma.contractAmendment.findUnique({
    where: { id: amendmentId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!existing) {
    throw new Error('Amendment not found');
  }

  if (existing.status !== 'submitted') {
    throw new Error(`Cannot reject amendment in ${existing.status} status`);
  }

  const rejected = await prisma.$transaction(async (tx) => {
    const amendment = await tx.contractAmendment.update({
      where: { id: amendmentId },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedReason,
      },
      select: amendmentDetailSelect,
    });

    await createAmendmentActivity(tx, amendmentId, 'rejected', rejectedByUserId, {
      rejectedReason,
    });
    return amendment;
  });

  return mapAmendment(rejected);
}

export async function applyContractAmendment(
  amendmentId: string,
  appliedByUserId: string | null,
  actorUserIdOverride?: string | null
) {
  const existing = await prisma.contractAmendment.findUnique({
    where: { id: amendmentId },
    select: {
      ...amendmentDetailSelect,
      contract: {
        select: {
          id: true,
          status: true,
          facilityId: true,
          serviceFrequency: true,
          serviceSchedule: true,
          monthlyValue: true,
        },
      },
    },
  });

  if (!existing) {
    throw new Error('Amendment not found');
  }

  if (!['approved', 'signed'].includes(existing.status)) {
    throw new Error(`Cannot apply amendment in ${existing.status} status`);
  }

  if (existing.contract.status !== 'active') {
    throw new Error('Only amendments for active contracts can be applied');
  }

  if (!existing.contract.facilityId) {
    throw new Error('Contract must have a facility before applying an amendment');
  }

  const actorUserId =
    actorUserIdOverride ?? appliedByUserId ?? existing.approvedByUser?.id ?? existing.createdByUser.id;

  if (!actorUserId) {
    throw new Error('Amendment apply requires an actor user');
  }

  const workingScope = getLatestWorkingScope(existing);
  const areas = Array.isArray(workingScope.areas) ? workingScope.areas : [];
  const tasks = Array.isArray(workingScope.tasks) ? workingScope.tasks : [];
  const facilityId = existing.contract.facilityId;

  const applied = await prisma.$transaction(async (tx) => {
    const currentAreas = await tx.area.findMany({
      where: {
        facilityId,
        archivedAt: null,
      },
      select: {
        id: true,
        areaTypeId: true,
        name: true,
      },
    });

    const currentTasks = await tx.facilityTask.findMany({
      where: {
        facilityId,
        archivedAt: null,
      },
      select: {
        id: true,
        areaId: true,
        taskTemplateId: true,
        customName: true,
        cleaningFrequency: true,
      },
    });

    const areaIdMap = new Map<string, string>();
    const keptAreaIds = new Set<string>();
    const unmatchedAreaIds = new Set(currentAreas.map((area) => area.id));
    let updatedAreaCount = 0;
    let createdAreaCount = 0;

    for (const area of areas) {
      const areaKey = toSafeString(area.id ?? area.tempId, '');
      const areaTypeId =
        typeof area.areaTypeId === 'string'
          ? area.areaTypeId
          : typeof area.areaType?.id === 'string'
            ? area.areaType.id
            : null;

      if (!areaTypeId) {
        throw new Error(`Area "${toSafeString(area.name, 'Unnamed Area')}" is missing an area type`);
      }

      const directAreaId =
        typeof area.id === 'string' && currentAreas.some((currentArea) => currentArea.id === area.id)
          ? area.id
          : null;
      const matchedAreaId =
        directAreaId ??
        currentAreas.find(
          (currentArea) =>
            unmatchedAreaIds.has(currentArea.id) &&
            buildAreaMatchKey({
              areaTypeId: currentArea.areaTypeId,
              name: currentArea.name,
            }) ===
              buildAreaMatchKey({
                areaTypeId,
                name: typeof area.name === 'string' ? area.name : null,
              })
        )?.id ??
        null;

      if (matchedAreaId) {
        const updated = await tx.area.update({
          where: { id: matchedAreaId },
          data: {
            areaTypeId,
            name: trimToNullableString(area.name),
            quantity: Math.max(1, Math.round(toSafeNumber(area.quantity, 1))),
            squareFeet: toSafeNumber(area.squareFeet),
            floorType: toSafeString(area.floorType, 'vct'),
            conditionLevel: toSafeString(area.conditionLevel, 'standard'),
            trafficLevel: toSafeString(area.trafficLevel, 'medium'),
            roomCount: Math.max(0, Math.round(toSafeNumber(area.roomCount, 0))),
            unitCount: Math.max(0, Math.round(toSafeNumber(area.unitCount, 0))),
            notes: typeof area.notes === 'string' ? area.notes : null,
            archivedAt: null,
          },
          select: { id: true },
        });
        areaIdMap.set(areaKey, updated.id);
        keptAreaIds.add(updated.id);
        unmatchedAreaIds.delete(updated.id);
        updatedAreaCount += 1;
      } else {
        const created = await tx.area.create({
          data: {
            facilityId,
            areaTypeId,
            name: trimToNullableString(area.name),
            quantity: Math.max(1, Math.round(toSafeNumber(area.quantity, 1))),
            squareFeet: toSafeNumber(area.squareFeet),
            floorType: toSafeString(area.floorType, 'vct'),
            conditionLevel: toSafeString(area.conditionLevel, 'standard'),
            trafficLevel: toSafeString(area.trafficLevel, 'medium'),
            roomCount: Math.max(0, Math.round(toSafeNumber(area.roomCount, 0))),
            unitCount: Math.max(0, Math.round(toSafeNumber(area.unitCount, 0))),
            notes: typeof area.notes === 'string' ? area.notes : null,
            createdByUserId: actorUserId,
          },
          select: { id: true },
        });
        if (areaKey) {
          areaIdMap.set(areaKey, created.id);
        }
        keptAreaIds.add(created.id);
        createdAreaCount += 1;
      }
    }

    const areasToArchive = currentAreas
      .map((area) => area.id)
      .filter((areaId) => !keptAreaIds.has(areaId));

    if (areasToArchive.length > 0) {
      await tx.area.updateMany({
        where: { id: { in: areasToArchive } },
        data: { archivedAt: new Date() },
      });
    }

    const keptTaskIds = new Set<string>();
    const unmatchedTaskIds = new Set(currentTasks.map((task) => task.id));
    let updatedTaskCount = 0;
    let createdTaskCount = 0;

    for (const task of tasks) {
      const resolvedAreaId =
        task.areaId == null
          ? null
          : areaIdMap.get(String(task.areaId)) ?? String(task.areaId);
      const directTaskId =
        typeof task.id === 'string' && currentTasks.some((currentTask) => currentTask.id === task.id)
          ? task.id
          : null;
      const matchedTaskId =
        directTaskId ??
        currentTasks.find(
          (currentTask) =>
            unmatchedTaskIds.has(currentTask.id) &&
            buildTaskMatchKey({
              areaId: currentTask.areaId,
              taskTemplateId: currentTask.taskTemplateId,
              customName: currentTask.customName,
              cleaningFrequency: currentTask.cleaningFrequency,
            }) ===
              buildTaskMatchKey({
                areaId: resolvedAreaId,
                taskTemplateId:
                  typeof task.taskTemplateId === 'string' ? task.taskTemplateId : null,
                customName: typeof task.customName === 'string' ? task.customName : null,
                cleaningFrequency: toSafeString(task.cleaningFrequency, 'daily'),
              })
        )?.id ??
        null;

      if (matchedTaskId) {
        const updated = await tx.facilityTask.update({
          where: { id: matchedTaskId },
          data: {
            areaId: resolvedAreaId,
            taskTemplateId:
              typeof task.taskTemplateId === 'string' ? task.taskTemplateId : null,
            customName: typeof task.customName === 'string' ? task.customName : null,
            estimatedMinutes:
              task.estimatedMinutes == null ? null : toSafeNumber(task.estimatedMinutes),
            baseMinutesOverride:
              task.baseMinutesOverride == null ? null : toSafeNumber(task.baseMinutesOverride),
            perSqftMinutesOverride:
              task.perSqftMinutesOverride == null
                ? null
                : toSafeNumber(task.perSqftMinutesOverride),
            perUnitMinutesOverride:
              task.perUnitMinutesOverride == null
                ? null
                : toSafeNumber(task.perUnitMinutesOverride),
            perRoomMinutesOverride:
              task.perRoomMinutesOverride == null
                ? null
                : toSafeNumber(task.perRoomMinutesOverride),
            cleaningFrequency: toSafeString(task.cleaningFrequency, 'daily'),
            archivedAt: null,
          },
          select: { id: true },
        });
        keptTaskIds.add(updated.id);
        unmatchedTaskIds.delete(updated.id);
        updatedTaskCount += 1;
      } else {
        const created = await tx.facilityTask.create({
          data: {
            facilityId,
            areaId: resolvedAreaId,
            taskTemplateId:
              typeof task.taskTemplateId === 'string' ? task.taskTemplateId : null,
            customName: typeof task.customName === 'string' ? task.customName : null,
            estimatedMinutes:
              task.estimatedMinutes == null ? null : toSafeNumber(task.estimatedMinutes),
            baseMinutesOverride:
              task.baseMinutesOverride == null ? null : toSafeNumber(task.baseMinutesOverride),
            perSqftMinutesOverride:
              task.perSqftMinutesOverride == null
                ? null
                : toSafeNumber(task.perSqftMinutesOverride),
            perUnitMinutesOverride:
              task.perUnitMinutesOverride == null
                ? null
                : toSafeNumber(task.perUnitMinutesOverride),
            perRoomMinutesOverride:
              task.perRoomMinutesOverride == null
                ? null
                : toSafeNumber(task.perRoomMinutesOverride),
            cleaningFrequency: toSafeString(task.cleaningFrequency, 'daily'),
            createdByUserId: actorUserId,
          },
          select: { id: true },
        });
        keptTaskIds.add(created.id);
        createdTaskCount += 1;
      }
    }

    const tasksToArchive = currentTasks
      .map((task) => task.id)
      .filter((taskId) => !keptTaskIds.has(taskId));

    if (tasksToArchive.length > 0) {
      await tx.facilityTask.updateMany({
        where: { id: { in: tasksToArchive } },
        data: { archivedAt: new Date() },
      });
    }

    const normalizedSchedule = normalizeServiceSchedule(
      existing.newServiceSchedule,
      existing.newServiceFrequency ?? existing.contract.serviceFrequency
    );

    await tx.contract.update({
      where: { id: existing.contract.id },
      data: {
        monthlyValue:
          existing.newMonthlyValue == null
            ? Number(existing.contract.monthlyValue)
            : Number(existing.newMonthlyValue),
        serviceFrequency:
          existing.newServiceFrequency ?? existing.contract.serviceFrequency,
        serviceSchedule:
          (normalizedSchedule as Prisma.InputJsonValue | null | undefined) ?? Prisma.JsonNull,
      },
    });

    const amendment = await tx.contractAmendment.update({
      where: { id: amendmentId },
      data: {
        status: 'applied',
        appliedAt: new Date(),
        appliedByUserId: appliedByUserId ?? null,
      },
      select: amendmentDetailSelect,
    });

    await tx.contractAmendmentScopeSnapshot.create({
      data: {
        amendmentId,
        snapshotType: 'after',
        scopeJson: workingScope as Prisma.InputJsonValue,
      },
    });

    await createAmendmentActivity(tx, amendmentId, 'applied', appliedByUserId ?? undefined, {
      createdAreaCount,
      updatedAreaCount,
      removedAreaCount: areasToArchive.length,
      createdTaskCount,
      updatedTaskCount,
      removedTaskCount: tasksToArchive.length,
      archivedAreaCount: areasToArchive.length,
      archivedTaskCount: tasksToArchive.length,
      activeAreaCount: keptAreaIds.size,
      activeTaskCount: keptTaskIds.size,
    });

    return amendment;
  });

  return mapAmendment(applied);
}
