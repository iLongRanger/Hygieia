import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';
import { createBulkNotifications } from './notificationService';

export type JobSettlementStatus =
  | 'ready'
  | 'needs_review'
  | 'approved_invoice_only'
  | 'approved_payroll_only'
  | 'approved_both'
  | 'excluded';

export interface SubmitJobSettlementExplanationInput {
  explanation: string;
}

export interface ReviewJobSettlementInput {
  decision: Exclude<JobSettlementStatus, 'ready' | 'needs_review'>;
  reviewNotes?: string | null;
}

export const jobSettlementReviewSelect = {
  id: true,
  status: true,
  issueCode: true,
  issueSummary: true,
  workerExplanation: true,
  workerRespondedAt: true,
  reviewNotes: true,
  reviewedAt: true,
  reviewedByUser: {
    select: {
      id: true,
      fullName: true,
    },
  },
  lastWorkerReminderAt: true,
  lastManagerReminderAt: true,
} satisfies Prisma.JobSettlementReviewSelect;

type JobSettlementReviewRecord = Prisma.JobSettlementReviewGetPayload<{
  select: typeof jobSettlementReviewSelect;
}>;

function getSettlementStatus(
  review: JobSettlementReviewRecord | null | undefined
): JobSettlementStatus {
  const status = review?.status;
  if (
    status === 'needs_review' ||
    status === 'approved_invoice_only' ||
    status === 'approved_payroll_only' ||
    status === 'approved_both' ||
    status === 'excluded'
  ) {
    return status;
  }
  return 'ready';
}

export function getJobSettlementView(
  jobStatus: string,
  review: JobSettlementReviewRecord | null | undefined
) {
  const status = getSettlementStatus(review);
  const invoiceEligible =
    status === 'approved_invoice_only' ||
    status === 'approved_both' ||
    (status === 'ready' && jobStatus === 'completed');
  const payrollEligible =
    status === 'approved_payroll_only' ||
    status === 'approved_both' ||
    (status === 'ready' && jobStatus === 'completed');

  return {
    id: review?.id ?? null,
    status,
    issueCode: review?.issueCode ?? null,
    issueSummary: review?.issueSummary ?? null,
    workerExplanation: review?.workerExplanation ?? null,
    workerRespondedAt: review?.workerRespondedAt ?? null,
    reviewNotes: review?.reviewNotes ?? null,
    reviewedAt: review?.reviewedAt ?? null,
    reviewedByUser: review?.reviewedByUser ?? null,
    lastWorkerReminderAt: review?.lastWorkerReminderAt ?? null,
    lastManagerReminderAt: review?.lastManagerReminderAt ?? null,
    requiresManagerReview: status === 'needs_review',
    invoiceEligible,
    payrollEligible,
  };
}

async function getAdminAndManagerUserIdsForAccount(accountId: string): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: {
      status: 'active',
      OR: [
        {
          managedAccounts: {
            some: { id: accountId },
          },
        },
        {
          roles: {
            some: {
              role: { key: { in: ['owner', 'admin'] } },
            },
          },
        },
      ],
    },
    select: { id: true },
  });

  return [...new Set(users.map((user) => user.id))];
}

