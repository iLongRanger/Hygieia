import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { getCoordinatesFromAddress, validateGeofence } from '../lib/geofence';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';
import { createBulkNotifications, createNotification } from './notificationService';
import { sendSms } from './smsService';
import { completeInitialClean as completeContractInitialClean } from './contractService';
import {
  clearJobSettlementReview,
  flagJobForSettlementReview,
  getJobSettlementView,
  jobSettlementReviewSelect,
  type JobSettlementStatus,
} from './jobSettlementService';
import {
  extractFacilityTimezone,
  normalizeServiceSchedule,
  type ServiceWeekday,
  validateServiceWindow,
} from './serviceScheduleService';

// ==================== Interfaces ====================

export interface JobListParams {
  contractId?: string;
  quotationId?: string;
  facilityId?: string;
  accountId?: string;
  assignedTeamId?: string;
  assignedToUserId?: string;
  jobType?: string;
  jobCategory?: string;
  status?: string;
  settlementStatus?: JobSettlementStatus;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface JobCreateInput {
  contractId: string;
  facilityId: string;
  accountId: string;
  jobType?: string;
  jobCategory?: string;
  assignedTeamId?: string | null;
  assignedToUserId?: string | null;
  scheduledDate: Date;
  scheduledStartTime?: Date | null;
  scheduledEndTime?: Date | null;
  estimatedHours?: number | null;
  notes?: string | null;
  createdByUserId: string;
}

export interface JobUpdateInput {
  assignedTeamId?: string | null;
  assignedToUserId?: string | null;
  scheduledDate?: Date;
  scheduledStartTime?: Date | null;
  scheduledEndTime?: Date | null;
  estimatedHours?: number | null;
  notes?: string | null;
}

export interface JobCompleteInput {
  completionNotes?: string | null;
  actualHours?: number | null;
  userId: string;
  userRole?: string;
  geoLocation?: { latitude: number; longitude: number; accuracy?: number } | null;
}

export interface JobTaskCreateInput {
  facilityTaskId?: string | null;
  taskName: string;
  description?: string | null;
  estimatedMinutes?: number | null;
}

export interface JobTaskUpdateInput {
  status?: string;
  actualMinutes?: number | null;
  notes?: string | null;
  completedByUserId?: string | null;
}

export interface JobNoteCreateInput {
  noteType?: string;
  content: string;
  photoUrl?: string | null;
  createdByUserId: string;
}

export interface GenerateJobsInput {
  contractId: string;
  dateFrom: Date;
  dateTo: Date;
  assignedTeamId?: string | null;
  assignedToUserId?: string | null;
  createdByUserId: string;
  ignoreCanceledExistingJobs?: boolean;
}

export interface StartJobOptions {
  managerOverride?: boolean;
  overrideReason?: string | null;
  userRole?: string;
  geoLocation?: { latitude: number; longitude: number; accuracy?: number } | null;
}

type WorkforceAssignmentType =
  | 'unassigned'
  | 'internal_employee'
  | 'subcontractor_team';

interface InitialCleanStatus {
  included: boolean;
  completed: boolean;
  completedAt: Date | null;
  eligibleJobId: string | null;
  canCompleteOnThisJob: boolean;
}

function readCalendarColor(source: unknown): string | null {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return null;
  }

  const calendarColor = (source as Record<string, unknown>).calendarColor;
  return typeof calendarColor === 'string' ? calendarColor : null;
}

function normalizeGeoLocation(geoLocation: {
  latitude: number;
  longitude: number;
  accuracy?: number;
}): { latitude: number; longitude: number; accuracy: number | null } {
  return {
    latitude: geoLocation.latitude,
    longitude: geoLocation.longitude,
    accuracy: geoLocation.accuracy ?? null,
  };
}

async function getTeamUserIds(teamId: string | null): Promise<string[]> {
  if (!teamId) {
    return [];
  }

  const users = await prisma.user.findMany({
    where: {
      teamId,
      status: { in: ['active', 'pending'] },
    },
    select: { id: true },
  });

  return users.map((user) => user.id);
}

async function notifyJobAssignmentRecipients(input: {
  job: {
    id: string;
    jobNumber: string;
    facility: { name: string };
    assignedTeam: { id: string; name?: string } | null;
    assignedToUser: { id: string } | null;
  };
  previousAssignedTeamId?: string | null;
  previousAssignedToUserId?: string | null;
}) {
  const nextAssignedTeamId = input.job.assignedTeam?.id ?? null;
  const nextAssignedToUserId = input.job.assignedToUser?.id ?? null;
  const previousAssignedTeamId = input.previousAssignedTeamId ?? null;
  const previousAssignedToUserId = input.previousAssignedToUserId ?? null;

  if (
    nextAssignedTeamId === previousAssignedTeamId &&
    nextAssignedToUserId === previousAssignedToUserId
  ) {
    return;
  }

  if (!nextAssignedTeamId && !nextAssignedToUserId) {
    return;
  }

  if (nextAssignedToUserId) {
    await createNotification({
      userId: nextAssignedToUserId,
      type: 'job_assigned',
      title: `Job ${input.job.jobNumber} assigned to you`,
      body: `You have been assigned job ${input.job.jobNumber} at ${input.job.facility.name}.`,
      metadata: {
        jobId: input.job.id,
        jobNumber: input.job.jobNumber,
        facilityName: input.job.facility.name,
        assignedToUserId: nextAssignedToUserId,
      },
    });
    return;
  }

  const recipientUserIds = await getTeamUserIds(nextAssignedTeamId);
  if (recipientUserIds.length === 0 || !input.job.assignedTeam) {
    return;
  }

  await createBulkNotifications(recipientUserIds, {
    type: 'job_assigned',
    title: input.job.assignedTeam.name
      ? `Job ${input.job.jobNumber} assigned to ${input.job.assignedTeam.name}`
      : `Job ${input.job.jobNumber} assigned to your team`,
    body: `Job ${input.job.jobNumber} at ${input.job.facility.name} has been assigned to your team.`,
    metadata: {
      jobId: input.job.id,
      jobNumber: input.job.jobNumber,
      facilityName: input.job.facility.name,
      assignedTeamId: nextAssignedTeamId,
    },
  });
}

async function notifyBulkJobAssignmentRecipients(input: {
  jobs: {
    id: string;
    jobNumber: string;
    facility: { name: string };
    assignedTeamId: string | null;
    assignedToUserId: string | null;
  }[];
  nextAssignedTeamId: string | null;
  nextAssignedToUserId: string | null;
}): Promise<number> {
  let notifications = 0;

  for (const job of input.jobs) {
    const previousAssignedTeamId = job.assignedTeamId ?? null;
    const previousAssignedToUserId = job.assignedToUserId ?? null;

    if (
      previousAssignedTeamId === input.nextAssignedTeamId &&
      previousAssignedToUserId === input.nextAssignedToUserId
    ) {
      continue;
    }

    if (input.nextAssignedToUserId) {
      const created = await createNotification({
        userId: input.nextAssignedToUserId,
        type: 'job_assigned',
        title: `Job ${job.jobNumber} assigned to you`,
        body: `You have been assigned job ${job.jobNumber} at ${job.facility.name}.`,
        metadata: {
          jobId: job.id,
          jobNumber: job.jobNumber,
          facilityName: job.facility.name,
          assignedToUserId: input.nextAssignedToUserId,
        },
      });
      if (created) {
        notifications += 1;
      }
      continue;
    }

    if (input.nextAssignedTeamId) {
      const recipientUserIds = await getTeamUserIds(input.nextAssignedTeamId);
      if (recipientUserIds.length === 0) {
        continue;
      }

      const created = await createBulkNotifications(recipientUserIds, {
        type: 'job_assigned',
        title: `Job ${job.jobNumber} assigned to your team`,
        body: `Job ${job.jobNumber} at ${job.facility.name} has been assigned to your team.`,
        metadata: {
          jobId: job.id,
          jobNumber: job.jobNumber,
          facilityName: job.facility.name,
          assignedTeamId: input.nextAssignedTeamId,
        },
      });
      notifications += created.length;
    }
  }

  return notifications;
}

// ==================== Select Objects ====================

const jobSelect = {
  id: true,
  jobNumber: true,
  jobType: true,
  jobCategory: true,
  status: true,
  scheduledDate: true,
  scheduledStartTime: true,
  scheduledEndTime: true,
  actualStartTime: true,
  actualEndTime: true,
  estimatedHours: true,
  actualHours: true,
  notes: true,
  completionNotes: true,
  createdAt: true,
  updatedAt: true,
  contract: {
    select: {
      id: true,
      contractNumber: true,
      title: true,
    },
  },
  quotation: {
    select: {
      id: true,
      quotationNumber: true,
      title: true,
    },
  },
  facility: {
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
    },
  },
  assignedTeam: {
    select: {
      id: true,
      name: true,
      calendarColor: true,
    },
  },
  assignedToUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
      preferences: true,
    },
  },
  createdByUser: {
    select: {
      id: true,
      fullName: true,
    },
  },
  settlementReview: {
    select: jobSettlementReviewSelect,
  },
} satisfies Prisma.JobSelect;

