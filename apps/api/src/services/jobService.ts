import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';
import { createNotification } from './notificationService';
import {
  extractFacilityTimezone,
  normalizeServiceSchedule,
  type ServiceWeekday,
  validateServiceWindow,
} from './serviceScheduleService';

// ==================== Interfaces ====================

export interface JobListParams {
  contractId?: string;
  facilityId?: string;
  accountId?: string;
  assignedTeamId?: string;
  assignedToUserId?: string;
  jobType?: string;
  status?: string;
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
  createdByUserId: string;
}

export interface StartJobOptions {
  managerOverride?: boolean;
  overrideReason?: string | null;
  userRole?: string;
}

// ==================== Select Objects ====================

const jobSelect = {
  id: true,
  jobNumber: true,
  jobType: true,
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
    },
  },
  assignedTeam: {
    select: {
      id: true,
      name: true,
    },
  },
  assignedToUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  createdByUser: {
    select: {
      id: true,
      fullName: true,
    },
  },
} satisfies Prisma.JobSelect;

const jobDetailSelect = {
  ...jobSelect,
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

const JS_WEEKDAY_TO_SERVICE_DAY: Partial<Record<number, ServiceWeekday>> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

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

// ==================== CRUD Operations ====================

export async function listJobs(params: JobListParams) {
  const {
    contractId,
    facilityId,
    accountId,
    assignedTeamId,
    assignedToUserId,
    jobType,
    status,
    dateFrom,
    dateTo,
    page = 1,
    limit = 25,
  } = params;

  const where: Prisma.JobWhereInput = {};

  if (contractId) where.contractId = contractId;
  if (facilityId) where.facilityId = facilityId;
  if (accountId) where.accountId = accountId;
  if (assignedTeamId) where.assignedTeamId = assignedTeamId;
  if (assignedToUserId) where.assignedToUserId = assignedToUserId;
  if (jobType) where.jobType = jobType;
  if (status) where.status = status;

  if (dateFrom || dateTo) {
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
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getJobById(id: string) {
  return prisma.job.findUnique({
    where: { id },
    select: jobDetailSelect,
  });
}

export async function createJob(input: JobCreateInput) {
  // Validate contract exists and is active
  const contract = await prisma.contract.findUnique({
    where: { id: input.contractId },
    select: { id: true, status: true },
  });
  if (!contract) throw new NotFoundError('Contract not found');
  if (contract.status !== 'active') {
    throw new BadRequestError('Contract must be active to create jobs');
  }

  const jobNumber = await generateJobNumber();

  return prisma.$transaction(async (tx) => {
    const job = await tx.job.create({
      data: {
        jobNumber,
        contractId: input.contractId,
        facilityId: input.facilityId,
        accountId: input.accountId,
        jobType: input.jobType || 'special_job',
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

    await tx.jobActivity.create({
      data: {
        jobId: job.id,
        action: 'created',
        performedByUserId: input.createdByUserId,
        metadata: { jobNumber },
      },
    });

    return job;
  });
}

export async function updateJob(id: string, input: JobUpdateInput, userId: string) {
  const existing = await prisma.job.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) throw new NotFoundError('Job not found');
  if (['completed', 'canceled'].includes(existing.status)) {
    throw new BadRequestError('Cannot update a completed or canceled job');
  }

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

  return job;
}

export async function startJob(id: string, userId: string, options: StartJobOptions = {}) {
  const existing = await prisma.job.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
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
      const canOverride = options.managerOverride && MANAGER_ROLES.has(options.userRole || '');
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
              overrideReason: options.overrideReason || null,
            }
          : {},
      },
    });

    return job;
  });
}

export async function completeJob(id: string, input: JobCompleteInput) {
  const existing = await prisma.job.findUnique({
    where: { id },
    select: { id: true, status: true, actualStartTime: true },
  });
  if (!existing) throw new NotFoundError('Job not found');
  if (existing.status === 'completed') {
    throw new BadRequestError('Job already completed');
  }
  if (existing.status === 'canceled') {
    throw new BadRequestError('Cannot complete a canceled job');
  }

  const now = new Date();
  let actualHours = input.actualHours ?? null;
  if (!actualHours && existing.actualStartTime) {
    const diffMs = now.getTime() - existing.actualStartTime.getTime();
    actualHours = Math.round((diffMs / 3600000) * 100) / 100;
  }

  return prisma.$transaction(async (tx) => {
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

    return job;
  });
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

    return job;
  });
}

export async function assignJob(
  id: string,
  teamId: string | null,
  userId: string | null,
  performedByUserId: string
) {
  const existing = await prisma.job.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) throw new NotFoundError('Job not found');

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

  if (userId) {
    await createNotification({
      userId,
      type: 'job_assigned',
      title: `Job ${job.jobNumber} assigned to you`,
      body: `You have been assigned job ${job.jobNumber} at ${job.facility.name}.`,
      metadata: {
        jobId: job.id,
        jobNumber: job.jobNumber,
        facilityName: job.facility.name,
      },
    });
  }

  return job;
}

// ==================== Generate Jobs From Contract ====================

export async function generateJobsFromContract(input: GenerateJobsInput) {
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
    contract.serviceFrequency || 'weekly'
  );
  if (!normalizedSchedule) {
    throw new BadRequestError('Contract service schedule is not configured');
  }

  const facilityTimezone = extractFacilityTimezone(contract.facility?.address);
  const effectiveTimezone = facilityTimezone || 'UTC';

  const frequency = (contract.serviceFrequency || 'weekly').toLowerCase();
  let datesToGenerate: string[] = [];

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
      status: { not: 'canceled' },
    },
    select: { scheduledDate: true },
  });

  const existingDates = new Set(
    existingJobs.map((j) => j.scheduledDate.toISOString().slice(0, 10))
  );

  const newDates = datesToGenerate.filter((dateIso) => !existingDates.has(dateIso));

  if (newDates.length === 0) {
    return { created: 0, message: 'All dates already have jobs scheduled' };
  }

  // Batch create jobs
  const jobs = [];
  for (const dateIso of newDates) {
    const jobNumber = await generateJobNumber();
    const job = await prisma.job.create({
      data: {
        jobNumber,
        contractId: input.contractId,
        facilityId: contract.facilityId,
        accountId: contract.accountId,
        jobType: 'scheduled_service',
        assignedTeamId: contract.assignedTeamId ?? null,
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
    jobs.push(job);
  }

  return { created: jobs.length, jobs };
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
        noteType: input.noteType || 'general',
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