async function getAssignedRecipientUserIds(jobId: string): Promise<string[]> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      assignedToUserId: true,
      assignedTeam: {
        select: {
          users: {
            where: { status: { in: ['active', 'pending'] } },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!job) {
    return [];
  }

  const userIds = new Set<string>();
  if (job.assignedToUserId) {
    userIds.add(job.assignedToUserId);
  }
  for (const user of job.assignedTeam?.users ?? []) {
    userIds.add(user.id);
  }

  return [...userIds];
}

export async function flagJobForSettlementReview(input: {
  jobId: string;
  issueCode: string;
  issueSummary: string;
  notifyWorker?: boolean;
  notifyManagers?: boolean;
}): Promise<void> {
  const job = await prisma.job.findUnique({
    where: { id: input.jobId },
    select: {
      id: true,
      jobNumber: true,
      status: true,
      accountId: true,
      facility: { select: { name: true } },
      settlementReview: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!job) {
    throw new NotFoundError('Job not found');
  }

  const currentStatus = getSettlementStatus(job.settlementReview as JobSettlementReviewRecord | null);
  if (currentStatus === 'needs_review') {
    return;
  }

  await prisma.jobSettlementReview.upsert({
    where: { jobId: input.jobId },
    create: {
      jobId: input.jobId,
      status: 'needs_review',
      issueCode: input.issueCode,
      issueSummary: input.issueSummary,
      lastWorkerReminderAt: input.notifyWorker ? new Date() : null,
      lastManagerReminderAt: input.notifyManagers ? new Date() : null,
    },
    update: {
      status: 'needs_review',
      issueCode: input.issueCode,
      issueSummary: input.issueSummary,
      reviewedAt: null,
      reviewedByUserId: null,
      reviewNotes: null,
      ...(input.notifyWorker ? { lastWorkerReminderAt: new Date() } : {}),
      ...(input.notifyManagers ? { lastManagerReminderAt: new Date() } : {}),
    },
  });

  await prisma.jobActivity.create({
    data: {
      jobId: input.jobId,
      action: 'settlement_review_requested',
      metadata: {
        issueCode: input.issueCode,
        issueSummary: input.issueSummary,
      },
    },
  });

  const notificationTitle = `Job ${job.jobNumber} needs follow-up`;
  const notificationBody = `${job.jobNumber} at ${job.facility.name} needs follow-up before invoicing or payroll can proceed.`;

  if (input.notifyWorker) {
    const workerUserIds = await getAssignedRecipientUserIds(input.jobId);
    if (workerUserIds.length > 0) {
      await createBulkNotifications(workerUserIds, {
        type: 'job_settlement_follow_up',
        title: notificationTitle,
        body: `${notificationBody} Complete the job or explain why it was not closed properly.`,
        metadata: {
          jobId: job.id,
          jobNumber: job.jobNumber,
          issueCode: input.issueCode,
          issueSummary: input.issueSummary,
        },
      });
    }
  }

  if (input.notifyManagers) {
    const managerUserIds = await getAdminAndManagerUserIdsForAccount(job.accountId);
    if (managerUserIds.length > 0) {
      await createBulkNotifications(managerUserIds, {
        type: 'job_settlement_manager_review',
        title: notificationTitle,
        body: notificationBody,
        metadata: {
          jobId: job.id,
          jobNumber: job.jobNumber,
          issueCode: input.issueCode,
          issueSummary: input.issueSummary,
        },
      });
    }
  }
}

export async function clearJobSettlementReview(jobId: string): Promise<void> {
  const existing = await prisma.jobSettlementReview.findUnique({
    where: { jobId },
    select: { id: true },
  });

  if (!existing) {
    return;
  }

  await prisma.jobSettlementReview.update({
    where: { jobId },
    data: {
      status: 'ready',
      issueCode: null,
      issueSummary: null,
      reviewNotes: null,
      reviewedAt: null,
      reviewedByUserId: null,
    },
  });
}

export async function submitJobSettlementExplanation(
  jobId: string,
  userId: string,
  input: SubmitJobSettlementExplanationInput
) {
  const explanation = input.explanation.trim();
  if (!explanation) {
    throw new BadRequestError('Explanation is required');
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      jobNumber: true,
      accountId: true,
      assignedToUserId: true,
      assignedTeamId: true,
      assignedTeam: {
        select: {
          users: {
            where: { status: { in: ['active', 'pending'] } },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!job) {
    throw new NotFoundError('Job not found');
  }

  const allowedUserIds = new Set<string>();
  if (job.assignedToUserId) {
    allowedUserIds.add(job.assignedToUserId);
  }
  for (const teamUser of job.assignedTeam?.users ?? []) {
    allowedUserIds.add(teamUser.id);
  }
  if (!allowedUserIds.has(userId)) {
    throw new BadRequestError('Only the assigned worker can explain this job');
  }

  const review = await prisma.jobSettlementReview.upsert({
    where: { jobId },
    create: {
      jobId,
      status: 'needs_review',
      issueCode: 'worker_follow_up',
      issueSummary: 'Worker explanation submitted for a job that still needs review.',
      workerExplanation: explanation,
      workerRespondedAt: new Date(),
    },
    update: {
      status: 'needs_review',
      workerExplanation: explanation,
      workerRespondedAt: new Date(),
    },
    select: jobSettlementReviewSelect,
  });

  await prisma.jobActivity.create({
    data: {
      jobId,
      action: 'settlement_explanation_submitted',
      performedByUserId: userId,
      metadata: {
        explanation,
      },
    },
  });

  const managerUserIds = await getAdminAndManagerUserIdsForAccount(job.accountId);
  if (managerUserIds.length > 0) {
    await createBulkNotifications(managerUserIds, {
      type: 'job_settlement_explanation_submitted',
      title: `Explanation submitted for ${job.jobNumber}`,
      body: `A worker submitted a follow-up explanation for ${job.jobNumber}.`,
      metadata: {
        jobId,
        jobNumber: job.jobNumber,
      },
    });
  }

  return getJobSettlementView('in_progress', review);
}

export async function reviewJobSettlement(
  jobId: string,
  reviewerId: string,
  input: ReviewJobSettlementInput
) {
  const review = await prisma.jobSettlementReview.upsert({
    where: { jobId },
    create: {
      jobId,
      status: input.decision,
      reviewNotes: input.reviewNotes ?? null,
      reviewedByUserId: reviewerId,
      reviewedAt: new Date(),
    },
    update: {
      status: input.decision,
      reviewNotes: input.reviewNotes ?? null,
      reviewedByUserId: reviewerId,
      reviewedAt: new Date(),
    },
    select: {
      ...jobSettlementReviewSelect,
      job: {
        select: {
          id: true,
          jobNumber: true,
          status: true,
          assignedToUserId: true,
          assignedTeam: {
            select: {
              users: {
                where: { status: { in: ['active', 'pending'] } },
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });

  await prisma.jobActivity.create({
    data: {
      jobId,
      action: 'settlement_reviewed',
      performedByUserId: reviewerId,
      metadata: {
        decision: input.decision,
        reviewNotes: input.reviewNotes ?? null,
      },
    },
  });

  const workerUserIds = new Set<string>();
  if (review.job.assignedToUserId) {
    workerUserIds.add(review.job.assignedToUserId);
  }
  for (const teamUser of review.job.assignedTeam?.users ?? []) {
    workerUserIds.add(teamUser.id);
  }
  if (workerUserIds.size > 0) {
    await createBulkNotifications([...workerUserIds], {
      type: 'job_settlement_reviewed',
      title: `Review completed for ${review.job.jobNumber}`,
      body: `A manager reviewed ${review.job.jobNumber} and updated its settlement decision.`,
      metadata: {
        jobId,
        jobNumber: review.job.jobNumber,
        decision: input.decision,
      },
    });
  }

  return getJobSettlementView(review.job.status, review);
}