const jobDetailSelect = {
  ...jobSelect,
  facility: {
    select: {
      id: true,
      name: true,
      address: true,
      accessInstructions: true,
      parkingInfo: true,
      specialRequirements: true,
      notes: true,
    },
  },
  account: {
    select: {
      id: true,
      name: true,
      type: true,
      billingPhone: true,
      billingEmail: true,
      contacts: {
        where: {
          archivedAt: null,
        },
        select: {
          id: true,
          name: true,
          phone: true,
          mobile: true,
          email: true,
          title: true,
          isPrimary: true,
        },
        orderBy: [
          { isPrimary: 'desc' as const },
          { createdAt: 'asc' as const },
        ],
        take: 1,
      },
    },
  },
  contract: {
    select: {
      id: true,
      contractNumber: true,
      title: true,
      status: true,
      includesInitialClean: true,
      initialCleanCompleted: true,
      initialCleanCompletedAt: true,
    },
  },
  tasks: {
    select: {
      id: true,
      taskName: true,
      description: true,
      status: true,
      estimatedMinutes: true,
      actualMinutes: true,
      notes: true,
      completedAt: true,
      completedByUser: {
        select: { id: true, fullName: true },
      },
      facilityTask: {
        select: { id: true, customName: true },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  notes_: {
    select: {
      id: true,
      noteType: true,
      content: true,
      photoUrl: true,
      createdAt: true,
      createdByUser: {
        select: { id: true, fullName: true },
      },
    },
    orderBy: { createdAt: 'desc' as const },
  },
  activities: {
    select: {
      id: true,
      action: true,
      metadata: true,
      createdAt: true,
      performedByUser: {
        select: { id: true, fullName: true },
      },
    },
    orderBy: { createdAt: 'desc' as const },
    take: 50,
  },
  settlementReview: {
    select: jobSettlementReviewSelect,
  },
} satisfies Prisma.JobSelect;

// ==================== Job Number Generation ====================

async function generateJobNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `WO-${year}-`;

  const latest = await prisma.job.findFirst({
    where: { jobNumber: { startsWith: prefix } },
    orderBy: { jobNumber: 'desc' },
    select: { jobNumber: true },
  });

  let seq = 1;
  if (latest) {
    const parts = latest.jobNumber.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

const MANAGER_ROLES = new Set(['owner', 'admin', 'manager']);
const AUTO_RECURRING_JOB_LOOKAHEAD_DAYS = 30;
const JOB_NO_CHECKIN_ALERT_ACTION = 'no_checkin_alert_sent';
const JOB_MISSED_NO_CHECKIN_ACTION = 'job_marked_missed_no_checkin';
const JOB_NO_CHECKIN_ALERT_HOURS = 2;

const JS_WEEKDAY_TO_SERVICE_DAY: Partial<Record<number, ServiceWeekday>> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

function assertSingleWorkforceAssignment(input: {
  assignedTeamId?: string | null;
  assignedToUserId?: string | null;
}) {
  if (input.assignedTeamId && input.assignedToUserId) {
    throw new BadRequestError(
      'Assign either a subcontractor team or an internal employee, not both'
    );
  }
}

async function assertNoDirectJobConflict(input: {
  assignedToUserId?: string | null;
  scheduledStartTime?: Date | null;
  scheduledEndTime?: Date | null;
  excludeJobId?: string;
}) {
  if (!input.assignedToUserId || !input.scheduledStartTime || !input.scheduledEndTime) {
    return;
  }

  const conflict = await prisma.job.findFirst({
    where: {
      assignedToUserId: input.assignedToUserId,
      status: { in: ['scheduled', 'in_progress'] },
      ...(input.excludeJobId ? { id: { not: input.excludeJobId } } : {}),
      scheduledStartTime: { lt: input.scheduledEndTime },
      scheduledEndTime: { gt: input.scheduledStartTime },
    },
    select: {
      id: true,
      jobNumber: true,
      scheduledStartTime: true,
      scheduledEndTime: true,
    },
  });

  if (conflict) {
    throw new BadRequestError(
      `Assigned user already has overlapping job ${conflict.jobNumber}`
    );
  }
}

function normalizeSeedTaskName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/^[\s*-•]+/, '').trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeFallbackSeedTaskName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/^[\s*-]+/, '').trim();
  return normalized.length > 0 ? normalized : null;
}

async function buildJobTaskSeedData(facilityId: string, jobId: string, contractId?: string) {
  const facilityTasks = await prisma.facilityTask.findMany({
    where: {
      facilityId,
      archivedAt: null,
    },
    select: {
      id: true,
      customName: true,
      customInstructions: true,
      estimatedMinutes: true,
      taskTemplate: {
        select: {
          name: true,
          estimatedMinutes: true,
        },
      },
    },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  });

  const seededFacilityTasks = facilityTasks
    .map((task) => {
      const taskName = task.customName ?? task.taskTemplate?.name;
      if (!taskName) return null;

      return {
        jobId,
        facilityTaskId: task.id,
        taskName,
        description: task.customInstructions ?? null,
        status: 'pending',
        estimatedMinutes: task.estimatedMinutes ?? task.taskTemplate?.estimatedMinutes ?? null,
      };
    })
    .filter((task): task is NonNullable<typeof task> => task !== null);

  if (seededFacilityTasks.length > 0) {
    return seededFacilityTasks;
  }

  if (!contractId) {
    return [];
  }

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      scopeTasksSnapshot: true,
      quoteSourceType: true,
      quoteSourceId: true,
      residentialPropertyId: true,
      accountId: true,
      proposal: {
        select: {
          proposalServices: {
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              serviceName: true,
              includedTasks: true,
            },
          },
        },
      },
    },
  });

  const scopeSnapshotTasks = (Array.isArray(contract?.scopeTasksSnapshot) ? contract.scopeTasksSnapshot : [])
    .map((task) => normalizeFallbackSeedTaskName(task))
    .filter((task): task is string => Boolean(task))
    .map((taskName) => ({
      jobId,
      facilityTaskId: null,
      taskName,
      description: 'Contract scope snapshot',
      status: 'pending',
      estimatedMinutes: null,
    }));

  if (scopeSnapshotTasks.length > 0) {
    return scopeSnapshotTasks;
  }
  const fallbackTasks = (contract?.proposal?.proposalServices ?? []).flatMap((service) => {
    const includedTasks = Array.isArray(service.includedTasks) ? service.includedTasks : [];
    const normalizedIncludedTasks = includedTasks
      .map((task) => normalizeFallbackSeedTaskName(task))
      .filter((task): task is string => Boolean(task));

    if (normalizedIncludedTasks.length > 0) {
      return normalizedIncludedTasks.map((taskName) => ({
        jobId,
        facilityTaskId: null,
        taskName,
        description: service.serviceName || null,
        status: 'pending',
        estimatedMinutes: null,
      }));
    }

    const serviceName = normalizeFallbackSeedTaskName(service.serviceName);
    return serviceName
      ? [{
          jobId,
          facilityTaskId: null,
          taskName: serviceName,
          description: null,
          status: 'pending',
          estimatedMinutes: null,
        }]
      : [];
  });

  const uniqueTasks = new Map<string, (typeof fallbackTasks)[number]>();
  for (const task of fallbackTasks) {
    const key = `${task.taskName}::${task.description ?? ''}`;
    if (!uniqueTasks.has(key)) {
      uniqueTasks.set(key, task);
    }
  }

  if (uniqueTasks.size > 0) {
    return [...uniqueTasks.values()];
  }

  if (contract?.quoteSourceType === 'residential_quote' && contract.quoteSourceId) {
    const residentialQuote = await prisma.residentialQuote.findUnique({
      where: { id: contract.quoteSourceId },
      select: {
        includedTasks: true,
      },
    });

    const residentialQuoteTasks = (Array.isArray(residentialQuote?.includedTasks) ? residentialQuote.includedTasks : [])
      .map((task) => normalizeFallbackSeedTaskName(task))
      .filter((task): task is string => Boolean(task))
      .map((taskName) => ({
        jobId,
        facilityTaskId: null,
        taskName,
        description: 'Residential quote scope',
        status: 'pending',
        estimatedMinutes: null,
      }));

    if (residentialQuoteTasks.length > 0) {
      return residentialQuoteTasks;
    }
  }

  if (!contract?.residentialPropertyId) {
    if (!contract?.accountId) {
      return [];
    }
    const account = await prisma.account.findUnique({
      where: { id: contract.accountId },
      select: {
        residentialTaskLibrary: true,
      },
    });
    return (Array.isArray(account?.residentialTaskLibrary) ? account.residentialTaskLibrary : [])
      .map((task) => normalizeFallbackSeedTaskName(task))
      .filter((task): task is string => Boolean(task))
      .map((taskName) => ({
        jobId,
        facilityTaskId: null,
        taskName,
        description: 'Residential account scope',
        status: 'pending',
        estimatedMinutes: null,
      }));
  }

  const residentialProperty = await prisma.residentialProperty.findUnique({
    where: { id: contract.residentialPropertyId },
    select: {
      defaultTasks: true,
    },
  });

  return (Array.isArray(residentialProperty?.defaultTasks) ? residentialProperty.defaultTasks : [])
    .map((task) => normalizeFallbackSeedTaskName(task))
    .filter((task): task is string => Boolean(task))
    .map((taskName) => ({
      jobId,
      facilityTaskId: null,
      taskName,
      description: 'Residential property scope',
      status: 'pending',
      estimatedMinutes: null,
    }));
}

