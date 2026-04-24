import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';

// ==================== Interfaces ====================

export interface PayrollRunListParams {
  status?: string;
  page?: number;
  limit?: number;
}

export interface PayrollRunListAccessOptions {
  userRole?: string;
  userId?: string;
  userTeamId?: string | null;
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

const eligiblePayrollJobSelect = Prisma.validator<Prisma.JobSelect>()({
  id: true,
  jobNumber: true,
  contractId: true,
  scheduledDate: true,
  contract: {
    select: {
      id: true,
      monthlyValue: true,
      subcontractorTier: true,
      serviceFrequency: true,
    },
  },
  timeEntries: {
    where: {
      clockOut: { not: null },
      status: { in: ['completed', 'approved'] },
    },
    select: {
      id: true,
      userId: true,
      contractId: true,
      clockIn: true,
      clockOut: true,
      totalHours: true,
      user: {
        select: {
          id: true,
          payType: true,
          hourlyPayRate: true,
          roles: {
            select: {
              role: { select: { key: true } },
            },
          },
        },
      },
    },
  },
});

type EligiblePayrollJob = Prisma.JobGetPayload<{
  select: typeof eligiblePayrollJobSelect;
}>;

type GroupedPayrollEntry = {
  userId: string;
  payType: 'hourly' | 'percentage';
  contractId: string | null;
  contractMonthlyValue: number | null;
  tierPercentage: number | null;
  hourlyRate: number | null;
  scheduledHours: number;
  grossPay: number;
  status: 'valid' | 'flagged';
  flagReasons: string[];
  jobAllocations: {
    jobId: string;
    allocatedHours: number | null;
    allocatedGrossPay: number;
  }[];
};

function getPayrollEligibilityFilter() {
  return {
    status: 'completed',
    payrollAllocations: { none: {} },
    OR: [
      { settlementReview: null },
      { settlementReview: { status: { in: ['ready', 'approved_payroll_only', 'approved_both'] } } },
    ],
  } satisfies Prisma.JobWhereInput;
}

function getMonthlyVisits(frequency: string | null | undefined): number {
  const normalized = (frequency ?? '').trim().toLowerCase();
  const visitsMap: Record<string, number> = {
    '1x_week': 4.33,
    '2x_week': 8.67,
    '3x_week': 13,
    '4x_week': 17.33,
    '5x_week': 21.67,
    '7x_week': 30.33,
    daily: 30,
    weekly: 4.33,
    biweekly: 2.17,
    bi_weekly: 2.17,
    monthly: 1,
    quarterly: 0.33,
  };

  return visitsMap[normalized] ?? 4.33;
}

function calculateEntryHours(entry: {
  totalHours: Prisma.Decimal | null;
  clockIn: Date;
  clockOut: Date | null;
}): number {
  if (entry.totalHours != null) {
    return Number(entry.totalHours);
  }
  if (!entry.clockOut) {
    return 0;
  }

  const diffMs = entry.clockOut.getTime() - entry.clockIn.getTime();
  return Math.max(0, Math.round((diffMs / 3600000) * 100) / 100);
}

function derivePerJobBillableAmount(contract: {
  monthlyValue: Prisma.Decimal;
  serviceFrequency: string | null;
} | null): number {
  if (!contract) return 0;
  const monthlyValue = Number(contract.monthlyValue);
  const monthlyVisits = getMonthlyVisits(contract.serviceFrequency);
  if (monthlyVisits <= 0) return monthlyValue;
  return Math.round((monthlyValue / monthlyVisits) * 100) / 100;
}

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

export async function listPayrollRuns(
  params: PayrollRunListParams,
  options?: PayrollRunListAccessOptions
) {
  const { page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.PayrollRunWhereInput = {};
  if (params.status) where.status = params.status;

  // RBAC: cleaners and subcontractors only see runs containing their own entry
  if (
    options?.userRole &&
    ['cleaner', 'subcontractor'].includes(options.userRole) &&
    options.userId
  ) {
    where.entries = { some: { userId: options.userId } };
  }

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
          jobAllocations: {
            select: {
              id: true,
              jobId: true,
              allocatedHours: true,
              allocatedGrossPay: true,
              createdAt: true,
              job: {
                select: {
                  id: true,
                  jobNumber: true,
                  scheduledDate: true,
                  facility: { select: { id: true, name: true } },
                },
              },
            },
            orderBy: { createdAt: 'asc' as const },
          },
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

  // 2. Get default hourly rate from pricingSettings
  const pricingSettings = await prisma.pricingSettings.findFirst({
    select: { laborCostPerHour: true },
  });
  const defaultHourlyRate = pricingSettings
    ? parseFloat(pricingSettings.laborCostPerHour.toString())
    : 18;

  const eligibleJobs = await prisma.job.findMany({
    where: {
      ...getPayrollEligibilityFilter(),
      scheduledDate: { gte: pStart, lte: pEnd },
    },
    select: eligiblePayrollJobSelect,
    orderBy: [{ scheduledDate: 'asc' }, { createdAt: 'asc' }],
  });

  const groupedEntries = new Map<string, GroupedPayrollEntry>();

  for (const job of eligibleJobs) {
    const completedEntries = job.timeEntries.filter((entry) => calculateEntryHours(entry) > 0);
    if (completedEntries.length === 0) {
      continue;
    }

    const totalJobHours = completedEntries.reduce(
      (sum, entry) => sum + calculateEntryHours(entry),
      0
    );
    const jobBillableAmount = derivePerJobBillableAmount(job.contract);

    for (const entry of completedEntries) {
      const workerRoles = entry.user.roles.map((role) => role.role.key);
      const isSubcontractor = workerRoles.includes('subcontractor');
      const payType = ((entry.user.payType ?? (isSubcontractor ? 'percentage' : 'hourly')) === 'percentage'
        ? 'percentage'
        : 'hourly') as 'hourly' | 'percentage';

      const hours = calculateEntryHours(entry);
      const share = totalJobHours > 0 ? hours / totalJobHours : 1 / completedEntries.length;
      const tier = job.contract?.subcontractorTier ?? 'tier1';
      const tierPct = TIER_PERCENTAGES[tier] ?? 0.45;
      const hourlyRate = entry.user.hourlyPayRate
        ? Number(entry.user.hourlyPayRate)
        : defaultHourlyRate;
      const grossPay = payType === 'percentage'
        ? Math.round(jobBillableAmount * tierPct * share * 100) / 100
        : Math.round(hours * hourlyRate * 100) / 100;

      const key = payType === 'percentage'
        ? `${entry.userId}:percentage:${job.contractId ?? 'none'}`
        : `${entry.userId}:hourly:${hourlyRate}`;

      const existingGroup: GroupedPayrollEntry = groupedEntries.get(key) ?? {
        userId: entry.userId,
        payType,
        contractId: payType === 'percentage' ? (job.contractId ?? null) : null,
        contractMonthlyValue: payType === 'percentage' && job.contract ? Number(job.contract.monthlyValue) : null,
        tierPercentage: payType === 'percentage' ? tierPct * 100 : null,
        hourlyRate: payType === 'hourly' ? hourlyRate : null,
        scheduledHours: 0,
        grossPay: 0,
        status: 'valid' as const,
        flagReasons: [],
        jobAllocations: [],
      };

      existingGroup.scheduledHours += hours;
      existingGroup.grossPay += grossPay;
      existingGroup.jobAllocations.push({
        jobId: job.id,
        allocatedHours: payType === 'hourly' ? hours : null,
        allocatedGrossPay: grossPay,
      });

      groupedEntries.set(key, existingGroup);
    }
  }

  const groupedValues = [...groupedEntries.values()].filter((entry) => entry.jobAllocations.length > 0);

  const totalGross = groupedValues.reduce((sum, entry) => sum + entry.grossPay, 0);

  const run = await prisma.$transaction(async (tx) => {
    const payrollRun = await tx.payrollRun.create({
      data: {
        periodStart: pStart,
        periodEnd: pEnd,
        status: 'draft',
        totalGrossPay: new Prisma.Decimal(Math.round(totalGross * 100) / 100),
        totalEntries: groupedValues.length,
      },
    });

    for (const groupedEntry of groupedValues) {
      const payrollEntry = await tx.payrollEntry.create({
        data: {
          payrollRunId: payrollRun.id,
          userId: groupedEntry.userId,
          payType: groupedEntry.payType,
          scheduledHours: groupedEntry.payType === 'hourly'
            ? new Prisma.Decimal(Math.round(groupedEntry.scheduledHours * 100) / 100)
            : null,
          hourlyRate: groupedEntry.hourlyRate != null
            ? new Prisma.Decimal(groupedEntry.hourlyRate)
            : null,
          contractId: groupedEntry.contractId,
          contractMonthlyValue: groupedEntry.contractMonthlyValue != null
            ? new Prisma.Decimal(groupedEntry.contractMonthlyValue)
            : null,
          tierPercentage: groupedEntry.tierPercentage != null
            ? new Prisma.Decimal(groupedEntry.tierPercentage)
            : null,
          grossPay: new Prisma.Decimal(Math.round(groupedEntry.grossPay * 100) / 100),
          status: groupedEntry.status,
          flagReason: groupedEntry.flagReasons.length > 0 ? groupedEntry.flagReasons.join('; ') : null,
        },
        select: { id: true },
      });

      for (const allocation of groupedEntry.jobAllocations) {
        await tx.payrollJobAllocation.create({
          data: {
            payrollEntryId: payrollEntry.id,
            jobId: allocation.jobId,
            allocatedHours: allocation.allocatedHours != null
              ? new Prisma.Decimal(Math.round(allocation.allocatedHours * 100) / 100)
              : null,
            allocatedGrossPay: new Prisma.Decimal(Math.round(allocation.allocatedGrossPay * 100) / 100),
          },
        });
      }
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
