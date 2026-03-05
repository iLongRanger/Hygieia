import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';
import { generateJobsFromContract } from './jobService';
import { normalizeServiceSchedule } from './serviceScheduleService';
import { calculatePricing } from './pricing';

export type ContractAmendmentStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'applied'
  | 'canceled';

export interface ContractAmendmentAreaChangesInput {
  create?: Array<{
    areaTypeId: string;
    name?: string | null;
    quantity?: number;
    length?: number | null;
    width?: number | null;
    squareFeet?: number | null;
    floorType?: string;
    conditionLevel?: string;
    trafficLevel?: string;
    notes?: string | null;
  }>;
  update?: Array<{
    id: string;
    areaTypeId?: string;
    name?: string | null;
    quantity?: number;
    length?: number | null;
    width?: number | null;
    squareFeet?: number | null;
    floorType?: string;
    conditionLevel?: string;
    trafficLevel?: string;
    notes?: string | null;
  }>;
  archiveIds?: string[];
}

export interface ContractAmendmentTaskChangesInput {
  create?: Array<{
    areaId?: string | null;
    taskTemplateId?: string | null;
    customName?: string | null;
    customInstructions?: string | null;
    estimatedMinutes?: number | null;
    baseMinutesOverride?: number | null;
    perSqftMinutesOverride?: number | null;
    isRequired?: boolean;
    cleaningFrequency?: string;
    conditionMultiplier?: number;
    priority?: number;
  }>;
  update?: Array<{
    id: string;
    areaId?: string | null;
    taskTemplateId?: string | null;
    customName?: string | null;
    customInstructions?: string | null;
    estimatedMinutes?: number | null;
    baseMinutesOverride?: number | null;
    perSqftMinutesOverride?: number | null;
    isRequired?: boolean;
    cleaningFrequency?: string;
    conditionMultiplier?: number;
    priority?: number;
  }>;
  archiveIds?: string[];
}

export interface ContractAmendmentCreateInput {
  title: string;
  description?: string | null;
  effectiveDate: Date;
  monthlyValue?: number | null;
  endDate?: Date | null;
  serviceFrequency?: string | null;
  serviceSchedule?: Record<string, unknown> | null;
  billingCycle?: string | null;
  paymentTerms?: string | null;
  autoRenew?: boolean | null;
  renewalNoticeDays?: number | null;
  termsAndConditions?: string | null;
  specialInstructions?: string | null;
  areaChanges?: ContractAmendmentAreaChangesInput | null;
  taskChanges?: ContractAmendmentTaskChangesInput | null;
}

export interface ContractAmendmentUpdateInput extends Partial<ContractAmendmentCreateInput> {
  status?: ContractAmendmentStatus;
}