function deriveWorkforceAssignmentType(job: {
  assignedTeam?: { id: string } | null;
  assignedToUser?: { id: string } | null;
}): WorkforceAssignmentType {
  if (job.assignedToUser?.id) return 'internal_employee';
  if (job.assignedTeam?.id) return 'subcontractor_team';
  return 'unassigned';
}

function withWorkforceMetadata<T extends {
  assignedTeam?: ({ id: string } & Record<string, unknown>) | null;
  assignedToUser?: ({ id: string } & Record<string, unknown>) | null;
}>(job: T): T & { workforceAssignmentType: WorkforceAssignmentType } {
  return {
    ...job,
    assignedTeam: job.assignedTeam
      ? {
          ...job.assignedTeam,
          calendarColor:
            typeof (job.assignedTeam as Record<string, unknown>).calendarColor === 'string'
              ? ((job.assignedTeam as Record<string, unknown>).calendarColor as string)
              : null,
        }
      : job.assignedTeam,
    assignedToUser: job.assignedToUser
      ? {
          ...job.assignedToUser,
          calendarColor: readCalendarColor((job.assignedToUser as Record<string, unknown>).preferences),
        }
      : job.assignedToUser,
    workforceAssignmentType: deriveWorkforceAssignmentType(job),
  };
}

async function getEligibleInitialCleanJobId(contractId: string): Promise<string | null> {
  const firstEligibleJob = await prisma.job.findFirst({
    where: {
      contractId,
      jobType: 'scheduled_service',
      status: {
        notIn: ['canceled', 'missed'],
      },
    },
    orderBy: [
      { scheduledDate: 'asc' },
      { scheduledStartTime: 'asc' },
      { createdAt: 'asc' },
    ],
    select: { id: true },
  });

  return firstEligibleJob?.id ?? null;
}

