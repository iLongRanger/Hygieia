import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';
import {
  getCoordinatesFromAddress,
  getCoordinatesFromGeoLocation,
  calculateDistanceMeters,
} from '../lib/geofence';
import {
  extractFacilityTimezone,
  normalizeServiceSchedule,
  validateServiceWindow,
} from './serviceScheduleService';

// ==================== Interfaces ====================

export interface TimeEntryListParams {
  userId?: string;
  jobId?: string;
  contractId?: string;
  facilityId?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface ClockInInput {
  userId: string;
  jobId?: string | null;
  contractId?: string | null;
  facilityId?: string | null;
  notes?: string | null;
  geoLocation?: Record<string, unknown> | null;
  managerOverride?: boolean;
  overrideReason?: string | null;
  userRole?: string;
}

export interface ManualEntryInput {
  userId: string;
  jobId?: string | null;
  contractId?: string | null;
  facilityId?: string | null;
  clockIn: Date;
  clockOut: Date;
  breakMinutes?: number;
  notes?: string | null;
  createdByUserId: string;
}

export interface EditTimeEntryInput {
  clockIn?: Date;
  clockOut?: Date | null;
  breakMinutes?: number;
  notes?: string | null;
  jobId?: string | null;
  facilityId?: string | null;
  editedByUserId: string;
  editReason: string;
}

// ==================== Select objects ====================

const timeEntryListSelect = {
  id: true,
  userId: true,
  entryType: true,
  clockIn: true,
  clockOut: true,
  breakMinutes: true,
  totalHours: true,
  notes: true,
  status: true,
  createdAt: true,
  user: { select: { id: true, fullName: true } },
  job: { select: { id: true, jobNumber: true } },
  contract: { select: { id: true, contractNumber: true } },
  facility: { select: { id: true, name: true } },
  approvedByUser: { select: { id: true, fullName: true } },
  editedByUser: { select: { id: true, fullName: true } },
  editReason: true,
  approvedAt: true,
  timesheetId: true,
};

const timeEntryDetailSelect = {
  ...timeEntryListSelect,
  geoLocation: true,
  updatedAt: true,
};

// ==================== Helpers ====================

function computeHours(clockIn: Date, clockOut: Date, breakMinutes: number): number {
  const diffMs = clockOut.getTime() - clockIn.getTime();
  const diffHours = diffMs / 3600000;
  const breakHours = breakMinutes / 60;
  return Math.max(0, Math.round((diffHours - breakHours) * 100) / 100);
}

function toObject(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  return input as Record<string, unknown>;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

// ==================== Service ====================

export async function listTimeEntries(params: TimeEntryListParams) {
  const { page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (params.userId) where.userId = params.userId;
  if (params.jobId) where.jobId = params.jobId;
  if (params.contractId) where.contractId = params.contractId;
  if (params.facilityId) where.facilityId = params.facilityId;
  if (params.status) where.status = params.status;

  if (params.dateFrom || params.dateTo) {
    where.clockIn = {};
    if (params.dateFrom) (where.clockIn as Record<string, unknown>).gte = params.dateFrom;
    if (params.dateTo) (where.clockIn as Record<string, unknown>).lte = params.dateTo;
  }

  const [data, total] = await Promise.all([
    prisma.timeEntry.findMany({
      where,
      select: timeEntryListSelect,
      orderBy: { clockIn: 'desc' },
      skip,
      take: limit,
    }),
    prisma.timeEntry.count({ where }),
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

export async function getTimeEntryById(id: string) {
  const entry = await prisma.timeEntry.findUnique({
    where: { id },
    select: timeEntryDetailSelect,
  });
  if (!entry) throw new NotFoundError('Time entry not found');
  return entry;
}

export async function getActiveEntry(userId: string) {
  const entry = await prisma.timeEntry.findFirst({
    where: { userId, status: 'active', clockOut: null },
    select: timeEntryDetailSelect,
  });
  return entry;
}

export async function clockIn(input: ClockInInput) {
  // Check for existing active entry
  const active = await prisma.timeEntry.findFirst({
    where: { userId: input.userId, status: 'active', clockOut: null },
  });
  if (active) throw new BadRequestError('Already clocked in. Please clock out first.');

  const managerRoles = new Set(['owner', 'admin', 'manager']);
  let scheduleOverrideMeta: Record<string, unknown> | null = null;

  let linkedFacilityAddress: unknown = null;
  if (input.jobId || input.contractId) {
    const linkedJob = input.jobId
      ? await prisma.job.findUnique({
          where: { id: input.jobId },
          select: {
            contractId: true,
            facilityId: true,
            contract: {
              select: {
                serviceFrequency: true,
                serviceSchedule: true,
                facility: { select: { address: true } },
              },
            },
            facility: { select: { address: true } },
          },
        })
      : null;

    const linkedContract = !linkedJob && input.contractId
      ? await prisma.contract.findUnique({
          where: { id: input.contractId },
          select: {
            serviceFrequency: true,
            serviceSchedule: true,
            facility: { select: { address: true } },
          },
        })
      : null;

    linkedFacilityAddress =
      linkedJob?.facility?.address ??
      linkedJob?.contract?.facility?.address ??
      linkedContract?.facility?.address ??
      null;

    const scheduleSource = linkedJob?.contract || linkedContract;
    const hasExplicitSchedule =
      scheduleSource?.serviceSchedule !== null &&
      scheduleSource?.serviceSchedule !== undefined;

    const schedule = hasExplicitSchedule
      ? normalizeServiceSchedule(
          scheduleSource?.serviceSchedule,
          scheduleSource?.serviceFrequency
        )
      : null;

    if (schedule) {
      const timezone = extractFacilityTimezone(
        scheduleSource?.facility?.address ?? linkedJob?.facility?.address
      );
      if (!timezone) {
        throw new BadRequestError('Facility timezone is required for schedule enforcement');
      }

      const scheduleCheck = validateServiceWindow(schedule, timezone, new Date());
      if (!scheduleCheck.allowed) {
        const canOverride = input.managerOverride && managerRoles.has(input.userRole || '');
        if (!canOverride) {
          throw new BadRequestError('Outside allowed service window', {
            code: 'OUTSIDE_SERVICE_WINDOW',
            timezone,
            localTime: scheduleCheck.localTime,
            localDate: scheduleCheck.localDate,
            reason: scheduleCheck.reason,
            allowedWindowStart: schedule.allowedWindowStart,
            allowedWindowEnd: schedule.allowedWindowEnd,
            allowedDays: schedule.days,
            managerOverrideAllowed: true,
          });
        }

        if (!input.overrideReason?.trim()) {
          throw new BadRequestError(
            'Manager override reason is required when clocking in outside service window'
          );
        }

        scheduleOverrideMeta = {
          managerOverride: true,
          overrideReason: input.overrideReason,
          timezone,
          localTime: scheduleCheck.localTime,
          localDate: scheduleCheck.localDate,
        };
      }
    }
  } else if (input.facilityId) {
    const facility = await prisma.facility.findUnique({
      where: { id: input.facilityId },
      select: { address: true },
    });
    linkedFacilityAddress = facility?.address ?? null;
  }

  if (!linkedFacilityAddress) {
    throw new BadRequestError('Clock-in requires a linked facility for location verification', {
      code: 'FACILITY_REQUIRED_FOR_CLOCK_IN',
    });
  }

  const facilityCoordinates = getCoordinatesFromAddress(linkedFacilityAddress);
  if (!facilityCoordinates) {
    throw new BadRequestError('Facility coordinates are not configured', {
      code: 'FACILITY_COORDINATES_NOT_CONFIGURED',
    });
  }

  const workerCoordinates = getCoordinatesFromGeoLocation(input.geoLocation);
  if (!workerCoordinates) {
    throw new BadRequestError('Location access is required to clock in', {
      code: 'CLOCK_IN_LOCATION_REQUIRED',
    });
  }

  const distanceMeters = calculateDistanceMeters(
    {
      latitude: workerCoordinates.latitude,
      longitude: workerCoordinates.longitude,
    },
    {
      latitude: facilityCoordinates.latitude,
      longitude: facilityCoordinates.longitude,
    }
  );

  if (distanceMeters > facilityCoordinates.geofenceRadiusMeters) {
    throw new BadRequestError('You are outside the allowed facility check-in radius', {
      code: 'OUTSIDE_FACILITY_GEOFENCE',
      distanceMeters,
      allowedRadiusMeters: facilityCoordinates.geofenceRadiusMeters,
    });
  }

  const geoLocationData: Record<string, unknown> = {
    ...(input.geoLocation || {}),
    geofence: {
      verified: true,
      distanceMeters,
      allowedRadiusMeters: facilityCoordinates.geofenceRadiusMeters,
    },
    ...(scheduleOverrideMeta ? { scheduleOverride: scheduleOverrideMeta } : {}),
  };

  const entry = await prisma.timeEntry.create({
    data: {
      userId: input.userId,
      jobId: input.jobId,
      contractId: input.contractId,
      facilityId: input.facilityId,
      entryType: 'clock_in',
      clockIn: new Date(),
      notes: input.notes,
      status: 'active',
      geoLocation:
        Object.keys(geoLocationData).length > 0
          ? (geoLocationData as Prisma.InputJsonValue)
          : Prisma.JsonNull,
    },
    select: timeEntryDetailSelect,
  });

  return entry;
}

export async function clockOut(userId: string, notes?: string) {
  const active = await prisma.timeEntry.findFirst({
    where: { userId, status: 'active', clockOut: null },
  });
  if (!active) throw new BadRequestError('No active clock-in found');

  const clockOut = new Date();
  const totalHours = computeHours(active.clockIn, clockOut, active.breakMinutes);

  const entry = await prisma.timeEntry.update({
    where: { id: active.id },
    data: {
      clockOut,
      totalHours: new Prisma.Decimal(totalHours),
      status: 'completed',
      notes: notes || active.notes,
    },
    select: timeEntryDetailSelect,
  });

  return entry;
}

export async function startBreak(userId: string) {
  const active = await prisma.timeEntry.findFirst({
    where: { userId, status: 'active', clockOut: null },
  });
  if (!active) throw new BadRequestError('No active clock-in found');

  // Store break start time in geoLocation metadata (reusing JSON field)
  const geo = (active.geoLocation as Record<string, unknown>) || {};
  if (geo.breakStartedAt) throw new BadRequestError('Already on break');

  const entry = await prisma.timeEntry.update({
    where: { id: active.id },
    data: {
      geoLocation: { ...geo, breakStartedAt: new Date().toISOString() },
    },
    select: timeEntryDetailSelect,
  });

  return entry;
}

export async function endBreak(userId: string) {
  const active = await prisma.timeEntry.findFirst({
    where: { userId, status: 'active', clockOut: null },
  });
  if (!active) throw new BadRequestError('No active clock-in found');

  const geo = (active.geoLocation as Record<string, unknown>) || {};
  if (!geo.breakStartedAt) throw new BadRequestError('Not currently on break');

  const breakStart = new Date(geo.breakStartedAt as string);
  const breakDurationMinutes = Math.round((new Date().getTime() - breakStart.getTime()) / 60000);

  const { breakStartedAt, ...restGeo } = geo;

  const entry = await prisma.timeEntry.update({
    where: { id: active.id },
    data: {
      breakMinutes: active.breakMinutes + breakDurationMinutes,
      geoLocation: Object.keys(restGeo).length > 0 ? (restGeo as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
    select: timeEntryDetailSelect,
  });

  return entry;
}

export async function createManualEntry(input: ManualEntryInput) {
  const totalHours = computeHours(input.clockIn, input.clockOut, input.breakMinutes || 0);

  const entry = await prisma.timeEntry.create({
    data: {
      userId: input.userId,
      jobId: input.jobId,
      contractId: input.contractId,
      facilityId: input.facilityId,
      entryType: 'manual',
      clockIn: input.clockIn,
      clockOut: input.clockOut,
      breakMinutes: input.breakMinutes || 0,
      totalHours: new Prisma.Decimal(totalHours),
      notes: input.notes,
      status: 'completed',
      editedByUserId: input.createdByUserId,
      editReason: 'Manual entry',
    },
    select: timeEntryDetailSelect,
  });

  return entry;
}

export async function editTimeEntry(id: string, input: EditTimeEntryInput) {
  const existing = await prisma.timeEntry.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Time entry not found');

  const clockIn = input.clockIn || existing.clockIn;
  const clockOut = input.clockOut !== undefined ? input.clockOut : existing.clockOut;
  const breakMinutes = input.breakMinutes !== undefined ? input.breakMinutes : existing.breakMinutes;

  let totalHours: number | null = null;
  if (clockOut) {
    totalHours = computeHours(clockIn, clockOut, breakMinutes);
  }

  const entry = await prisma.timeEntry.update({
    where: { id },
    data: {
      ...(input.clockIn && { clockIn: input.clockIn }),
      ...(input.clockOut !== undefined && { clockOut: input.clockOut }),
      ...(input.breakMinutes !== undefined && { breakMinutes: input.breakMinutes }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.jobId !== undefined && { jobId: input.jobId }),
      ...(input.facilityId !== undefined && { facilityId: input.facilityId }),
      ...(totalHours !== null && { totalHours: new Prisma.Decimal(totalHours) }),
      status: 'edited',
      editedByUserId: input.editedByUserId,
      editReason: input.editReason,
    },
    select: timeEntryDetailSelect,
  });

  return entry;
}

export async function approveTimeEntry(id: string, approvedByUserId: string) {
  const existing = await prisma.timeEntry.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Time entry not found');
  if (existing.status === 'active') throw new BadRequestError('Cannot approve an active entry');

  const entry = await prisma.timeEntry.update({
    where: { id },
    data: {
      status: 'approved',
      approvedByUserId,
      approvedAt: new Date(),
    },
    select: timeEntryDetailSelect,
  });

  return entry;
}

export async function deleteTimeEntry(id: string) {
  const existing = await prisma.timeEntry.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Time entry not found');
  if (existing.status === 'approved') throw new BadRequestError('Cannot delete an approved entry');

  await prisma.timeEntry.delete({ where: { id } });
}

// ==================== Summary ====================

export async function getUserTimeSummary(userId: string, dateFrom: Date, dateTo: Date) {
  const entries = await prisma.timeEntry.findMany({
    where: {
      userId,
      clockIn: { gte: dateFrom },
      clockOut: { lte: dateTo },
      status: { in: ['completed', 'edited', 'approved'] },
    },
    select: {
      totalHours: true,
      clockIn: true,
      facility: { select: { id: true, name: true } },
      job: { select: { id: true, jobNumber: true } },
    },
    orderBy: { clockIn: 'asc' },
  });

  const totalHours = entries.reduce((sum, e) => sum + (e.totalHours ? parseFloat(e.totalHours.toString()) : 0), 0);
  const regularHours = Math.min(totalHours, 40);
  const overtimeHours = Math.max(0, totalHours - 40);

  return {
    totalHours: Math.round(totalHours * 100) / 100,
    regularHours: Math.round(regularHours * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
    entryCount: entries.length,
    entries,
  };
}