const amendmentSelect = {
  id: true,
  contractId: true,
  status: true,
  title: true,
  description: true,
  effectiveDate: true,
  monthlyValue: true,
  endDate: true,
  serviceFrequency: true,
  serviceSchedule: true,
  billingCycle: true,
  paymentTerms: true,
  autoRenew: true,
  renewalNoticeDays: true,
  termsAndConditions: true,
  specialInstructions: true,
  areaChanges: true,
  taskChanges: true,
  approvedAt: true,
  appliedAt: true,
  canceledAt: true,
  createdAt: true,
  updatedAt: true,
  contract: {
    select: {
      id: true,
      contractNumber: true,
      title: true,
      status: true,
      facilityId: true,
      assignedTeamId: true,
      assignedToUserId: true,
      startDate: true,
      endDate: true,
    },
  },
  proposedByUser: {
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

function normalizeAmendmentStatus(value: string | null | undefined): ContractAmendmentStatus {
  const normalized = (value || 'draft') as ContractAmendmentStatus;
  if (!['draft', 'pending_approval', 'approved', 'applied', 'canceled'].includes(normalized)) {
    throw new BadRequestError('Invalid amendment status');
  }
  return normalized;
}

async function resolveTaskTemplateId(
  tx: Prisma.TransactionClient,
  input: {
    facilityId: string;
    taskTemplateId?: string | null;
    customName?: string | null;
    cleaningFrequency?: string;
    estimatedMinutes?: number | null;
    baseMinutesOverride?: number | null;
    perSqftMinutesOverride?: number | null;
    customInstructions?: string | null;
    createdByUserId: string;
  }
): Promise<string | null> {
  if (input.taskTemplateId) {
    return input.taskTemplateId;
  }

  const customName = input.customName?.trim();
  if (!customName) {
    return null;
  }

  const cleaningType = input.cleaningFrequency ?? 'daily';

  const facilityTemplate = await tx.taskTemplate.findFirst({
    where: {
      facilityId: input.facilityId,
      archivedAt: null,
      isActive: true,
      cleaningType,
      name: { equals: customName, mode: 'insensitive' },
    },
    select: { id: true },
  });
  if (facilityTemplate) return facilityTemplate.id;

  const globalTemplate = await tx.taskTemplate.findFirst({
    where: {
      isGlobal: true,
      archivedAt: null,
      isActive: true,
      cleaningType,
      name: { equals: customName, mode: 'insensitive' },
    },
    select: { id: true },
  });
  if (globalTemplate) return globalTemplate.id;

  const created = await tx.taskTemplate.create({
    data: {
      name: customName,
      cleaningType,
      estimatedMinutes: input.estimatedMinutes ?? 0,
      baseMinutes: input.baseMinutesOverride ?? 0,
      perSqftMinutes: input.perSqftMinutesOverride ?? 0,
      instructions: input.customInstructions ?? null,
      isGlobal: false,
      facilityId: input.facilityId,
      isActive: true,
      createdByUserId: input.createdByUserId,
    },
    select: { id: true },
  });

  return created.id;
}

export async function listContractAmendments(contractId: string) {
  return prisma.contractAmendment.findMany({
    where: { contractId },
    select: amendmentSelect,
    orderBy: [{ createdAt: 'desc' }],
  });
}

export async function getContractAmendmentById(id: string) {
  return prisma.contractAmendment.findUnique({
    where: { id },
    select: amendmentSelect,
  });
}

export async function createContractAmendment(
  contractId: string,
  input: ContractAmendmentCreateInput,
  proposedByUserId: string
) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      id: true,
      status: true,
      facilityId: true,
    },
  });

  if (!contract) {
    throw new NotFoundError('Contract not found');
  }

  if (!['active', 'expired'].includes(contract.status)) {
    throw new BadRequestError('Only active or expired contracts can be amended');
  }

  if (!contract.facilityId) {
    throw new BadRequestError('Contract must have a facility before creating an amendment');
  }

  const effectiveIsoDate = input.effectiveDate.toISOString().slice(0, 10);

  return prisma.contractAmendment.create({
    data: {
      contractId,
      title: input.title,
      description: input.description ?? null,
      effectiveDate: new Date(`${effectiveIsoDate}T00:00:00.000Z`),
      monthlyValue: input.monthlyValue ?? null,
      endDate: input.endDate ?? null,
      serviceFrequency: input.serviceFrequency ?? null,
      serviceSchedule:
        (input.serviceSchedule as Prisma.InputJsonValue | null | undefined) ?? Prisma.JsonNull,
      billingCycle: input.billingCycle ?? null,
      paymentTerms: input.paymentTerms ?? null,
      autoRenew: input.autoRenew ?? null,
      renewalNoticeDays: input.renewalNoticeDays ?? null,
      termsAndConditions: input.termsAndConditions ?? null,
      specialInstructions: input.specialInstructions ?? null,
      areaChanges:
        (input.areaChanges as Prisma.InputJsonValue | null | undefined) ?? Prisma.JsonNull,
      taskChanges:
        (input.taskChanges as Prisma.InputJsonValue | null | undefined) ?? Prisma.JsonNull,
      proposedByUserId,
      status: 'draft',
    },
    select: amendmentSelect,
  });
}