async function buildInitialCleanStatus(job: {
  id: string;
  status: string;
  contract: {
    id: string;
    status?: string;
    includesInitialClean?: boolean;
    initialCleanCompleted?: boolean;
    initialCleanCompletedAt?: Date | null;
  } | null;
}): Promise<InitialCleanStatus> {
  if (!job.contract?.id || !job.contract.includesInitialClean) {
    return {
      included: false,
      completed: false,
      completedAt: null,
      eligibleJobId: null,
      canCompleteOnThisJob: false,
    };
  }

  const eligibleJobId = await getEligibleInitialCleanJobId(job.contract.id);
  const canCompleteOnThisJob =
    job.contract.status === 'active' &&
    !job.contract.initialCleanCompleted &&
    eligibleJobId === job.id &&
    ['in_progress', 'completed'].includes(job.status);

  return {
    included: true,
    completed: Boolean(job.contract.initialCleanCompleted),
    completedAt: job.contract.initialCleanCompletedAt ?? null,
    eligibleJobId,
    canCompleteOnThisJob,
  };
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function iterateDateRange(from: Date, to: Date): string[] {
  const startIso = toIsoDate(from);
  const endIso = toIsoDate(to);
  const cursor = new Date(`${startIso}T00:00:00.000Z`);
  const end = new Date(`${endIso}T00:00:00.000Z`);
  const dates: string[] = [];

  while (cursor <= end) {
    dates.push(toIsoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function atUtcStartOfDay(value: Date): Date {
  return new Date(`${toIsoDate(value)}T00:00:00.000Z`);
}

function resolveAutoGenerationWindow(input: {
  contractStartDate: Date;
  contractEndDate?: Date | null;
  anchorDate?: Date;
}): { dateFrom: Date; dateTo: Date } | null {
  const todayUtc = atUtcStartOfDay(input.anchorDate ?? new Date());
  const contractStartUtc = atUtcStartOfDay(input.contractStartDate);
  const dateFrom = contractStartUtc > todayUtc ? contractStartUtc : todayUtc;

  const lookaheadEnd = new Date(dateFrom);
  lookaheadEnd.setUTCDate(lookaheadEnd.getUTCDate() + (AUTO_RECURRING_JOB_LOOKAHEAD_DAYS - 1));

  let dateTo = lookaheadEnd;
  if (input.contractEndDate) {
    const contractEndUtc = atUtcStartOfDay(input.contractEndDate);
    if (contractEndUtc < dateTo) {
      dateTo = contractEndUtc;
    }
  }

  if (dateTo < dateFrom) {
    return null;
  }

  return { dateFrom, dateTo };
}

// ==================== CRUD Operations ====================

export async function listJobs(
  params: JobListParams,
  options?: { userRole?: string; userId?: string; userTeamId?: string }
) {
  const {
    contractId,
    quotationId,
    facilityId,
    accountId,
    assignedTeamId,
    assignedToUserId,
    jobType,
    jobCategory,
    status,
    settlementStatus,
    dateFrom,
    dateTo,
    page = 1,
    limit = 25,
  } = params;

  const where: Prisma.JobWhereInput = {};

  if (options?.userRole === 'manager' && options?.userId) {
    where.account = { accountManagerId: options.userId };
  }

  if (options?.userRole === 'subcontractor' && options?.userTeamId) {
    where.OR = [
      { assignedTeamId: options.userTeamId },
      ...(options.userId ? [{ assignedToUserId: options.userId }] : []),
    ];
  }

  if (contractId) where.contractId = contractId;
  if (quotationId) where.quotationId = quotationId;
  if (facilityId) where.facilityId = facilityId;
  if (accountId) where.accountId = accountId;
  if (assignedTeamId) where.assignedTeamId = assignedTeamId;
  if (assignedToUserId) where.assignedToUserId = assignedToUserId;
  if (jobType) where.jobType = jobType;
  if (jobCategory) where.jobCategory = jobCategory;
  if (status) where.status = status;
  if (settlementStatus === 'ready') {
    where.OR = [
      ...(where.OR ?? []),
      { settlementReview: null },
      { settlementReview: { status: 'ready' } },
    ];
  } else if (settlementStatus) {
    where.settlementReview = { status: settlementStatus };
  }

  if (dateFrom != null || dateTo != null) {
    where.scheduledDate = {};
    if (dateFrom) where.scheduledDate.gte = dateFrom;
    if (dateTo) where.scheduledDate.lte = dateTo;
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.job.findMany({
      where,
      select: jobSelect,
      orderBy: { scheduledDate: 'asc' },
      skip,
      take: limit,
    }),
    prisma.job.count({ where }),
  ]);

  return {
    data: data.map((job) => ({
      ...withWorkforceMetadata(job),
      settlement: getJobSettlementView(job.status, job.settlementReview),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getJobById(id: string) {
  const job = await prisma.job.findUnique({
    where: { id },
    select: jobDetailSelect,
  });
  if (!job) {
    return null;
  }

  const initialClean = await buildInitialCleanStatus(job);
  return {
    ...withWorkforceMetadata(job),
    settlement: getJobSettlementView(job.status, job.settlementReview),
    initialClean,
  };
}

export async function createJob(input: JobCreateInput) {
  assertSingleWorkforceAssignment(input);
  // Validate contract exists and is active
  const contract = await prisma.contract.findUnique({
    where: { id: input.contractId },
    select: { id: true, status: true },
  });
  if (!contract) throw new NotFoundError('Contract not found');
  if (contract.status !== 'active') {
    throw new BadRequestError('Contract must be active to create jobs');
  }

  await assertNoDirectJobConflict({
    assignedToUserId: input.assignedToUserId ?? null,
    scheduledStartTime: input.scheduledStartTime ?? null,
    scheduledEndTime: input.scheduledEndTime ?? null,
  });

  const jobNumber = await generateJobNumber();

  return prisma.$transaction(async (tx) => {
    const job = await tx.job.create({
      data: {
        jobNumber,
        contractId: input.contractId,
        facilityId: input.facilityId,
        accountId: input.accountId,
        jobType: input.jobType ?? 'special_job',
        jobCategory: input.jobCategory ?? 'one_time',
        assignedTeamId: input.assignedTeamId ?? null,
        assignedToUserId: input.assignedToUserId ?? null,
        status: 'scheduled',
        scheduledDate: input.scheduledDate,
        scheduledStartTime: input.scheduledStartTime ?? null,
        scheduledEndTime: input.scheduledEndTime ?? null,
        estimatedHours: input.estimatedHours ?? null,
        notes: input.notes ?? null,
        createdByUserId: input.createdByUserId,
      },
      select: jobSelect,
    });

    const seededTasks = await buildJobTaskSeedData(input.facilityId, job.id, input.contractId);
    if (seededTasks.length > 0) {
      await tx.jobTask.createMany({
        data: seededTasks,
      });
    }

    await tx.jobActivity.create({
      data: {
        jobId: job.id,
        action: 'created',
        performedByUserId: input.createdByUserId,
        metadata: { jobNumber },
      },
    });

    return withWorkforceMetadata(job);
  });
}

export async function updateJob(id: string, input: JobUpdateInput, userId: string) {
  assertSingleWorkforceAssignment(input);
  const existing = await prisma.job.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      assignedTeamId: true,
      assignedToUserId: true,
    },
  });
  if (!existing) throw new NotFoundError('Job not found');
  if (['completed', 'canceled', 'missed'].includes(existing.status)) {
    throw new BadRequestError('Cannot update a completed, canceled, or missed job');
  }

  const timing = await prisma.job.findUnique({
    where: { id },
    select: {
      assignedToUserId: true,
      scheduledStartTime: true,
      scheduledEndTime: true,
    },
  });

  await assertNoDirectJobConflict({
    assignedToUserId:
      input.assignedToUserId !== undefined ? input.assignedToUserId : timing?.assignedToUserId,
    scheduledStartTime:
      input.scheduledStartTime !== undefined ? input.scheduledStartTime : timing?.scheduledStartTime,
    scheduledEndTime:
      input.scheduledEndTime !== undefined ? input.scheduledEndTime : timing?.scheduledEndTime,
    excludeJobId: id,
  });

  const job = await prisma.$transaction(async (tx) => {
    const job = await tx.job.update({
      where: { id },
      data: {
        assignedTeamId: input.assignedTeamId,
        assignedToUserId: input.assignedToUserId,
        scheduledDate: input.scheduledDate,
        scheduledStartTime: input.scheduledStartTime,
        scheduledEndTime: input.scheduledEndTime,
        estimatedHours: input.estimatedHours,
        notes: input.notes,
      },
      select: jobSelect,
    });

    await tx.jobActivity.create({
      data: {
        jobId: id,
        action: 'updated',
        performedByUserId: userId,
        metadata: {},
      },
    });

    return job;
  });

  await notifyJobAssignmentRecipients({
    job,
    previousAssignedTeamId: existing.assignedTeamId,
    previousAssignedToUserId: existing.assignedToUserId,
  });

  return withWorkforceMetadata(job);
}

export async function startJob(id: string, userId: string, options: StartJobOptions = {}) {
  const existing = await prisma.job.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      facilityId: true,
      contract: {
        select: {
          id: true,
          serviceFrequency: true,
          serviceSchedule: true,
          facility: {
            select: {
              address: true,
            },
          },
        },
      },
      facility: {
        select: {
          address: true,
        },
      },
    },
  });
  if (!existing) throw new NotFoundError('Job not found');
  if (existing.status !== 'scheduled') {
    throw new BadRequestError('Only scheduled jobs can be started');
  }

  const hasExplicitSchedule =
    existing.contract?.serviceSchedule !== null &&
    existing.contract?.serviceSchedule !== undefined;
  const normalizedSchedule = hasExplicitSchedule
    ? normalizeServiceSchedule(
        existing.contract?.serviceSchedule,
        existing.contract?.serviceFrequency
      )
    : null;
  if (normalizedSchedule) {
    const timezone = extractFacilityTimezone(
      existing.contract?.facility?.address ?? existing.facility?.address
    );
    if (!timezone) {
      throw new BadRequestError(
        'Facility timezone is required for schedule enforcement'
      );
    }

    const scheduleCheck = validateServiceWindow(normalizedSchedule, timezone, new Date());
    if (!scheduleCheck.allowed) {
      const canOverride = options.managerOverride && MANAGER_ROLES.has(options.userRole ?? '');
      if (!canOverride) {
        throw new BadRequestError(
          'Outside allowed service window',
          {
            code: 'OUTSIDE_SERVICE_WINDOW',
            timezone,
            localTime: scheduleCheck.localTime,
            localDate: scheduleCheck.localDate,
            reason: scheduleCheck.reason,
            allowedWindowStart: normalizedSchedule.allowedWindowStart,
            allowedWindowEnd: normalizedSchedule.allowedWindowEnd,
            allowedDays: normalizedSchedule.days,
            managerOverrideAllowed: true,
          }
        );
      }

      if (!options.overrideReason?.trim()) {
        throw new BadRequestError(
          'Manager override reason is required when starting outside service window'
        );
      }
    }
  }

  // Geofence validation for cleaners/subcontractors
  const GEOFENCE_EXEMPT_ROLES = new Set(['owner', 'admin', 'manager']);
  const requiresGeofence = !GEOFENCE_EXEMPT_ROLES.has(options.userRole ?? '');

  let geofenceResult: { verified: true; distanceMeters: number; allowedRadiusMeters: number } | null =
    null;

  if (requiresGeofence) {
    if (!options.geoLocation) {
      throw new BadRequestError('Location is required to start this job', {
        code: 'CLOCK_IN_LOCATION_REQUIRED',
      });
    }

    const facilityAddress = existing.facility?.address ?? existing.contract?.facility?.address;
    const facilityCoords = getCoordinatesFromAddress(facilityAddress);

    if (facilityCoords) {
      geofenceResult = validateGeofence(normalizeGeoLocation(options.geoLocation), facilityCoords);
    }
  }

  return prisma.$transaction(async (tx) => {
    const job = await tx.job.update({
      where: { id },
      data: {
        status: 'in_progress',
        actualStartTime: new Date(),
      },
      select: jobSelect,
    });

    await tx.jobActivity.create({
      data: {
        jobId: id,
        action: 'started',
        performedByUserId: userId,
        metadata: options.managerOverride
          ? {
              managerOverride: true,
              overrideReason: options.overrideReason ?? null,
            }
          : {},
      },
    });

    // Auto clock-in for the user
    const existingEntry = await tx.timeEntry.findFirst({
      where: { userId, status: 'active', clockOut: null },
    });
    if (existingEntry) {
      throw new BadRequestError(
        'You already have an active clock-in. Clock out first before starting a new job.',
        { code: 'ACTIVE_CLOCK_IN_EXISTS' }
      );
    }

    await tx.timeEntry.create({
      data: {
        userId,
        jobId: id,
        contractId: existing.contract?.id ?? null,
        facilityId: existing.facilityId,
        clockIn: new Date(),
        entryType: 'clock_in',
        status: 'active',
        geoLocation: options.geoLocation
          ? {
              ...options.geoLocation,
              source: 'job_start',
              geofence: geofenceResult ?? undefined,
            }
          : undefined,
      },
    });

    return withWorkforceMetadata(job);
  });
}

export async function completeJob(id: string, input: JobCompleteInput) {
  const existing = await prisma.job.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      actualStartTime: true,
      facilityId: true,
      facility: { select: { address: true } },
      contract: {
        select: {
          id: true,
          facility: { select: { address: true } },
        },
      },
    },
  });
  if (!existing) throw new NotFoundError('Job not found');
  if (existing.status === 'completed') {
    throw new BadRequestError('Job already completed');
  }
  if (existing.status === 'canceled') {
    throw new BadRequestError('Cannot complete a canceled job');
  }
  if (existing.status === 'missed') {
    throw new BadRequestError('Cannot complete a missed job');
  }

  // Geofence validation for cleaners/subcontractors
  const GEOFENCE_EXEMPT_ROLES = new Set(['owner', 'admin', 'manager']);
  const requiresGeofence = !GEOFENCE_EXEMPT_ROLES.has(input.userRole ?? '');

  let geofenceResult: { verified: true; distanceMeters: number; allowedRadiusMeters: number } | null =
    null;

  if (requiresGeofence) {
    if (!input.geoLocation) {
      throw new BadRequestError('Location is required to complete this job', {
        code: 'CLOCK_IN_LOCATION_REQUIRED',
      });
    }

    const facilityAddress = existing.facility?.address ?? existing.contract?.facility?.address;
    const facilityCoords = getCoordinatesFromAddress(facilityAddress);

    if (facilityCoords) {
      geofenceResult = validateGeofence(normalizeGeoLocation(input.geoLocation), facilityCoords);
    }
  }

  const now = new Date();
  let actualHours = input.actualHours ?? null;
  if (!actualHours && existing.actualStartTime) {
    const diffMs = now.getTime() - existing.actualStartTime.getTime();
    actualHours = Math.round((diffMs / 3600000) * 100) / 100;
  }

  return prisma.$transaction(async (tx) => {
    // Active clock-in is required for cleaner/subcontractor completion.
    const activeEntry = await tx.timeEntry.findFirst({
      where: { userId: input.userId, jobId: id, status: 'active', clockOut: null },
    });

    if (requiresGeofence && !activeEntry) {
      throw new BadRequestError(
        'You must clock in to this job before completing it.',
        { code: 'ACTIVE_CLOCK_IN_REQUIRED' }
      );
    }

    const job = await tx.job.update({
      where: { id },
      data: {
        status: 'completed',
        actualEndTime: now,
        actualHours,
        completionNotes: input.completionNotes ?? undefined,
      },
      select: jobSelect,
    });

    await tx.jobActivity.create({
      data: {
        jobId: id,
        action: 'completed',
        performedByUserId: input.userId,
        metadata: { actualHours },
      },
    });

    if (activeEntry) {
      const elapsed = now.getTime() - activeEntry.clockIn.getTime();
      const breakMs = (activeEntry.breakMinutes || 0) * 60000;
      const totalHours = Math.round(((elapsed - breakMs) / 3600000) * 100) / 100;

      const existingGeo = (activeEntry.geoLocation as Record<string, unknown>) || {};
      await tx.timeEntry.update({
        where: { id: activeEntry.id },
        data: {
          clockOut: now,
          totalHours: new Prisma.Decimal(Math.max(0, totalHours)),
          status: 'completed',
          geoLocation: (input.geoLocation
            ? {
                ...existingGeo,
                clockOutLocation: {
                  ...input.geoLocation,
                  geofence: geofenceResult ?? undefined,
                },
              }
            : existingGeo) as Prisma.InputJsonValue,
        },
      });
    }

    await clearJobSettlementReview(id);

    return {
      ...withWorkforceMetadata(job),
      settlement: getJobSettlementView(job.status, null),
    };
  });
}

