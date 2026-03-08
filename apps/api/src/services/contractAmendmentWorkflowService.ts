import { prisma } from '../lib/prisma';
import logger from '../lib/logger';
import { logContractActivity } from './contractActivityService';
import { regenerateRecurringJobsForContract } from './jobService';
import { applyContractAmendment, getContractAmendmentById } from './contractAmendmentService';

export interface ApplyContractAmendmentWorkflowResult {
  amendment: Awaited<ReturnType<typeof applyContractAmendment>>;
  recurringJobs: { canceled: number; created: number } | null;
  appliedEarly: boolean;
}

export interface ContractAmendmentAutoApplyCycleResult {
  checked: number;
  due: number;
  applied: number;
  failed: number;
  jobsCanceled: number;
  jobsCreated: number;
}

function getLocalStartOfDay(value: Date): Date {
  const local = new Date(value);
  local.setHours(0, 0, 0, 0);
  return local;
}

export function isApplyingAmendmentEarly(effectiveDate: Date, now: Date = new Date()): boolean {
  return getLocalStartOfDay(effectiveDate).getTime() > getLocalStartOfDay(now).getTime();
}

export function isAmendmentDueForAutomaticApply(
  effectiveDate: Date,
  now: Date = new Date()
): boolean {
  return !isApplyingAmendmentEarly(effectiveDate, now);
}

export async function applyContractAmendmentWorkflow(
  amendmentId: string,
  options?: {
    appliedByUserId?: string | null;
    actorUserId?: string | null;
    forceApply?: boolean;
    now?: Date;
    source?: 'manual' | 'automatic';
  }
): Promise<ApplyContractAmendmentWorkflowResult> {
  const existing = await getContractAmendmentById(amendmentId);
  if (!existing) {
    throw new Error('Amendment not found');
  }

  const now = options?.now ?? new Date();
  const appliedEarly = isApplyingAmendmentEarly(existing.effectiveDate, now);
  if (appliedEarly && !options?.forceApply) {
    throw new Error(
      `This contract change starts on ${existing.effectiveDate.toISOString().slice(0, 10)}. ` +
        'Review it now, or confirm an early apply override if you need it to start today.'
    );
  }

  const actorUserId =
    options?.actorUserId ?? existing.approvedByUser?.id ?? existing.createdByUser.id;
  if (!actorUserId) {
    throw new Error('Amendment apply requires an actor user');
  }

  const appliedByUserId =
    options?.appliedByUserId === undefined ? actorUserId : options.appliedByUserId;

  const amendment = await applyContractAmendment(amendmentId, appliedByUserId, actorUserId);
  const recurringJobs = await regenerateRecurringJobsForContract({
    contractId: amendment.contractId,
    createdByUserId: actorUserId,
    reason:
      options?.source === 'automatic'
        ? `Contract amendment #${amendment.amendmentNumber} auto-applied`
        : `Contract amendment #${amendment.amendmentNumber} applied`,
  });

  await logContractActivity({
    contractId: amendment.contractId,
    action: 'amendment_applied',
    performedByUserId: appliedByUserId ?? undefined,
    metadata: {
      amendmentId: amendment.id,
      amendmentNumber: amendment.amendmentNumber,
      appliedEarly,
      jobsCanceled: recurringJobs?.canceled ?? 0,
      jobsCreated: recurringJobs?.created ?? 0,
      source: options?.source ?? 'manual',
    },
  });

  return {
    amendment,
    recurringJobs,
    appliedEarly,
  };
}

export async function runContractAmendmentAutoApplyCycle(
  anchorDate: Date = new Date()
): Promise<ContractAmendmentAutoApplyCycleResult> {
  const candidates = await prisma.contractAmendment.findMany({
    where: {
      archivedAt: null,
      status: 'approved',
      appliedAt: null,
      contract: {
        archivedAt: null,
        status: 'active',
      },
    },
    select: {
      id: true,
      effectiveDate: true,
    },
    orderBy: [{ effectiveDate: 'asc' }, { createdAt: 'asc' }],
  });

  let due = 0;
  let applied = 0;
  let failed = 0;
  let jobsCanceled = 0;
  let jobsCreated = 0;

  for (const candidate of candidates) {
    if (!isAmendmentDueForAutomaticApply(candidate.effectiveDate, anchorDate)) {
      continue;
    }

    due += 1;
    try {
      const result = await applyContractAmendmentWorkflow(candidate.id, {
        appliedByUserId: null,
        forceApply: false,
        now: anchorDate,
        source: 'automatic',
      });
      applied += 1;
      jobsCanceled += result.recurringJobs?.canceled ?? 0;
      jobsCreated += result.recurringJobs?.created ?? 0;
    } catch (error) {
      failed += 1;
      logger.error('Failed to auto-apply contract amendment', {
        amendmentId: candidate.id,
        error,
      });
    }
  }

  return {
    checked: candidates.length,
    due,
    applied,
    failed,
    jobsCanceled,
    jobsCreated,
  };
}
