import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';

// ==================== Interfaces ====================

export interface PayrollRunListParams {
  status?: string;
  page?: number;
  limit?: number;
}

export interface AdjustPayrollEntryInput {
  grossPay?: number;
  scheduledHours?: number;
  status?: string;
  adjustmentNotes?: string | null;
}

// ==================== Tier percentages ====================

const TIER_PERCENTAGES: Record<string, number> = {
  tier1: 0.45,
  tier2: 0.50,
  tier3: 0.55,
};

// ==================== Select objects ====================

const payrollRunListSelect = {
  id: true,
  periodStart: true,
  periodEnd: true,
  status: true,
  totalGrossPay: true,
  totalEntries: true,
  approvedAt: true,
  paidAt: true,
  notes: true,
  createdAt: true,
  approvedByUser: { select: { id: true, fullName: true } },
};

const payrollEntryUserSelect = {
  id: true,
  fullName: true,
  roles: {
    select: {
      role: { select: { key: true, label: true } },
    },
  },
};

// ==================== Service ====================

export async function listPayrollRuns(params: PayrollRunListParams) {
  const { page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (params.status) where.status = params.status;

  const [data, total] = await Promise.all([
    prisma.payrollRun.findMany({
      where,
      select: payrollRunListSelect,
      orderBy: { periodStart: 'desc' },
      skip,
      take: limit,
    }),
    prisma.payrollRun.count({ where }),
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

export async function getPayrollRunById(
  id: string,
  options?: { userRole?: string; userId?: string }
) {
  const run = await prisma.payrollRun.findUnique({
    where: { id },
    select: {
      ...payrollRunListSelect,
      updatedAt: true,
      entries: {
        select: {
          id: true,
          userId: true,
          payType: true,
          scheduledHours: true,
          hourlyRate: true,
          contractId: true,
          contractMonthlyValue: true,
          tierPercentage: true,
          grossPay: true,
          status: true,
          flagReason: true,
          adjustmentNotes: true,
          createdAt: true,
          user: { select: payrollEntryUserSelect },
          contract: { select: { id: true, contractNumber: true, title: true } },
          adjustedByUser: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'asc' as const },
      },
    },
  });
  if (!run) throw new NotFoundError('Payroll run not found');

  // Flatten user roles to a single role string for frontend consumption
  const transformedEntries = run.entries.map((e) => ({
    ...e,
    user: {
      id: e.user.id,
      fullName: e.user.fullName,
      role: e.user.roles[0]?.role?.key ?? 'unknown',
    },
  }));

  // RBAC: cleaners and subcontractors only see their own entries
  if (
    options?.userRole &&
    ['cleaner', 'subcontractor'].includes(options.userRole) &&
    options.userId
  ) {
    return {
      ...run,
      entries: transformedEntries.filter((e) => e.userId === options.userId),
    };
  }

  return { ...run, entries: transformedEntries };
}

export async function generatePayrollRun(periodStart: string, periodEnd: string) {
  const pStart = new Date(periodStart);
  const pEnd = new Date(periodEnd);

  if (pStart >= pEnd) {
    throw new BadRequestError('periodStart must be before periodEnd');
  }

  // 1. Check no existing run overlaps this exact period
  const existing = await prisma.payrollRun.findFirst({
    where: { periodStart: pStart, periodEnd: pEnd },
  });
  if (existing) {
    throw new BadRequestError('A payroll run already exists for this period');
  }

  // 2. Get all active cleaners and subcontractors
  const workers = await prisma.user.findMany({
    where: {
      status: 'active',
      roles: {
        some: {
          role: { key: { in: ['cleaner', 'subcontractor'] } },
        },
      },
    },
    select: {
      id: true,
      fullName: true,
      payType: true,
      hourlyPayRate: true,
      roles: {
        select: { role: { select: { key: true } } },
      },
    },
  });

  // 3. Get default hourly rate from pricingSettings
  const pricingSettings = await prisma.pricingSettings.findFirst({
    select: { laborCostPerHour: true },
  });
  const defaultHourlyRate = pricingSettings
    ? parseFloat(pricingSettings.laborCostPerHour.toString())
    : 18;

  // 4. Build entries for each worker
  const entryData: Prisma.PayrollEntryCreateManyInput[] = [];

  for (const worker of workers) {
    const workerRoles = worker.roles.map((r) => r.role.key);
    const isSubcontractor = workerRoles.includes('subcontractor');

    // Determine effective payType
    let effectivePayType: string;
    if (worker.payType) {
      effectivePayType = worker.payType;
    } else {
      effectivePayType = isSubcontractor ? 'percentage' : 'hourly';
    }

    if (effectivePayType === 'percentage') {
      // ---- PERCENTAGE PAY ----
      // Get active contracts assigned to this worker
      const contracts = await prisma.contract.findMany({
        where: {
          assignedToUserId: worker.id,
          status: 'active',
        },
        select: {
          id: true,
          monthlyValue: true,
          subcontractorTier: true,
        },
      });

      for (const contract of contracts) {
        const tier = contract.subcontractorTier || 'tier1';
        const tierPct = TIER_PERCENTAGES[tier] ?? 0.45;

        // Check attendance: did they clock in AND out for each scheduled job in the period?
        const scheduledJobs = await prisma.job.findMany({
          where: {
            contractId: contract.id,
            assignedToUserId: worker.id,
            scheduledDate: { gte: pStart, lte: pEnd },
          },
          select: { id: true },
        });

        let allPresent = true;
        const missedJobIds: string[] = [];

        for (const job of scheduledJobs) {
          const timeEntry = await prisma.timeEntry.findFirst({
            where: {
              userId: worker.id,
              jobId: job.id,
              clockIn: { not: null },
              clockOut: { not: null },
            },
          });
          if (!timeEntry) {
            allPresent = false;
            missedJobIds.push(job.id);
          }
        }

        const monthlyValue = parseFloat(contract.monthlyValue.toString());
        const grossPay = Math.round(monthlyValue * tierPct * 100) / 100;

        entryData.push({
          payrollRunId: '', // placeholder, set in transaction
          userId: worker.id,
          payType: 'percentage',
          contractId: contract.id,
          contractMonthlyValue: new Prisma.Decimal(monthlyValue),
          tierPercentage: new Prisma.Decimal(tierPct * 100),
          grossPay: new Prisma.Decimal(grossPay),
          status: allPresent ? 'valid' : 'flagged',
          flagReason: allPresent
            ? null
            : `Missed clock-in/out for ${missedJobIds.length} of ${scheduledJobs.length} scheduled jobs`,
        });
      }
    } else {
      // ---- HOURLY PAY ----
      const hourlyRate = worker.hourlyPayRate
        ? parseFloat(worker.hourlyPayRate.toString())
        : defaultHourlyRate;

      // Get scheduled jobs in the period
      const scheduledJobs = await prisma.job.findMany({
        where: {
          assignedToUserId: worker.id,
          scheduledDate: { gte: pStart, lte: pEnd },
        },
        select: {
          id: true,
          scheduledStartTime: true,
          scheduledEndTime: true,
          estimatedHours: true,
          status: true,
        },
      });

      let totalScheduledHours = 0;
      let flagged = false;
      const flagReasons: string[] = [];

      for (const job of scheduledJobs) {
        // Calculate scheduled hours for this job
        let jobHours = 0;
        if (job.estimatedHours) {
          jobHours = parseFloat(job.estimatedHours.toString());
        } else if (job.scheduledStartTime && job.scheduledEndTime) {
          const diffMs =
            new Date(job.scheduledEndTime).getTime() -
            new Date(job.scheduledStartTime).getTime();
          jobHours = diffMs / (1000 * 60 * 60);
        }

        // Check if they have a time entry with clock-in for this job
        const timeEntry = await prisma.timeEntry.findFirst({
          where: {
            userId: worker.id,
            jobId: job.id,
            clockIn: { not: null },
          },
          select: { clockIn: true, clockOut: true, totalHours: true, status: true },
        });

        if (!timeEntry || !timeEntry.clockIn) {
          flagged = true;
          flagReasons.push(`Missing check-in for job ${job.id}`);
          // Don't add these hours
          continue;
        }

        // Check if completed within expected hours
        if (!timeEntry.clockOut) {
          flagged = true;
          flagReasons.push(`Missing clock-out for job ${job.id}`);
          continue;
        }

        // Worker checked in and completed - pay scheduled hours
        totalScheduledHours += jobHours;
      }

      const grossPay = Math.round(totalScheduledHours * hourlyRate * 100) / 100;

      entryData.push({
        payrollRunId: '', // placeholder
        userId: worker.id,
        payType: 'hourly',
        scheduledHours: new Prisma.Decimal(Math.round(totalScheduledHours * 100) / 100),
        hourlyRate: new Prisma.Decimal(hourlyRate),
        grossPay: new Prisma.Decimal(grossPay),
        status: flagged ? 'flagged' : 'valid',
        flagReason: flagged ? flagReasons.join('; ') : null,
      });
    }
  }

  // 5. Create PayrollRun + entries in a transaction
  const totalGross = entryData.reduce(
    (sum, e) => sum + parseFloat(e.grossPay.toString()),
    0
  );

  const run = await prisma.$transaction(async (tx) => {
    const payrollRun = await tx.payrollRun.create({
      data: {
        periodStart: pStart,
        periodEnd: pEnd,
        status: 'draft',
        totalGrossPay: new Prisma.Decimal(Math.round(totalGross * 100) / 100),
        totalEntries: entryData.length,
      },
    });

    if (entryData.length > 0) {
      await tx.payrollEntry.createMany({
        data: entryData.map((e) => ({
          ...e,
          payrollRunId: payrollRun.id,
        })),
      });
    }

    return payrollRun;
  });

  return getPayrollRunById(run.id);
}

export async function approvePayrollRun(id: string, approvedByUserId: string) {
  const existing = await prisma.payrollRun.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Payroll run not found');
  if (existing.status !== 'draft') {
    throw new BadRequestError('Only draft payroll runs can be approved');
  }

  await prisma.payrollRun.update({
    where: { id },
    data: {
      status: 'approved',
      approvedByUserId,
      approvedAt: new Date(),
    },
  });

  return getPayrollRunById(id);
}

export async function markPayrollRunPaid(id: string) {
  const existing = await prisma.payrollRun.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Payroll run not found');
  if (existing.status !== 'approved') {
    throw new BadRequestError('Only approved payroll runs can be marked as paid');
  }

  await prisma.payrollRun.update({
    where: { id },
    data: {
      status: 'paid',
      paidAt: new Date(),
    },
  });

  return getPayrollRunById(id);
}

export async function adjustPayrollEntry(
  entryId: string,
  input: AdjustPayrollEntryInput,
  adjustedByUserId: string
) {
  const entry = await prisma.payrollEntry.findUnique({
    where: { id: entryId },
    include: { payrollRun: { select: { id: true, status: true } } },
  });
  if (!entry) throw new NotFoundError('Payroll entry not found');
  if (entry.payrollRun.status !== 'draft') {
    throw new BadRequestError('Can only adjust entries in draft payroll runs');
  }

  const updateData: Record<string, unknown> = {
    adjustedByUserId,
  };
  if (input.grossPay !== undefined) {
    updateData.grossPay = new Prisma.Decimal(input.grossPay);
  }
  if (input.scheduledHours !== undefined) {
    updateData.scheduledHours = new Prisma.Decimal(input.scheduledHours);
  }
  if (input.status !== undefined) {
    updateData.status = input.status;
  }
  if (input.adjustmentNotes !== undefined) {
    updateData.adjustmentNotes = input.adjustmentNotes;
  }

  await prisma.payrollEntry.update({
    where: { id: entryId },
    data: updateData,
  });

  // Recalculate run totalGrossPay
  const allEntries = await prisma.payrollEntry.findMany({
    where: { payrollRunId: entry.payrollRun.id },
    select: { grossPay: true },
  });
  const newTotal = allEntries.reduce(
    (sum, e) => sum + parseFloat(e.grossPay.toString()),
    0
  );

  await prisma.payrollRun.update({
    where: { id: entry.payrollRun.id },
    data: {
      totalGrossPay: new Prisma.Decimal(Math.round(newTotal * 100) / 100),
    },
  });

  return getPayrollRunById(entry.payrollRun.id);
}

export async function deletePayrollRun(id: string) {
  const existing = await prisma.payrollRun.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Payroll run not found');
  if (existing.status !== 'draft') {
    throw new BadRequestError('Only draft payroll runs can be deleted');
  }

  // Entries cascade-delete via the schema relation
  await prisma.payrollRun.delete({ where: { id } });
}