export async function completeInitialCleanForJob(jobId: string, completedByUserId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      ...jobDetailSelect,
      contract: {
        select: {
          id: true,
          contractNumber: true,
          title: true,
          status: true,
          includesInitialClean: true,
          initialCleanCompleted: true,
          initialCleanCompletedAt: true,
        },
      },
    },
  });

  if (!job) {
    throw new NotFoundError('Job not found');
  }

  if (!job.contract?.id) {
    throw new BadRequestError('This job is not linked to a contract');
  }

  if (job.contract.status !== 'active') {
    throw new BadRequestError('Contract must be active to complete initial clean');
  }

  if (job.jobType !== 'scheduled_service') {
    throw new BadRequestError('Initial clean can only be completed from a scheduled service job');
  }

  if (['canceled', 'missed'].includes(job.status)) {
    throw new BadRequestError('Initial clean cannot be completed from a canceled or missed job');
  }

  const initialClean = await buildInitialCleanStatus(job);
  if (!initialClean.included) {
    throw new BadRequestError('This contract does not include initial clean');
  }

  if (job.contract.initialCleanCompleted) {
    throw new BadRequestError('Initial clean has already been completed');
  }

  if (initialClean.eligibleJobId !== job.id) {
    throw new BadRequestError('Initial clean can only be completed from the first eligible job');
  }

  if (!['in_progress', 'completed'].includes(job.status)) {
    throw new BadRequestError('Initial clean can only be completed once the first job has started');
  }

  await completeContractInitialClean(job.contract.id, completedByUserId);

  await prisma.jobActivity.create({
    data: {
      jobId,
      action: 'initial_clean_completed',
      performedByUserId: completedByUserId,
      metadata: {
        contractId: job.contract.id,
        contractNumber: job.contract.contractNumber,
      },
    },
  });

  const refreshedJob = await getJobById(jobId);
  if (!refreshedJob) {
    throw new NotFoundError('Job not found');
  }

  return refreshedJob;
}

export async function cancelJob(id: string, reason: string | null, userId: string) {
  const existing = await prisma.job.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) throw new NotFoundError('Job not found');
  if (existing.status === 'completed') {
    throw new BadRequestError('Cannot cancel a completed job');
  }
  if (existing.status === 'missed') {
    throw new BadRequestError('Cannot cancel a missed job');
  }

  return prisma.$transaction(async (tx) => {
    const job = await tx.job.update({
      where: { id },
      data: {
        status: 'canceled',
        completionNotes: reason ?? undefined,
      },
      select: jobSelect,
    });

    await tx.jobActivity.create({
      data: {
        jobId: id,
        action: 'canceled',
        performedByUserId: userId,
        metadata: { reason },
      },
    });

    await clearJobSettlementReview(id);

    return {
      ...withWorkforceMetadata(job),
      settlement: getJobSettlementView(job.status, null),
    };
  });
}

export async function assignJob(
  id: string,
  teamId: string | null,
  userId: string | null,
  performedByUserId: string
) {
  assertSingleWorkforceAssignment({
    assignedTeamId: teamId,
    assignedToUserId: userId,
  });
  const existing = await prisma.job.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      assignedTeamId: true,
      assignedToUserId: true,
    },
  });
  if (!existing) throw new NotFoundError('Job not found');
  if (['completed', 'canceled', 'missed'].includes(existing.status)) {
    throw new BadRequestError('Cannot reassign a completed, canceled, or missed job');
  }

  const jobTiming = await prisma.job.findUnique({
    where: { id },
    select: {
      scheduledStartTime: true,
      scheduledEndTime: true,
    },
  });

  await assertNoDirectJobConflict({
    assignedToUserId: userId,
    scheduledStartTime: jobTiming?.scheduledStartTime,
    scheduledEndTime: jobTiming?.scheduledEndTime,
    excludeJobId: id,
  });

  const job = await prisma.$transaction(async (tx) => {
    const job = await tx.job.update({
      where: { id },
      data: {
        assignedTeamId: teamId,
        assignedToUserId: userId,
      },
      select: jobSelect,
    });

    await tx.jobActivity.create({
      data: {
        jobId: id,
        action: 'assigned',
        performedByUserId,
        metadata: { assignedTeamId: teamId, assignedToUserId: userId },
      },
    });

    return job;
  });

  await notifyJobAssignmentRecipients({
    job,
    previousAssignedTeamId: existing.assignedTeamId,
    previousAssignedToUserId: existing.assignedToUserId,
  });

  return withWorkforceMetadata(job);
}

export async function reassignScheduledJobsForContract(input: {
  contractId: string;
  assignedTeamId: string | null;
  assignedToUserId: string | null;
  performedByUserId: string;
  onOrAfterDate?: Date;
}) {
  assertSingleWorkforceAssignment({
    assignedTeamId: input.assignedTeamId,
    assignedToUserId: input.assignedToUserId,
  });

  const jobs = await prisma.job.findMany({
    where: {
      contractId: input.contractId,
      status: 'scheduled',
      ...(input.onOrAfterDate ? { scheduledDate: { gte: input.onOrAfterDate } } : {}),
    },
    select: {
      id: true,
      jobNumber: true,
      facility: {
        select: {
          name: true,
        },
      },
      assignedTeamId: true,
      assignedToUserId: true,
    },
  });

  if (jobs.length === 0) {
    return { updated: 0, notifications: 0 };
  }

  await prisma.$transaction(async (tx) => {
    await tx.job.updateMany({
      where: {
        id: { in: jobs.map((job) => job.id) },
      },
      data: {
        assignedTeamId: input.assignedTeamId,
        assignedToUserId: input.assignedToUserId,
      },
    });

    await tx.jobActivity.createMany({
      data: jobs.map((job) => ({
        jobId: job.id,
        action: 'assigned',
        performedByUserId: input.performedByUserId,
        metadata: {
          assignedTeamId: input.assignedTeamId,
          assignedToUserId: input.assignedToUserId,
          source: 'contract_assignment',
        } as Prisma.InputJsonValue,
      })),
    });
  });

  const notifications = await notifyBulkJobAssignmentRecipients({
    jobs,
    nextAssignedTeamId: input.assignedTeamId,
    nextAssignedToUserId: input.assignedToUserId,
  });

  return { updated: jobs.length, notifications };
}

// ==================== Generate Jobs From Contract ====================