export async function updateContractAmendment(
  amendmentId: string,
  input: ContractAmendmentUpdateInput
) {
  const existing = await prisma.contractAmendment.findUnique({
    where: { id: amendmentId },
    select: {
      id: true,
      status: true,
      serviceFrequency: true,
      serviceSchedule: true,
    },
  });

  if (!existing) {
    throw new NotFoundError('Amendment not found');
  }

  if (!['draft', 'pending_approval'].includes(existing.status)) {
    throw new BadRequestError('Only draft or pending approval amendments can be edited');
  }

  const data: Prisma.ContractAmendmentUpdateInput = {};

  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description ?? null;
  if (input.effectiveDate !== undefined) {
    const effectiveIsoDate = input.effectiveDate.toISOString().slice(0, 10);
    data.effectiveDate = new Date(`${effectiveIsoDate}T00:00:00.000Z`);
  }
  if (input.monthlyValue !== undefined) data.monthlyValue = input.monthlyValue;
  if (input.endDate !== undefined) data.endDate = input.endDate;
  if (input.billingCycle !== undefined) data.billingCycle = input.billingCycle;
  if (input.paymentTerms !== undefined) data.paymentTerms = input.paymentTerms;
  if (input.autoRenew !== undefined) data.autoRenew = input.autoRenew;
  if (input.renewalNoticeDays !== undefined) data.renewalNoticeDays = input.renewalNoticeDays;
  if (input.termsAndConditions !== undefined) data.termsAndConditions = input.termsAndConditions;
  if (input.specialInstructions !== undefined) data.specialInstructions = input.specialInstructions;
  if (input.areaChanges !== undefined) {
    data.areaChanges =
      (input.areaChanges as Prisma.InputJsonValue | null | undefined) ?? Prisma.JsonNull;
  }
  if (input.taskChanges !== undefined) {
    data.taskChanges =
      (input.taskChanges as Prisma.InputJsonValue | null | undefined) ?? Prisma.JsonNull;
  }

  if (input.serviceSchedule !== undefined || input.serviceFrequency !== undefined) {
    const normalized = normalizeServiceSchedule(
      input.serviceSchedule ?? (existing.serviceSchedule as Record<string, unknown> | null),
      input.serviceFrequency ?? existing.serviceFrequency
    );
    data.serviceFrequency = input.serviceFrequency ?? existing.serviceFrequency;
    data.serviceSchedule =
      (normalized as Prisma.InputJsonValue | null | undefined) ?? Prisma.JsonNull;
  }

  if (input.status !== undefined) {
    data.status = normalizeAmendmentStatus(input.status);
    if (input.status === 'canceled') {
      data.canceledAt = new Date();
    }
  }

  return prisma.contractAmendment.update({
    where: { id: amendmentId },
    data,
    select: amendmentSelect,
  });
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
    throw new NotFoundError('Amendment not found');
  }

  if (!['draft', 'pending_approval'].includes(existing.status)) {
    throw new BadRequestError('Only draft or pending approval amendments can be approved');
  }

  return prisma.contractAmendment.update({
    where: { id: amendmentId },
    data: {
      status: 'approved',
      approvedByUserId,
      approvedAt: new Date(),
    },
    select: amendmentSelect,
  });
}

