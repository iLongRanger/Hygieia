import { prisma } from '../lib/prisma';
import logger from '../lib/logger';
import { createBulkNotifications } from './notificationService';
import { logContractActivity } from './contractActivityService';

export interface ContractAssignmentOverrideCycleResult {
  checked: number;
  applied: number;
  reassignedJobs: number;
  notifications: number;
}

interface DueContractOverride {
  id: string;
  contractNumber: string;
  title: string;
  account: { name: string; accountManagerId: string | null };
  createdByUserId: string;
  assignedTeamId: string | null;
  assignedToUserId: string | null;
  subcontractorTier: string | null;
  pendingAssignedTeamId: string | null;
  pendingAssignedToUserId: string | null;
  pendingSubcontractorTier: string | null;
  assignmentOverrideEffectiveDate: Date | null;
  assignmentOverrideSetByUserId: string | null;
  pendingAssignedTeam: { id: string; name: string } | null;
  pendingAssignedToUser: { id: string; fullName: string } | null;
  assignedTeam: { id: string; name: string } | null;
  assignedToUser: { id: string; fullName: string } | null;
}

function atUtcStartOfDay(value: Date): Date {
  const isoDate = value.toISOString().slice(0, 10);
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function isMissingOverrideColumnsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { code?: string; meta?: { column?: string } };
  if (maybeError.code !== 'P2022') return false;
  const column = maybeError.meta?.column ?? '';
  return column.includes('contracts.pending_assigned_') || column.includes('contracts.assignment_override_');
}

async function getTeamUserIds(teamId: string | null): Promise<string[]> {
  if (!teamId) return [];

  const users = await prisma.user.findMany({
    where: {
      teamId,
      status: { in: ['active', 'pending'] },
    },
    select: { id: true },
  });

  return users.map((user) => user.id);
}

async function applyContractAssignmentOverride(
  contract: DueContractOverride
): Promise<{
  applied: boolean;
  reassignedJobs: number;
  notifications: number;
}> {
  const effectiveDate = contract.assignmentOverrideEffectiveDate;
  if (!effectiveDate) {
    return { applied: false, reassignedJobs: 0, notifications: 0 };
  }

  const nextTeamId = contract.pendingAssignedTeamId ?? null;
  const nextUserId = contract.pendingAssignedToUserId ?? null;

  if (!nextTeamId && !nextUserId) {
    return { applied: false, reassignedJobs: 0, notifications: 0 };
  }

  const updateResult = await prisma.$transaction(async (tx) => {
    const jobsResult = await tx.job.updateMany({
      where: {
        contractId: contract.id,
        status: 'scheduled',
        scheduledDate: {
          gte: effectiveDate,
        },
      },
      data: {
        assignedTeamId: nextTeamId,
        assignedToUserId: nextUserId,
      },
    });

    await tx.contract.update({
      where: { id: contract.id },
      data: {
        assignedTeamId: nextTeamId,
        assignedToUserId: nextUserId,
        subcontractorTier: nextTeamId
          ? contract.pendingSubcontractorTier ?? contract.subcontractorTier
          : contract.subcontractorTier,
        pendingAssignedTeamId: null,
        pendingAssignedToUserId: null,
        pendingSubcontractorTier: null,
        assignmentOverrideEffectiveDate: null,
        assignmentOverrideSetByUserId: null,
        assignmentOverrideSetAt: null,
      },
    });

    return jobsResult;
  });

  await logContractActivity({
    contractId: contract.id,
    action: 'assignment_override_applied',
    performedByUserId: contract.assignmentOverrideSetByUserId,
    metadata: {
      effectiveDate: effectiveDate.toISOString(),
      previousTeamId: contract.assignedTeamId,
      previousAssignedToUserId: contract.assignedToUserId,
      nextTeamId,
      nextAssignedToUserId: nextUserId,
      reassignedScheduledJobs: updateResult.count,
    },
  });

  const recipientIds = new Set<string>();
  recipientIds.add(contract.createdByUserId);
  if (contract.account.accountManagerId) recipientIds.add(contract.account.accountManagerId);
  if (contract.assignmentOverrideSetByUserId) recipientIds.add(contract.assignmentOverrideSetByUserId);
  if (contract.assignedToUserId) recipientIds.add(contract.assignedToUserId);
  if (nextUserId) recipientIds.add(nextUserId);

  const [oldTeamUserIds, newTeamUserIds] = await Promise.all([
    getTeamUserIds(contract.assignedTeamId ?? null),
    getTeamUserIds(nextTeamId),
  ]);

  for (const userId of oldTeamUserIds) recipientIds.add(userId);
  for (const userId of newTeamUserIds) recipientIds.add(userId);

  let notifications = 0;
  if (recipientIds.size > 0) {
    const fromLabel =
      contract.assignedToUser?.fullName ?? contract.assignedTeam?.name ?? 'current assignee';
    const toLabel =
      contract.pendingAssignedToUser?.fullName ?? contract.pendingAssignedTeam?.name ?? 'new assignee';
    const created = await createBulkNotifications([...recipientIds], {
      type: 'contract_assignment_override_applied',
      title: `Contract assignment updated: ${contract.contractNumber}`,
      body:
        `Assignment changed from ${fromLabel} to ${toLabel}. ` +
        `${updateResult.count} scheduled job${updateResult.count === 1 ? '' : 's'} were reassigned.`,
      metadata: {
        contractId: contract.id,
        effectiveDate: effectiveDate.toISOString(),
        previousTeamId: contract.assignedTeamId,
        previousAssignedToUserId: contract.assignedToUserId,
        nextTeamId,
        nextAssignedToUserId: nextUserId,
        reassignedScheduledJobs: updateResult.count,
      },
    });
    notifications = created.length;
  }

  return {
    applied: true,
    reassignedJobs: updateResult.count,
    notifications,
  };
}