export async function generateJobsFromContract(input: GenerateJobsInput) {
  assertSingleWorkforceAssignment(input);

  const contract = await prisma.contract.findUnique({
    where: { id: input.contractId },
    select: {
      id: true,
      status: true,
      facilityId: true,
      accountId: true,
      assignedTeamId: true,
      serviceFrequency: true,
      serviceSchedule: true,
      facility: {
        select: {
          address: true,
        },
      },
    },
  });

  if (!contract) throw new NotFoundError('Contract not found');
  if (contract.status !== 'active') {
    throw new BadRequestError('Contract must be active to generate jobs');
  }
  if (!contract.facilityId) {
    throw new BadRequestError('Contract must have a facility assigned');
  }

  const hasExplicitSchedule =
    contract.serviceSchedule !== null && contract.serviceSchedule !== undefined;
  const normalizedSchedule = normalizeServiceSchedule(
    contract.serviceSchedule,
    contract.serviceFrequency ?? 'weekly'
  );
  if (!normalizedSchedule) {
    throw new BadRequestError('Contract service schedule is not configured');
  }

  const facilityTimezone = extractFacilityTimezone(contract.facility?.address);
  const effectiveTimezone = facilityTimezone ?? 'UTC';

  const frequency = (contract.serviceFrequency ?? 'weekly').toLowerCase();
  const datesToGenerate: string[] = [];

  if (!hasExplicitSchedule) {
    const current = new Date(`${toIsoDate(input.dateFrom)}T00:00:00.000Z`);
    const end = new Date(`${toIsoDate(input.dateTo)}T00:00:00.000Z`);

    while (current <= end) {
      datesToGenerate.push(toIsoDate(current));
      switch (frequency) {
        case 'daily':
        case '7x_week':
          current.setUTCDate(current.getUTCDate() + 1);
          break;
        case '2x_week':
          current.setUTCDate(current.getUTCDate() + 3);
          break;
        case '3x_week':
          current.setUTCDate(current.getUTCDate() + 2);
          break;
        case 'weekly':
        case '1x_week':
          current.setUTCDate(current.getUTCDate() + 7);
          break;
        case 'biweekly':
        case 'bi_weekly':
          current.setUTCDate(current.getUTCDate() + 14);
          break;
        case 'every_4_weeks':
          current.setUTCDate(current.getUTCDate() + 28);
          break;
        case 'monthly':
          current.setUTCMonth(current.getUTCMonth() + 1);
          break;
        case 'quarterly':
          current.setUTCMonth(current.getUTCMonth() + 3);
          break;
        default:
          current.setUTCDate(current.getUTCDate() + 7);
      }
    }
  } else {
    const allDateCandidates = iterateDateRange(input.dateFrom, input.dateTo)
      .filter((isoDate) => {
        const day = new Date(`${isoDate}T12:00:00.000Z`).getUTCDay();
        const weekday = JS_WEEKDAY_TO_SERVICE_DAY[day];
        return Boolean(weekday && normalizedSchedule.days.includes(weekday));
      });

    const startAnchor = new Date(`${toIsoDate(input.dateFrom)}T00:00:00.000Z`);
    let lastMonthlyKey: string | null = null;
    let lastQuarterKey: string | null = null;

    for (const isoDate of allDateCandidates) {
      const date = new Date(`${isoDate}T00:00:00.000Z`);

      if (frequency === 'biweekly' || frequency === 'bi_weekly') {
        const diffDays = Math.floor(
          (date.getTime() - startAnchor.getTime()) / (1000 * 60 * 60 * 24)
        );
        const weekIndex = Math.floor(diffDays / 7);
        if (weekIndex % 2 !== 0) continue;
      }

      if (frequency === 'every_4_weeks') {
        const diffDays = Math.floor(
          (date.getTime() - startAnchor.getTime()) / (1000 * 60 * 60 * 24)
        );
        const weekIndex = Math.floor(diffDays / 7);
        if (weekIndex % 4 !== 0) continue;
      }

      if (frequency === 'monthly') {
        const monthKey = isoDate.slice(0, 7);
        if (monthKey === lastMonthlyKey) continue;
        lastMonthlyKey = monthKey;
      }

      if (frequency === 'quarterly') {
        const month = Number(isoDate.slice(5, 7));
        const quarter = Math.floor((month - 1) / 3) + 1;
        const quarterKey = `${isoDate.slice(0, 4)}-Q${quarter}`;
        if (quarterKey === lastQuarterKey) continue;
        lastQuarterKey = quarterKey;
      }

      datesToGenerate.push(isoDate);
    }
  }

  // Check for existing jobs on same dates to avoid duplicates
  const existingJobs = await prisma.job.findMany({
    where: {
      contractId: input.contractId,
      scheduledDate: {
        gte: input.dateFrom,
        lte: input.dateTo,
      },
      ...(input.ignoreCanceledExistingJobs ? { status: { not: 'canceled' } } : {}),
    },
    select: { scheduledDate: true, status: true },
  });

  const existingDates = new Set(
    existingJobs.map((j) => j.scheduledDate.toISOString().slice(0, 10))
  );

  const newDates = datesToGenerate.filter((dateIso) => !existingDates.has(dateIso));

  if (newDates.length === 0) {
    return { created: 0, message: 'All dates already have jobs scheduled' };
  }

  const resolvedAssignedTeamId =
    input.assignedToUserId
      ? null
      : (input.assignedTeamId !== undefined ? input.assignedTeamId : contract.assignedTeamId) ?? null;
  const resolvedAssignedToUserId =
    input.assignedToUserId !== undefined ? input.assignedToUserId : null;

  // Batch create jobs
  const jobs = [];
  const seededFacilityTasks = await buildJobTaskSeedData(contract.facilityId, '', input.contractId);
  for (const dateIso of newDates) {
    try {
      const jobNumber = await generateJobNumber();
      const job = await prisma.job.create({
        data: {
          jobNumber,
          contractId: input.contractId,
          facilityId: contract.facilityId,
          accountId: contract.accountId,
          jobType: 'scheduled_service',
          jobCategory: 'recurring',
          assignedTeamId: resolvedAssignedTeamId,
          assignedToUserId: resolvedAssignedToUserId,
          status: 'scheduled',
          scheduledDate: new Date(`${dateIso}T00:00:00.000Z`),
          notes: hasExplicitSchedule
            ?
            `Allowed window ${normalizedSchedule.allowedWindowStart}-${normalizedSchedule.allowedWindowEnd} ` +
            `(${effectiveTimezone}, start-day anchor)` +
            (!facilityTimezone ? ' [timezone fallback: UTC]' : '')
            : null,
          createdByUserId: input.createdByUserId,
        },
        select: { id: true, jobNumber: true, scheduledDate: true },
      });

      if (seededFacilityTasks.length > 0) {
        await prisma.jobTask.createMany({
          data: seededFacilityTasks.map((task) => ({
            ...task,
            jobId: job.id,
          })),
        });
      }
      jobs.push(job);
    } catch (error) {
      // Concurrency-safe duplicate protection with partial unique index.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        continue;
      }
      throw error;
    }
  }

  return { created: jobs.length, jobs };
}

export async function autoGenerateRecurringJobsForContract(input: {
  contractId: string;
  createdByUserId: string;
  assignedTeamId?: string | null;
  assignedToUserId?: string | null;
  anchorDate?: Date;
}) {
  assertSingleWorkforceAssignment(input);

  const contract = await prisma.contract.findUnique({
    where: { id: input.contractId },
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
      assignedTeamId: true,
      assignedToUserId: true,
    },
  });

  if (!contract) throw new NotFoundError('Contract not found');
  if (contract.status !== 'active') {
    throw new BadRequestError('Contract must be active to auto-generate recurring jobs');
  }

  const resolvedAssignedTeamId =
    input.assignedToUserId
      ? null
      : (input.assignedTeamId !== undefined
          ? input.assignedTeamId
          : contract.assignedTeamId) ?? null;
  const resolvedAssignedToUserId =
    input.assignedToUserId !== undefined
      ? input.assignedToUserId
      : (contract.assignedToUserId ?? null);

  if (!resolvedAssignedTeamId && !resolvedAssignedToUserId) {
    return {
      created: 0,
      message: 'Contract has no assignee; recurring jobs were not auto-generated',
    };
  }

  const window = resolveAutoGenerationWindow({
    contractStartDate: contract.startDate,
    contractEndDate: contract.endDate,
    anchorDate: input.anchorDate,
  });
  if (!window) {
    return { created: 0, message: 'No valid auto-generation window for contract dates' };
  }

  return generateJobsFromContract({
    contractId: input.contractId,
    dateFrom: window.dateFrom,
    dateTo: window.dateTo,
    assignedTeamId: resolvedAssignedTeamId,
    assignedToUserId: resolvedAssignedToUserId,
    createdByUserId: input.createdByUserId,
    ignoreCanceledExistingJobs: true,
  });
}

export async function regenerateRecurringJobsForContract(input: {
  contractId: string;
  createdByUserId: string;
  assignedTeamId?: string | null;
  assignedToUserId?: string | null;
  reason?: string;
}) {
  assertSingleWorkforceAssignment(input);

  const contract = await prisma.contract.findUnique({
    where: { id: input.contractId },
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
      assignedTeamId: true,
      assignedToUserId: true,
    },
  });

  if (!contract) throw new NotFoundError('Contract not found');
  if (contract.status !== 'active') {
    throw new BadRequestError('Contract must be active to regenerate recurring jobs');
  }

  const window = resolveAutoGenerationWindow({
    contractStartDate: contract.startDate,
    contractEndDate: contract.endDate,
  });
  if (!window) {
    return { canceled: 0, created: 0, message: 'No valid auto-generation window for contract dates' };
  }

  const resolvedAssignedTeamId =
    input.assignedToUserId
      ? null
      : (input.assignedTeamId !== undefined
          ? input.assignedTeamId
          : contract.assignedTeamId) ?? null;
  const resolvedAssignedToUserId =
    input.assignedToUserId !== undefined
      ? input.assignedToUserId
      : (contract.assignedToUserId ?? null);

  const cancelResult = await prisma.job.updateMany({
    where: {
      contractId: input.contractId,
      jobCategory: 'recurring',
      status: 'scheduled',
      scheduledDate: {
        gte: window.dateFrom,
      },
    },
    data: {
      status: 'canceled',
      completionNotes: input.reason ?? 'Recurring schedule changed; regenerated',
    },
  });

  if (!resolvedAssignedTeamId && !resolvedAssignedToUserId) {
    return {
      canceled: cancelResult.count,
      created: 0,
      message: 'Contract has no assignee; stale recurring jobs were canceled but not regenerated',
    };
  }

  const generationResult = await generateJobsFromContract({
    contractId: input.contractId,
    dateFrom: window.dateFrom,
    dateTo: window.dateTo,
    assignedTeamId: resolvedAssignedTeamId,
    assignedToUserId: resolvedAssignedToUserId,
    createdByUserId: input.createdByUserId,
  });

  return {
    canceled: cancelResult.count,
    created: generationResult.created,
    jobs: 'jobs' in generationResult ? generationResult.jobs : [],
  };
}