export async function applyContractAmendment(amendmentId: string, appliedByUserId: string) {
  const amendment = await prisma.contractAmendment.findUnique({
    where: { id: amendmentId },
    select: {
      id: true,
      contractId: true,
      status: true,
      effectiveDate: true,
      monthlyValue: true,
      endDate: true,
      serviceFrequency: true,
      serviceSchedule: true,
      billingCycle: true,
      paymentTerms: true,
      autoRenew: true,
      renewalNoticeDays: true,
      termsAndConditions: true,
      specialInstructions: true,
      areaChanges: true,
      taskChanges: true,
      contract: {
        select: {
          id: true,
          status: true,
          accountId: true,
          facilityId: true,
          assignedTeamId: true,
          assignedToUserId: true,
          startDate: true,
          endDate: true,
          serviceFrequency: true,
          serviceSchedule: true,
        },
      },
    },
  });

  if (!amendment) {
    throw new NotFoundError('Amendment not found');
  }

  if (amendment.status !== 'approved') {
    throw new BadRequestError('Only approved amendments can be applied');
  }

  if (!amendment.contract.facilityId) {
    throw new BadRequestError('Contract facility is required to apply this amendment');
  }

  const areaChanges = (amendment.areaChanges ?? {}) as ContractAmendmentAreaChangesInput;
  const taskChanges = (amendment.taskChanges ?? {}) as ContractAmendmentTaskChangesInput;
  const hasPricingImpactingChanges =
    amendment.serviceFrequency !== null ||
    (areaChanges.create?.length || 0) > 0 ||
    (areaChanges.update?.length || 0) > 0 ||
    (areaChanges.archiveIds?.length || 0) > 0 ||
    (taskChanges.create?.length || 0) > 0 ||
    (taskChanges.update?.length || 0) > 0 ||
    (taskChanges.archiveIds?.length || 0) > 0;

  const result = await prisma.$transaction(async (tx) => {
    const updateData: Prisma.ContractUpdateInput = {};

    if (amendment.monthlyValue !== null) updateData.monthlyValue = amendment.monthlyValue;
    if (amendment.endDate !== null) updateData.endDate = amendment.endDate;
    if (amendment.billingCycle !== null) updateData.billingCycle = amendment.billingCycle;
    if (amendment.paymentTerms !== null) updateData.paymentTerms = amendment.paymentTerms;
    if (amendment.autoRenew !== null) updateData.autoRenew = amendment.autoRenew;
    if (amendment.renewalNoticeDays !== null) {
      updateData.renewalNoticeDays = amendment.renewalNoticeDays;
    }
    if (amendment.termsAndConditions !== null) {
      updateData.termsAndConditions = amendment.termsAndConditions;
    }
    if (amendment.specialInstructions !== null) {
      updateData.specialInstructions = amendment.specialInstructions;
    }

    const nextServiceFrequency = amendment.serviceFrequency ?? amendment.contract.serviceFrequency;
    if (amendment.serviceSchedule !== null || amendment.serviceFrequency !== null) {
      const normalized = normalizeServiceSchedule(
        (amendment.serviceSchedule as Record<string, unknown> | null | undefined) ??
          ((amendment.contract.serviceSchedule as Record<string, unknown> | null) ?? null),
        nextServiceFrequency
      );
      updateData.serviceFrequency = nextServiceFrequency;
      updateData.serviceSchedule =
        (normalized as Prisma.InputJsonValue | null | undefined) ?? Prisma.JsonNull;
    }

    if (Object.keys(updateData).length > 0) {
      await tx.contract.update({
        where: { id: amendment.contractId },
        data: updateData,
      });
    }

    const facilityId = amendment.contract.facilityId as string;

    for (const createAreaInput of areaChanges.create || []) {
      await tx.area.create({
        data: {
          facilityId,
          areaTypeId: createAreaInput.areaTypeId,
          name: createAreaInput.name?.trim() || null,
          quantity: createAreaInput.quantity ?? 1,
          length: createAreaInput.length ?? null,
          width: createAreaInput.width ?? null,
          squareFeet: createAreaInput.squareFeet ?? null,
          floorType: createAreaInput.floorType ?? 'vct',
          conditionLevel: createAreaInput.conditionLevel ?? 'standard',
          trafficLevel: createAreaInput.trafficLevel ?? 'medium',
          notes: createAreaInput.notes ?? null,
          createdByUserId: appliedByUserId,
        },
      });
    }

    for (const updateAreaInput of areaChanges.update || []) {
      await tx.area.update({
        where: { id: updateAreaInput.id },
        data: {
          areaTypeId: updateAreaInput.areaTypeId,
          name: updateAreaInput.name?.trim() || null,
          quantity: updateAreaInput.quantity,
          length: updateAreaInput.length,
          width: updateAreaInput.width,
          squareFeet: updateAreaInput.squareFeet,
          floorType: updateAreaInput.floorType,
          conditionLevel: updateAreaInput.conditionLevel,
          trafficLevel: updateAreaInput.trafficLevel,
          notes: updateAreaInput.notes,
        },
      });
    }

    if (areaChanges.archiveIds && areaChanges.archiveIds.length > 0) {
      await tx.area.updateMany({
        where: {
          id: { in: areaChanges.archiveIds },
          facilityId,
          archivedAt: null,
        },
        data: {
          archivedAt: new Date(),
        },
      });

      await tx.facilityTask.updateMany({
        where: {
          facilityId,
          areaId: { in: areaChanges.archiveIds },
          archivedAt: null,
        },
        data: {
          archivedAt: new Date(),
        },
      });
    }

    for (const createTaskInput of taskChanges.create || []) {
      const taskTemplateId = await resolveTaskTemplateId(tx, {
        facilityId,
        taskTemplateId: createTaskInput.taskTemplateId ?? undefined,
        customName: createTaskInput.customName,
        cleaningFrequency: createTaskInput.cleaningFrequency,
        estimatedMinutes: createTaskInput.estimatedMinutes,
        baseMinutesOverride: createTaskInput.baseMinutesOverride,
        perSqftMinutesOverride: createTaskInput.perSqftMinutesOverride,
        customInstructions: createTaskInput.customInstructions,
        createdByUserId: appliedByUserId,
      });

      await tx.facilityTask.create({
        data: {
          facilityId,
          areaId: createTaskInput.areaId ?? null,
          taskTemplateId: taskTemplateId ?? null,
          customName: createTaskInput.customName?.trim() || null,
          customInstructions: createTaskInput.customInstructions ?? null,
          estimatedMinutes: createTaskInput.estimatedMinutes ?? null,
          baseMinutesOverride: createTaskInput.baseMinutesOverride ?? null,
          perSqftMinutesOverride: createTaskInput.perSqftMinutesOverride ?? null,
          isRequired: createTaskInput.isRequired ?? true,
          cleaningFrequency: createTaskInput.cleaningFrequency ?? 'daily',
          conditionMultiplier: createTaskInput.conditionMultiplier ?? 1,
          priority: createTaskInput.priority ?? 3,
          createdByUserId: appliedByUserId,
        },
      });
    }

    for (const updateTaskInput of taskChanges.update || []) {
      const taskTemplateId = await resolveTaskTemplateId(tx, {
        facilityId,
        taskTemplateId: updateTaskInput.taskTemplateId ?? undefined,
        customName: updateTaskInput.customName,
        cleaningFrequency: updateTaskInput.cleaningFrequency,
        estimatedMinutes: updateTaskInput.estimatedMinutes,
        baseMinutesOverride: updateTaskInput.baseMinutesOverride,
        perSqftMinutesOverride: updateTaskInput.perSqftMinutesOverride,
        customInstructions: updateTaskInput.customInstructions,
        createdByUserId: appliedByUserId,
      });

      await tx.facilityTask.update({
        where: { id: updateTaskInput.id },
        data: {
          areaId:
            updateTaskInput.areaId === undefined ? undefined : updateTaskInput.areaId,
          taskTemplateId: taskTemplateId ?? null,
          customName: updateTaskInput.customName?.trim() || null,
          customInstructions: updateTaskInput.customInstructions,
          estimatedMinutes: updateTaskInput.estimatedMinutes,
          baseMinutesOverride: updateTaskInput.baseMinutesOverride,
          perSqftMinutesOverride: updateTaskInput.perSqftMinutesOverride,
          isRequired: updateTaskInput.isRequired,
          cleaningFrequency: updateTaskInput.cleaningFrequency,
          conditionMultiplier: updateTaskInput.conditionMultiplier,
          priority: updateTaskInput.priority,
        },
      });
    }

    if (taskChanges.archiveIds && taskChanges.archiveIds.length > 0) {
      await tx.facilityTask.updateMany({
        where: {
          id: { in: taskChanges.archiveIds },
          facilityId,
          archivedAt: null,
        },
        data: { archivedAt: new Date() },
      });
    }

    const updatedAmendment = await tx.contractAmendment.update({
      where: { id: amendment.id },
      data: {
        status: 'applied',
        appliedByUserId,
        appliedAt: new Date(),
      },
      select: amendmentSelect,
    });

    return updatedAmendment;
  });

  if (
    amendment.monthlyValue === null &&
    hasPricingImpactingChanges &&
    amendment.contract.facilityId
  ) {
    try {
      const nextServiceFrequency =
        amendment.serviceFrequency ?? amendment.contract.serviceFrequency ?? '5x_week';
      const repriced = await calculatePricing(
        {
          facilityId: amendment.contract.facilityId,
          serviceFrequency: nextServiceFrequency,
        },
        {
          accountId: amendment.contract.accountId,
        }
      );

      await prisma.contract.update({
        where: { id: amendment.contractId },
        data: {
          monthlyValue: Number(repriced.monthlyTotal.toFixed(2)),
        },
      });
    } catch (error) {
      console.warn('Failed to auto-recalculate contract pricing after amendment apply', {
        amendmentId: amendment.id,
        contractId: amendment.contractId,
        error,
      });
    }
  }

  const shouldRegenerateRecurringJobs =
    amendment.contract.status === 'active' &&
    (amendment.serviceFrequency !== null ||
      amendment.serviceSchedule !== null ||
      (areaChanges.create?.length || 0) > 0 ||
      (areaChanges.update?.length || 0) > 0 ||
      (areaChanges.archiveIds?.length || 0) > 0 ||
      (taskChanges.create?.length || 0) > 0 ||
      (taskChanges.update?.length || 0) > 0 ||
      (taskChanges.archiveIds?.length || 0) > 0);

  if (shouldRegenerateRecurringJobs) {
    const effectiveDate = new Date(`${amendment.effectiveDate.toISOString().slice(0, 10)}T00:00:00.000Z`);
    const today = new Date();
    const anchorDate = effectiveDate > today ? effectiveDate : today;

    const contractLatest = await prisma.contract.findUnique({
      where: { id: amendment.contractId },
      select: {
        startDate: true,
        endDate: true,
        assignedTeamId: true,
        assignedToUserId: true,
      },
    });

    if (contractLatest && (contractLatest.assignedTeamId || contractLatest.assignedToUserId)) {
      const endWindow = new Date(anchorDate.getTime());
      endWindow.setUTCMonth(endWindow.getUTCMonth() + 2);
      if (contractLatest.endDate && contractLatest.endDate < endWindow) {
        endWindow.setTime(contractLatest.endDate.getTime());
      }

      await prisma.job.updateMany({
        where: {
          contractId: amendment.contractId,
          jobCategory: 'recurring',
          status: 'scheduled',
          scheduledDate: {
            gte: new Date(`${anchorDate.toISOString().slice(0, 10)}T00:00:00.000Z`),
          },
        },
        data: {
          status: 'canceled',
          completionNotes: `Canceled due to amendment ${result.title} applied`,
        },
      });

      await generateJobsFromContract({
        contractId: amendment.contractId,
        dateFrom: new Date(`${anchorDate.toISOString().slice(0, 10)}T00:00:00.000Z`),
        dateTo: endWindow,
        assignedTeamId: contractLatest.assignedToUserId ? null : contractLatest.assignedTeamId,
        assignedToUserId: contractLatest.assignedToUserId,
        createdByUserId: appliedByUserId,
      });
    }
  }

  return result;
}
