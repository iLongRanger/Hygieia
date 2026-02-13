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

export async function listTimesheets(params: TimesheetListParams) {
  const { page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (params.userId) where.userId = params.userId;
  if (params.status) where.status = params.status;

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

export async function getTimesheetById(id: string) {
  const timesheet = await prisma.timesheet.findUnique({
    where: { id },
    select: timesheetDetailSelect,
  });
  if (!timesheet) throw new NotFoundError('Timesheet not found');
  return timesheet;
}

export async function generateTimesheet(input: GenerateTimesheetInput) {
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
  const entries = await prisma.timeEntry.findMany({
    where: {
      userId: input.userId,
      clockIn: { gte: input.periodStart },
      clockOut: { lte: input.periodEnd },
      status: { in: ['completed', 'edited', 'approved'] },
      timesheetId: null,
    },
    select: { id: true, totalHours: true },
  });

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

  // Unlink entries
  await prisma.timeEntry.updateMany({
    where: { timesheetId: id },
    data: { timesheetId: null },
  });

  await prisma.timesheet.delete({ where: { id } });
}