export async function runRecurringJobsAutoRegenerationCycle(): Promise<{
  checked: number;
  generatedFor: number;
  created: number;
}> {
  const todayUtc = atUtcStartOfDay(new Date());
  const targetHorizonUtc = new Date(todayUtc);
  targetHorizonUtc.setUTCDate(
    targetHorizonUtc.getUTCDate() + (AUTO_RECURRING_JOB_LOOKAHEAD_DAYS - 1)
  );
  const activeContracts = await prisma.contract.findMany({
    where: {
      status: 'active',
      OR: [{ assignedTeamId: { not: null } }, { assignedToUserId: { not: null } }],
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      assignedTeamId: true,
      assignedToUserId: true,
    },
  });

  let generatedFor = 0;
  let created = 0;
  const systemUser = await prisma.user.findFirst({
    where: { status: 'active' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  if (!systemUser) {
    return { checked: activeContracts.length, generatedFor: 0, created: 0 };
  }

  for (const contract of activeContracts) {
    const latestRecurring = await prisma.job.findFirst({
      where: {
        contractId: contract.id,
        jobCategory: 'recurring',
        status: { not: 'canceled' },
      },
      orderBy: { scheduledDate: 'desc' },
      select: { scheduledDate: true },
    });

    if (latestRecurring) {
      const latestDate = atUtcStartOfDay(latestRecurring.scheduledDate);
      if (latestDate >= targetHorizonUtc) {
        continue;
      }
    }

    const anchorDate = latestRecurring
      ? new Date(atUtcStartOfDay(latestRecurring.scheduledDate).getTime() + 24 * 60 * 60 * 1000)
      : todayUtc;

    const result = await autoGenerateRecurringJobsForContract({
      contractId: contract.id,
      createdByUserId: systemUser.id,
      assignedTeamId: contract.assignedTeamId,
      assignedToUserId: contract.assignedToUserId,
      anchorDate,
    });

    if (result.created > 0) {
      generatedFor += 1;
      created += result.created;
    }
  }

  return { checked: activeContracts.length, generatedFor, created };
}

export async function runJobNearingEndNoCheckInAlertCycle(input?: {
  now?: Date;
  leadHours?: number;
}): Promise<{
  checked: number;
  alerted: number;
  notifications: number;
  settlementReviewsTriggered: number;
}> {
  const now = input?.now ?? new Date();
  const leadHours = input?.leadHours ?? JOB_NO_CHECKIN_ALERT_HOURS;
  const alertThreshold = new Date(now.getTime() + leadHours * 60 * 60 * 1000);
  const missedCommunicationNote =
    'Communication with assigned cleaner/subcontractor is required.';

  const candidateJobs = await prisma.job.findMany({
    where: {
      status: { in: ['scheduled', 'in_progress'] },
      scheduledEndTime: {
        not: null,
        gt: now,
        lte: alertThreshold,
      },
    },
    select: {
      id: true,
      jobNumber: true,
      scheduledDate: true,
      scheduledStartTime: true,
      scheduledEndTime: true,
      facility: { select: { id: true, name: true } },
      contract: { select: { id: true, contractNumber: true } },
      assignedTeam: {
        select: {
          id: true,
          name: true,
          users: {
            where: { status: 'active' },
            select: { id: true, email: true, fullName: true, phone: true },
          },
        },
      },
      assignedToUser: { select: { id: true, fullName: true, email: true, phone: true } },
    },
  });

  const candidateJobIds = candidateJobs.map((job) => job.id);
  const [timeTrackedJobs, alertedJobs, adminUsers] = await Promise.all([
    candidateJobIds.length > 0
      ? prisma.timeEntry.findMany({
          where: { jobId: { in: candidateJobIds } },
          select: { jobId: true },
          distinct: ['jobId'],
        })
      : Promise.resolve([]),
    candidateJobIds.length > 0
      ? prisma.jobActivity.findMany({
          where: {
            jobId: { in: candidateJobIds },
            action: JOB_NO_CHECKIN_ALERT_ACTION,
          },
          select: { jobId: true },
        })
      : Promise.resolve([]),
    prisma.user.findMany({
      where: {
        status: 'active',
        roles: {
          some: {
            role: {
              key: { in: ['owner', 'admin'] },
            },
          },
        },
      },
      select: { id: true, phone: true },
    }),
  ]);

  const jobsWithTimeTracking = new Set(
    timeTrackedJobs
      .map((entry) => entry.jobId)
      .filter((jobId): jobId is string => Boolean(jobId))
  );
  const alreadyAlertedJobIds = new Set(alertedJobs.map((activity) => activity.jobId));
  const adminUserIds = adminUsers.map((user) => user.id);
  const adminPhonesById = new Map(
    adminUsers
      .filter((user) => Boolean(user.phone))
      .map((user) => [user.id, user.phone as string])
  );

  let alerted = 0;
  let notifications = 0;
  let settlementReviewsTriggered = 0;

  for (const job of candidateJobs) {
    if (jobsWithTimeTracking.has(job.id)) continue;
    if (alreadyAlertedJobIds.has(job.id)) continue;
    if (!job.scheduledEndTime) continue;
    if (job.scheduledEndTime.getTime() <= now.getTime()) continue;

    const assigneeLabel = job.assignedToUser?.fullName
      ? `Assigned cleaner: ${job.assignedToUser.fullName}`
      : job.assignedTeam?.name
        ? `Assigned team: ${job.assignedTeam.name}`
        : 'Assigned cleaner/team: Unassigned';
    const body = `${job.jobNumber} at ${job.facility.name} ends at ${job.scheduledEndTime.toISOString()} and has no check-in yet. ${assigneeLabel}.`;
    const assigneeUserIds = new Set<string>();
    const assigneePhones = new Set<string>();
    if (job.assignedToUser?.id) {
      assigneeUserIds.add(job.assignedToUser.id);
      if (job.assignedToUser.phone) {
        assigneePhones.add(job.assignedToUser.phone);
      }
    }
    for (const teamUser of job.assignedTeam?.users ?? []) {
      assigneeUserIds.add(teamUser.id);
      if (teamUser.phone) {
        assigneePhones.add(teamUser.phone);
      }
    }
    const recipientUserIds = [...new Set([...adminUserIds, ...assigneeUserIds])];
    if (recipientUserIds.length === 0) {
      continue;
    }
    const emailSubject = `No check-in yet for ${job.jobNumber}`;
    const emailHtml = `
      <p>${job.jobNumber} at ${job.facility.name} ends at ${job.scheduledEndTime.toISOString()} and has no check-in yet.</p>
      <p>${assigneeLabel}</p>
    `;
    const recipientPhones = new Set<string>(assigneePhones);
    for (const adminUserId of adminUserIds) {
      const phone = adminPhonesById.get(adminUserId);
      if (phone) {
        recipientPhones.add(phone);
      }
    }
    const smsMessage = `${job.jobNumber} at ${job.facility.name} ends at ${job.scheduledEndTime.toISOString()} and has no check-in yet.`;

    const created = await createBulkNotifications(recipientUserIds, {
      type: 'job_no_checkin_near_end',
      title: `No check-in yet for ${job.jobNumber}`,
      body,
      sendEmail: true,
      emailSubject,
      emailHtml,
      metadata: {
        jobId: job.id,
        jobNumber: job.jobNumber,
        facilityId: job.facility.id,
        facilityName: job.facility.name,
        contractId: job.contract?.id ?? null,
        contractNumber: job.contract?.contractNumber ?? null,
        scheduledDate: job.scheduledDate.toISOString(),
        scheduledStartTime: job.scheduledStartTime?.toISOString() ?? null,
        scheduledEndTime: job.scheduledEndTime.toISOString(),
        leadHours,
        assignedToUserId: job.assignedToUser?.id ?? null,
        assignedTeamId: job.assignedTeam?.id ?? null,
      },
    });
    let smsSentCount = 0;
    for (const phone of recipientPhones) {
      const sent = await sendSms(phone, smsMessage);
      if (sent) smsSentCount += 1;
    }

    await prisma.jobActivity.create({
      data: {
        jobId: job.id,
        action: JOB_NO_CHECKIN_ALERT_ACTION,
        metadata: {
          leadHours,
          alertedRecipientCount: created.length,
          smsSentCount,
          scheduledEndTime: job.scheduledEndTime.toISOString(),
        },
      },
    });

    alerted += 1;
    notifications += created.length;
  }

  const missedJobs = await prisma.job.findMany({
    where: {
      status: { in: ['scheduled', 'in_progress'] },
      scheduledEndTime: {
        not: null,
        lte: now,
      },
    },
    select: {
      id: true,
      jobNumber: true,
      scheduledDate: true,
      scheduledStartTime: true,
      scheduledEndTime: true,
      facility: { select: { id: true, name: true } },
      contract: { select: { id: true, contractNumber: true } },
      assignedTeam: {
        select: {
          id: true,
          name: true,
          users: {
            where: { status: 'active' },
            select: { id: true, email: true, fullName: true, phone: true },
          },
        },
      },
      assignedToUser: { select: { id: true, fullName: true, email: true, phone: true } },
    },
  });

  if (missedJobs.length > 0) {
    const missedJobIds = missedJobs.map((job) => job.id);
    const [missedJobsWithTimeTracking, alreadyMissedJobs] = await Promise.all([
      prisma.timeEntry.findMany({
        where: { jobId: { in: missedJobIds } },
        select: { jobId: true },
        distinct: ['jobId'],
      }),
      prisma.jobActivity.findMany({
        where: {
          jobId: { in: missedJobIds },
          action: JOB_MISSED_NO_CHECKIN_ACTION,
        },
        select: { jobId: true },
      }),
    ]);

    const missedTimeTrackingJobIds = new Set(
      missedJobsWithTimeTracking
        .map((entry) => entry.jobId)
        .filter((jobId): jobId is string => Boolean(jobId))
    );
    const alreadyMarkedMissedJobIds = new Set(
      alreadyMissedJobs.map((activity) => activity.jobId)
    );

    for (const job of missedJobs) {
      if (missedTimeTrackingJobIds.has(job.id)) continue;
      if (alreadyMarkedMissedJobIds.has(job.id)) continue;
      if (!job.scheduledEndTime) continue;
      if (job.scheduledEndTime.getTime() > now.getTime()) continue;

      await prisma.job.update({
        where: { id: job.id },
        data: { status: 'missed' },
      });

      const assigneeLabel = job.assignedToUser?.fullName
        ? `Assigned cleaner: ${job.assignedToUser.fullName}`
        : job.assignedTeam?.name
          ? `Assigned team: ${job.assignedTeam.name}`
          : 'Assigned cleaner/team: Unassigned';
      const body = `${job.jobNumber} at ${job.facility.name} has been marked as missed (no check-in). ${missedCommunicationNote} ${assigneeLabel}.`;

      const assigneeUserIds = new Set<string>();
      const assigneePhones = new Set<string>();
      if (job.assignedToUser?.id) {
        assigneeUserIds.add(job.assignedToUser.id);
        if (job.assignedToUser.phone) {
          assigneePhones.add(job.assignedToUser.phone);
        }
      }
      for (const teamUser of job.assignedTeam?.users ?? []) {
        assigneeUserIds.add(teamUser.id);
        if (teamUser.phone) {
          assigneePhones.add(teamUser.phone);
        }
      }
      const recipientUserIds = [...new Set([...adminUserIds, ...assigneeUserIds])];
      if (recipientUserIds.length === 0) {
        continue;
      }

      const emailSubject = `Missed job: ${job.jobNumber}`;
      const emailHtml = `
        <p>${job.jobNumber} at ${job.facility.name} has been marked as missed (no check-in).</p>
        <p>${missedCommunicationNote}</p>
        <p>${assigneeLabel}</p>
      `;
      const recipientPhones = new Set<string>(assigneePhones);
      for (const adminUserId of adminUserIds) {
        const phone = adminPhonesById.get(adminUserId);
        if (phone) {
          recipientPhones.add(phone);
        }
      }
      const smsMessage = `${job.jobNumber} marked MISSED (no check-in). ${missedCommunicationNote}`;

      const created = await createBulkNotifications(recipientUserIds, {
        type: 'job_missed',
        title: `Job missed: ${job.jobNumber}`,
        body,
        sendEmail: true,
        emailSubject,
        emailHtml,
        metadata: {
          jobId: job.id,
          jobNumber: job.jobNumber,
          facilityId: job.facility.id,
          facilityName: job.facility.name,
          contractId: job.contract?.id ?? null,
          contractNumber: job.contract?.contractNumber ?? null,
          scheduledDate: job.scheduledDate.toISOString(),
          scheduledStartTime: job.scheduledStartTime?.toISOString() ?? null,
          scheduledEndTime: job.scheduledEndTime.toISOString(),
          communicationRequired: true,
          assignedToUserId: job.assignedToUser?.id ?? null,
          assignedTeamId: job.assignedTeam?.id ?? null,
        },
      });

      let smsSentCount = 0;
      for (const phone of recipientPhones) {
        const sent = await sendSms(phone, smsMessage);
        if (sent) smsSentCount += 1;
      }

      await prisma.jobActivity.create({
        data: {
          jobId: job.id,
          action: JOB_MISSED_NO_CHECKIN_ACTION,
          metadata: {
            communicationRequired: true,
            notificationRecipientCount: created.length,
            smsSentCount,
            scheduledEndTime: job.scheduledEndTime.toISOString(),
          },
        },
      });

      alerted += 1;
      notifications += created.length;
    }
  }

  const unresolvedJobs = await prisma.job.findMany({
    where: {
      status: { in: ['scheduled', 'in_progress'] },
      scheduledEndTime: {
        not: null,
        lte: now,
      },
      actualEndTime: null,
      timeEntries: {
        some: {},
      },
    },
    select: {
      id: true,
      jobNumber: true,
      facility: { select: { name: true } },
      settlementReview: {
        select: {
          status: true,
        },
      },
    },
  });

  for (const job of unresolvedJobs) {
    if (job.settlementReview?.status === 'needs_review') {
      continue;
    }

    await flagJobForSettlementReview({
      jobId: job.id,
      issueCode: 'missing_completion',
      issueSummary: `${job.jobNumber} at ${job.facility.name} has recorded work but is still not completed.`,
      notifyWorker: true,
      notifyManagers: true,
    });
    alerted += 1;
    settlementReviewsTriggered += 1;
  }

  return {
    checked: candidateJobs.length + unresolvedJobs.length,
    alerted,
    notifications,
    settlementReviewsTriggered,
  };
}

// ==================== Job Tasks ====================

export async function createJobTask(jobId: string, input: JobTaskCreateInput) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, status: true },
  });
  if (!job) throw new NotFoundError('Job not found');

  return prisma.jobTask.create({
    data: {
      jobId,
      facilityTaskId: input.facilityTaskId ?? null,
      taskName: input.taskName,
      description: input.description ?? null,
      status: 'pending',
      estimatedMinutes: input.estimatedMinutes ?? null,
    },
    select: {
      id: true,
      taskName: true,
      description: true,
      status: true,
      estimatedMinutes: true,
      actualMinutes: true,
      notes: true,
      completedAt: true,
    },
  });
}

