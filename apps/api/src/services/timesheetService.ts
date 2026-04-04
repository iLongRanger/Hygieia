import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';

// ==================== Interfaces ====================

export interface TimesheetListParams {
  userId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface GenerateTimesheetInput {
  userId: string;
  periodStart: Date;
  periodEnd: Date;
}

export interface GenerateTimesheetsBulkInput {
  userIds: string[];
  periodStart: Date;
  periodEnd: Date;
}

interface TimesheetAccessOptions {
  userRole?: string;
  userId?: string;
  userTeamId?: string;
}

// ==================== Select objects ====================

const timesheetListSelect = {
  id: true,
  userId: true,
  periodStart: true,
  periodEnd: true,
  status: true,
  totalHours: true,
  regularHours: true,
  overtimeHours: true,
  notes: true,
  approvedByUserId: true,
  approvedAt: true,
  createdAt: true,
  user: { select: { id: true, fullName: true } },
  approvedByUser: { select: { id: true, fullName: true } },
  _count: { select: { entries: true } },
};

const timesheetDetailSelect = {
  ...timesheetListSelect,
  updatedAt: true,
  entries: {
    select: {
      id: true,
      entryType: true,
      clockIn: true,
      clockOut: true,
      breakMinutes: true,
      totalHours: true,
      notes: true,
      status: true,
      job: { select: { id: true, jobNumber: true } },
      facility: { select: { id: true, name: true } },
    },
    orderBy: { clockIn: 'asc' as const },
  },
};

// ==================== Service ====================

function getManagerTimesheetScope(userId: string): Prisma.TimesheetWhereInput {
  return {
    entries: {
      some: {
        OR: [
          { facility: { account: { accountManagerId: userId } } },
          { contract: { account: { accountManagerId: userId } } },
          { job: { account: { accountManagerId: userId } } },
        ],
      },
    },
  };
}

export async function listTimesheets(
  params: TimesheetListParams,
  options?: TimesheetAccessOptions
) {
  const { page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.TimesheetWhereInput = {};
  if (params.userId) where.userId = params.userId;
  if (params.status) where.status = params.status;

  // RBAC scoping
  if (options?.userRole === 'cleaner' && options.userId) {
    where.userId = options.userId;
  } else if (options?.userRole === 'subcontractor' && options.userTeamId) {
    where.user = { teamId: options.userTeamId };
  } else if (options?.userRole === 'manager' && options.userId) {
    where.AND = [getManagerTimesheetScope(options.userId)];
  }

  const [data, total] = await Promise.all([
    prisma.timesheet.findMany({
      where,
      select: timesheetListSelect,
      orderBy: { periodStart: 'desc' },
      skip,
      take: limit,
    }),
    prisma.timesheet.count({ where }),
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

export async function getTimesheetById(
  id: string,
  options?: TimesheetAccessOptions
) {
  const timesheet = await prisma.timesheet.findUnique({
    where: { id },
    select: { ...timesheetDetailSelect, user: { select: { id: true, fullName: true, teamId: true } } },
  });
  if (!timesheet) throw new NotFoundError('Timesheet not found');

  // RBAC ownership check — return NotFoundError (not 403) to avoid resource enumeration
  if (options?.userRole === 'cleaner' && options.userId) {
    if (timesheet.userId !== options.userId) throw new NotFoundError('Timesheet not found');
  } else if (options?.userRole === 'subcontractor' && options.userTeamId) {
    if (timesheet.user.teamId !== options.userTeamId) throw new NotFoundError('Timesheet not found');
  } else if (options?.userRole === 'manager' && options.userId) {
    const hasAccess = await prisma.timesheet.count({
      where: {
        id,
        ...getManagerTimesheetScope(options.userId),
      },
    });
    if (!hasAccess) throw new NotFoundError('Timesheet not found');
  }

  return timesheet;
}

async function generateTimesheetWithAccess(
  input: GenerateTimesheetInput,
  options?: TimesheetAccessOptions
) {
  // Check if timesheet already exists for this period
  const existing = await prisma.timesheet.findFirst({
    where: {
      userId: input.userId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    },
  });
  if (existing) throw new BadRequestError('Timesheet already exists for this period');

  // Get all completed entries for the period
  const entryWhere: Prisma.TimeEntryWhereInput = {
    userId: input.userId,
    clockIn: { gte: input.periodStart },
    clockOut: { lte: input.periodEnd },
    status: { in: ['completed', 'edited', 'approved'] },
    timesheetId: null,
  };

  if (options?.userRole === 'manager' && options.userId) {
    entryWhere.AND = [
      {
        OR: [
          { facility: { account: { accountManagerId: options.userId } } },
          { contract: { account: { accountManagerId: options.userId } } },
          { job: { account: { accountManagerId: options.userId } } },
        ],
      },
    ];
  }

  const entries = await prisma.timeEntry.findMany({
    where: entryWhere,
    select: { id: true, totalHours: true },
  });

  if (entries.length === 0) {
    throw new BadRequestError('No eligible time entries found for this period');
  }

  const totalHours = entries.reduce(
    (sum, e) => sum + (e.totalHours ? parseFloat(e.totalHours.toString()) : 0),
    0
  );
  const regularHours = Math.min(totalHours, 40);
  const overtimeHours = Math.max(0, totalHours - 40);

  const timesheet = await prisma.$transaction(async (tx) => {
    const ts = await tx.timesheet.create({
      data: {
        userId: input.userId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        totalHours: new Prisma.Decimal(Math.round(totalHours * 100) / 100),
        regularHours: new Prisma.Decimal(Math.round(regularHours * 100) / 100),
        overtimeHours: new Prisma.Decimal(Math.round(overtimeHours * 100) / 100),
        status: 'draft',
      },
    });

    // Link entries to timesheet
    if (entries.length > 0) {
      await tx.timeEntry.updateMany({
        where: { id: { in: entries.map((e) => e.id) } },
        data: { timesheetId: ts.id },
      });
    }

    return ts;
  });

  return getTimesheetById(timesheet.id);
}

export async function generateTimesheet(input: GenerateTimesheetInput, options?: TimesheetAccessOptions) {
  return generateTimesheetWithAccess(input, options);
}

export async function generateTimesheetsBulk(input: GenerateTimesheetsBulkInput, options?: TimesheetAccessOptions) {
  const dedupedUserIds = Array.from(new Set(input.userIds));
  const created: Awaited<ReturnType<typeof generateTimesheet>>[] = [];
  const skipped: Array<{ userId: string; reason: string }> = [];
  const failed: Array<{ userId: string; error: string }> = [];

  for (const userId of dedupedUserIds) {
    try {
      const timesheet = await generateTimesheet({
        userId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      }, options);
      created.push(timesheet);
    } catch (error) {
      if (
        error instanceof BadRequestError &&
        (error.message === 'Timesheet already exists for this period' ||
          error.message === 'No eligible time entries found for this period')
      ) {
        skipped.push({ userId, reason: error.message });
        continue;
      }

      failed.push({
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    created,
    skipped,
    failed,
    summary: {
      requested: dedupedUserIds.length,
      created: created.length,
      skipped: skipped.length,
      failed: failed.length,
    },
  };
}

export async function submitTimesheet(id: string) {
  const existing = await prisma.timesheet.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Timesheet not found');
  if (existing.status !== 'draft') throw new BadRequestError('Timesheet can only be submitted from draft status');

  const timesheet = await prisma.timesheet.update({
    where: { id },
    data: { status: 'submitted' },
    select: timesheetDetailSelect,
  });

  return timesheet;
}

export async function approveTimesheet(id: string, approvedByUserId: string) {
  const existing = await prisma.timesheet.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Timesheet not found');
  if (existing.status !== 'submitted') throw new BadRequestError('Timesheet can only be approved from submitted status');

  const timesheet = await prisma.timesheet.update({
    where: { id },
    data: {
      status: 'approved',
      approvedByUserId,
      approvedAt: new Date(),
    },
    select: timesheetDetailSelect,
  });

  return timesheet;
}

export async function rejectTimesheet(id: string, notes?: string) {
  const existing = await prisma.timesheet.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Timesheet not found');
  if (existing.status !== 'submitted') throw new BadRequestError('Timesheet can only be rejected from submitted status');

  const timesheet = await prisma.timesheet.update({
    where: { id },
    data: {
      status: 'rejected',
      notes: notes || existing.notes,
    },
    select: timesheetDetailSelect,
  });

  return timesheet;
}

export async function deleteTimesheet(id: string) {
  const existing = await prisma.timesheet.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Timesheet not found');
  if (existing.status === 'approved') throw new BadRequestError('Cannot delete an approved timesheet');
  if (existing.status === 'submitted') {
    throw new BadRequestError('Cannot delete a submitted timesheet');
  }

  // Unlink entries
  await prisma.timeEntry.updateMany({
    where: { timesheetId: id },
    data: { timesheetId: null },
  });

  await prisma.timesheet.delete({ where: { id } });
}