export async function applyDueContractAssignmentOverrideForContract(
  contractId: string,
  anchorDate: Date = new Date()
): Promise<boolean> {
  const todayUtc = atUtcStartOfDay(anchorDate);
  let contract: DueContractOverride | null;
  try {
    contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        archivedAt: null,
        status: 'active',
        assignmentOverrideEffectiveDate: { lte: todayUtc },
        OR: [{ pendingAssignedTeamId: { not: null } }, { pendingAssignedToUserId: { not: null } }],
      },
      select: {
        id: true,
        contractNumber: true,
        title: true,
        account: { select: { name: true, accountManagerId: true } },
        createdByUserId: true,
        assignedTeamId: true,
        assignedToUserId: true,
        subcontractorTier: true,
        pendingAssignedTeamId: true,
        pendingAssignedToUserId: true,
        pendingSubcontractorTier: true,
        assignmentOverrideEffectiveDate: true,
        assignmentOverrideSetByUserId: true,
        pendingAssignedTeam: { select: { id: true, name: true } },
        pendingAssignedToUser: { select: { id: true, fullName: true } },
        assignedTeam: { select: { id: true, name: true } },
        assignedToUser: { select: { id: true, fullName: true } },
      },
    });
  } catch (error) {
    if (isMissingOverrideColumnsError(error)) {
      logger.warn(
        'Contract assignment override apply skipped: pending override columns are not available yet. Run DB migrations.'
      );
      return false;
    }
    throw error;
  }

  if (!contract) {
    return false;
  }

  try {
    const result = await applyContractAssignmentOverride(contract);
    return result.applied;
  } catch (error) {
    logger.error('Failed to apply due contract assignment override for contract', {
      contractId,
      error,
    });
    return false;
  }
}

export async function runContractAssignmentOverrideCycle(
  anchorDate: Date = new Date()
): Promise<ContractAssignmentOverrideCycleResult> {
  const todayUtc = atUtcStartOfDay(anchorDate);
  let dueContracts;
  try {
    dueContracts = await prisma.contract.findMany({
      where: {
        archivedAt: null,
        status: 'active',
        assignmentOverrideEffectiveDate: { lte: todayUtc },
        OR: [
          { pendingAssignedTeamId: { not: null } },
          { pendingAssignedToUserId: { not: null } },
        ],
      },
      select: {
        id: true,
        contractNumber: true,
        title: true,
        account: { select: { name: true, accountManagerId: true } },
        createdByUserId: true,
        assignedTeamId: true,
        assignedToUserId: true,
        subcontractorTier: true,
        pendingAssignedTeamId: true,
        pendingAssignedToUserId: true,
        pendingSubcontractorTier: true,
        assignmentOverrideEffectiveDate: true,
        assignmentOverrideSetByUserId: true,
        pendingAssignedTeam: { select: { id: true, name: true } },
        pendingAssignedToUser: { select: { id: true, fullName: true } },
        assignedTeam: { select: { id: true, name: true } },
        assignedToUser: { select: { id: true, fullName: true } },
      },
    });
  } catch (error) {
    if (isMissingOverrideColumnsError(error)) {
      logger.warn(
        'Contract assignment override cycle skipped: pending override columns are not available yet. Run DB migrations.'
      );
      return {
        checked: 0,
        applied: 0,
        reassignedJobs: 0,
        notifications: 0,
      };
    }
    throw error;
  }

  let applied = 0;
  let reassignedJobs = 0;
  let notifications = 0;

  for (const contract of dueContracts) {
    try {
      const result = await applyContractAssignmentOverride(contract);
      if (!result.applied) {
        continue;
      }
      applied += 1;
      reassignedJobs += result.reassignedJobs;
      notifications += result.notifications;
    } catch (error) {
      logger.error('Failed to apply contract assignment override', {
        contractId: contract.id,
        error,
      });
    }
  }

  return {
    checked: dueContracts.length,
    applied,
    reassignedJobs,
    notifications,
  };
}