export async function updateJobTask(taskId: string, input: JobTaskUpdateInput) {
  const data: Prisma.JobTaskUpdateInput = {};

  if (input.status !== undefined) {
    data.status = input.status;
    if (input.status === 'completed') {
      data.completedAt = new Date();
      if (input.completedByUserId) {
        data.completedByUser = { connect: { id: input.completedByUserId } };
      }
    }
  }
  if (input.actualMinutes !== undefined) data.actualMinutes = input.actualMinutes;
  if (input.notes !== undefined) data.notes = input.notes;

  return prisma.jobTask.update({
    where: { id: taskId },
    data,
    select: {
      id: true,
      taskName: true,
      description: true,
      status: true,
      estimatedMinutes: true,
      actualMinutes: true,
      notes: true,
      completedAt: true,
      completedByUser: {
        select: { id: true, fullName: true },
      },
    },
  });
}

export async function deleteJobTask(taskId: string) {
  return prisma.jobTask.delete({
    where: { id: taskId },
    select: { id: true },
  });
}

// ==================== Job Notes ====================

export async function createJobNote(jobId: string, input: JobNoteCreateInput) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true },
  });
  if (!job) throw new NotFoundError('Job not found');

  return prisma.$transaction(async (tx) => {
    const note = await tx.jobNote.create({
      data: {
        jobId,
        noteType: input.noteType ?? 'general',
        content: input.content,
        photoUrl: input.photoUrl ?? null,
        createdByUserId: input.createdByUserId,
      },
      select: {
        id: true,
        noteType: true,
        content: true,
        photoUrl: true,
        createdAt: true,
        createdByUser: {
          select: { id: true, fullName: true },
        },
      },
    });

    await tx.jobActivity.create({
      data: {
        jobId,
        action: input.noteType === 'issue' ? 'issue_reported' : 'note_added',
        performedByUserId: input.createdByUserId,
        metadata: { noteId: note.id, noteType: input.noteType },
      },
    });

    return note;
  });
}

export async function deleteJobNote(noteId: string) {
  return prisma.jobNote.delete({
    where: { id: noteId },
    select: { id: true },
  });
}

// ==================== Job Activity ====================

export async function listJobActivities(jobId: string) {
  return prisma.jobActivity.findMany({
    where: { jobId },
    select: {
      id: true,
      action: true,
      metadata: true,
      createdAt: true,
      performedByUser: {
        select: { id: true, fullName: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
