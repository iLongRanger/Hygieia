import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';
import { extractFacilityTimezone } from './serviceScheduleService';
import { createPublicTokenPair, hashPublicToken } from './publicTokenService';
import { getGlobalSettings } from './globalSettingsService';
import { generateInvoicePdf } from './invoicePdf';
import { sendInvoiceEmail } from './emailService';
import logger from '../lib/logger';

// ==================== Interfaces ====================

export interface InvoiceListParams {
  accountId?: string;
  contractId?: string;
  facilityId?: string;
  status?: string;
  overdue?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface InvoiceListAccessOptions {
  userRole?: string;
  userId?: string;
}

export interface InvoiceCreateInput {
  contractId?: string | null;
  accountId: string;
  facilityId?: string | null;
  issueDate: Date;
  dueDate: Date;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  taxRate?: number;
  notes?: string | null;
  paymentInstructions?: string | null;
  createdByUserId: string;
  items: InvoiceItemInput[];
}

export interface InvoiceUpdateInput {
  issueDate?: Date;
  dueDate?: Date;
  taxRate?: number;
  notes?: string | null;
  paymentInstructions?: string | null;
  items?: InvoiceItemInput[];
}

export interface InvoiceItemInput {
  itemType?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  sortOrder?: number;
}

export interface RecordPaymentInput {
  paymentDate: Date;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string | null;
  notes?: string | null;
  recordedByUserId: string;
}

interface NormalizedPeriodWindow {
  start: Date;
  end: Date;
  timezone: string;
}

const jobInvoiceCandidateSelect = Prisma.validator<Prisma.JobSelect>()({
  id: true,
  jobNumber: true,
  accountId: true,
  contractId: true,
  facilityId: true,
  scheduledDate: true,
  facility: {
    select: {
      id: true,
      name: true,
    },
  },
  contract: {
    select: {
      id: true,
      contractNumber: true,
      title: true,
      monthlyValue: true,
      taxRate: true,
      paymentTerms: true,
      serviceFrequency: true,
    },
  },
});

type JobInvoiceCandidate = Prisma.JobGetPayload<{
  select: typeof jobInvoiceCandidateSelect;
}>;

const MAX_BILLING_WINDOW_DAYS = 31;
const DEFAULT_PAYMENT_TERMS_DAYS = 30;
const batchIdempotencyLocks = new Map<string, number>();
const BATCH_IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;

// ==================== Select objects ====================

const invoiceListSelect = {
  id: true,
  invoiceNumber: true,
  status: true,
  issueDate: true,
  dueDate: true,
  totalAmount: true,
  amountPaid: true,
  balanceDue: true,
  sentAt: true,
  paidAt: true,
  createdAt: true,
  account: { select: { id: true, name: true } },
  contract: { select: { id: true, contractNumber: true } },
  facility: { select: { id: true, name: true } },
  createdByUser: { select: { id: true, fullName: true } },
  _count: { select: { items: true, payments: true } },
};

const invoiceDetailSelect = {
  id: true,
  invoiceNumber: true,
  contractId: true,
  accountId: true,
  facilityId: true,
  status: true,
  issueDate: true,
  dueDate: true,
  periodStart: true,
  periodEnd: true,
  subtotal: true,
  taxRate: true,
  taxAmount: true,
  totalAmount: true,
  amountPaid: true,
  balanceDue: true,
  notes: true,
  paymentInstructions: true,
  publicTokenExpiresAt: true,
  sentAt: true,
  viewedAt: true,
  paidAt: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
  account: { select: { id: true, name: true, billingEmail: true, billingAddress: true } },
  contract: { select: { id: true, contractNumber: true, title: true } },
  facility: { select: { id: true, name: true } },
  createdByUser: { select: { id: true, fullName: true } },
  items: {
    select: {
      id: true,
      itemType: true,
      description: true,
      quantity: true,
      unitPrice: true,
      totalPrice: true,
      sortOrder: true,
      jobAllocations: {
        select: {
          id: true,
          jobId: true,
          allocatedAmount: true,
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
    orderBy: { sortOrder: 'asc' as const },
  },
  jobAllocations: {
    select: {
      id: true,
      jobId: true,
      invoiceItemId: true,
      allocatedAmount: true,
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
  payments: {
    select: {
      id: true,
      paymentDate: true,
      amount: true,
      paymentMethod: true,
      referenceNumber: true,
      notes: true,
      createdAt: true,
      recordedByUser: { select: { id: true, fullName: true } },
    },
    orderBy: { paymentDate: 'desc' as const },
  },
  activities: {
    select: {
      id: true,
      action: true,
      performedByUserId: true,
      metadata: true,
      createdAt: true,
      performedByUser: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
};

// ==================== Number generation ====================

async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const latest = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  });

  let nextNum = 1;
  if (latest) {
    const numPart = latest.invoiceNumber.replace(prefix, '');
    nextNum = parseInt(numPart, 10) + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

function calculateTotals(items: InvoiceItemInput[], taxRate: number) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;
  return { subtotal, taxAmount, totalAmount };
}

function assertValidDate(value: Date, label: string) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new BadRequestError(`Invalid ${label}`);
  }
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function atUtcStartOfDay(value: Date): Date {
  return new Date(`${toIsoDate(value)}T00:00:00.000Z`);
}

function getDateInTimezone(value: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

function normalizePeriodWindow(periodStart: Date, periodEnd: Date, timezone = 'UTC'): NormalizedPeriodWindow {
  assertValidDate(periodStart, 'period start date');
  assertValidDate(periodEnd, 'period end date');

  const startLocalDate = getDateInTimezone(periodStart, timezone);
  const endLocalDate = getDateInTimezone(periodEnd, timezone);
  const start = new Date(`${startLocalDate}T00:00:00.000Z`);
  const end = new Date(`${endLocalDate}T23:59:59.999Z`);

  if (end < start) {
    throw new BadRequestError('Billing period end date must be on or after period start date');
  }

  const durationDays = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (durationDays > MAX_BILLING_WINDOW_DAYS) {
    throw new BadRequestError(`Billing period cannot exceed ${MAX_BILLING_WINDOW_DAYS} days`);
  }

  return { start, end, timezone };
}

function parsePaymentTermsDays(paymentTerms?: string | null): number {
  if (!paymentTerms) return DEFAULT_PAYMENT_TERMS_DAYS;
  const normalized = paymentTerms.trim().toLowerCase();

  const netMatch = normalized.match(/net\s*(\d{1,3})/i);
  if (netMatch) return Number(netMatch[1]);

  const numberMatch = normalized.match(/(\d{1,3})/);
  if (numberMatch) return Number(numberMatch[1]);

  return DEFAULT_PAYMENT_TERMS_DAYS;
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getUtcDaysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function calculateProratedAmount(monthlyValue: number, periodStart: Date, periodEnd: Date): number {
  let total = 0;
  let cursor = atUtcStartOfDay(periodStart);
  const endDay = atUtcStartOfDay(periodEnd);

  while (cursor.getTime() <= endDay.getTime()) {
    const year = cursor.getUTCFullYear();
    const monthIndex = cursor.getUTCMonth();
    const daysInMonth = getUtcDaysInMonth(year, monthIndex);
    const monthEnd = new Date(Date.UTC(year, monthIndex, daysInMonth));
    const segmentEnd = monthEnd.getTime() < endDay.getTime() ? monthEnd : endDay;
    const segmentDays =
      Math.floor((segmentEnd.getTime() - cursor.getTime()) / (24 * 60 * 60 * 1000)) + 1;

    total += (monthlyValue / daysInMonth) * segmentDays;
    cursor = addUtcDays(segmentEnd, 1);
  }

  return Math.round(total * 100) / 100;
}

function nextBillingWindow(
  billingCycle: string | null | undefined,
  contractStartDate: Date,
  lastPeriodEnd: Date | null
): { start: Date; end: Date } {
  const start = lastPeriodEnd
    ? addUtcDays(atUtcStartOfDay(lastPeriodEnd), 1)
    : atUtcStartOfDay(contractStartDate);
  const cycle = (billingCycle ?? 'monthly').toLowerCase();
  let end: Date;
  switch (cycle) {
    case 'weekly':
      end = addUtcDays(start, 6);
      break;
    case 'biweekly':
      end = addUtcDays(start, 13);
      break;
    case 'quarterly': {
      const next = new Date(start);
      next.setUTCMonth(next.getUTCMonth() + 3);
      end = addUtcDays(next, -1);
      break;
    }
    case 'annually':
    case 'yearly': {
      const next = new Date(start);
      next.setUTCFullYear(next.getUTCFullYear() + 1);
      end = addUtcDays(next, -1);
      break;
    }
    case 'monthly':
    default: {
      const next = new Date(start);
      next.setUTCMonth(next.getUTCMonth() + 1);
      end = addUtcDays(next, -1);
      break;
    }
  }
  return { start, end };
}

export async function runInvoiceAutoGenerationCycle(input?: {
  now?: Date;
  createdByUserId?: string;
}): Promise<{
  checked: number;
  generated: number;
  skipped: number;
  errors: number;
  results: Array<{
    contractId: string;
    status: 'generated' | 'skipped_no_eligible_jobs' | 'skipped_window_open' | 'error';
    invoiceId?: string;
    reason?: string;
  }>;
}> {
  const now = input?.now ?? new Date();
  const createdByUserId = input?.createdByUserId ?? (await getSystemUserId());

  const contracts = await prisma.contract.findMany({
    where: {
      status: 'active',
      startDate: { lte: now },
    },
    select: {
      id: true,
      startDate: true,
      billingCycle: true,
      paymentTerms: true,
      invoices: {
        where: { status: { notIn: ['void'] } },
        orderBy: { periodEnd: 'desc' },
        take: 1,
        select: { periodEnd: true },
      },
    },
  });

  const results: Array<{
    contractId: string;
    status: 'generated' | 'skipped_no_eligible_jobs' | 'skipped_window_open' | 'error';
    invoiceId?: string;
    reason?: string;
  }> = [];

  for (const contract of contracts) {
    try {
      const lastPeriodEnd = contract.invoices[0]?.periodEnd ?? null;
      const window = nextBillingWindow(contract.billingCycle, contract.startDate, lastPeriodEnd);
      const windowEndUtc = atUtcStartOfDay(window.end);
      if (windowEndUtc.getTime() >= atUtcStartOfDay(now).getTime()) {
        results.push({ contractId: contract.id, status: 'skipped_window_open' });
        continue;
      }

      const jobs = await prisma.job.findMany({
        where: {
          ...getJobBasedInvoiceEligibilityFilter(),
          contractId: contract.id,
          scheduledDate: {
            gte: atUtcStartOfDay(window.start),
            lte: windowEndUtc,
          },
        },
        select: jobInvoiceCandidateSelect,
        orderBy: [{ scheduledDate: 'asc' }, { createdAt: 'asc' }],
      });

      if (jobs.length === 0) {
        results.push({ contractId: contract.id, status: 'skipped_no_eligible_jobs' });
        continue;
      }

      const issueDate = windowEndUtc;
      const dueDate = atUtcStartOfDay(
        addUtcDays(issueDate, parsePaymentTermsDays(contract.paymentTerms))
      );
      const invoice = await createInvoiceFromJobs({
        jobs,
        createdByUserId,
        issueDate,
        dueDate,
        periodStart: window.start,
        periodEnd: windowEndUtc,
        prorate: true,
        status: 'pending_review',
        applyMissedJobCredit: true,
      });

      results.push({
        contractId: contract.id,
        status: 'generated',
        invoiceId: invoice.id,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      results.push({ contractId: contract.id, status: 'error', reason: message });
    }
  }

  return {
    checked: contracts.length,
    generated: results.filter((r) => r.status === 'generated').length,
    skipped: results.filter((r) => r.status.startsWith('skipped')).length,
    errors: results.filter((r) => r.status === 'error').length,
    results,
  };
}

async function getSystemUserId(): Promise<string> {
  const user = await prisma.user.findFirst({
    where: {
      status: 'active',
      roles: { some: { role: { key: { in: ['owner', 'admin'] } } } },
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!user) {
    throw new BadRequestError(
      'Cannot run invoice auto-generation: no active owner/admin user found to attribute invoices to'
    );
  }
  return user.id;
}

function runWithBatchIdempotency<T>(key: string, action: () => Promise<T>): Promise<T> {
  const now = Date.now();
  for (const [existingKey, expiresAt] of batchIdempotencyLocks.entries()) {
    if (expiresAt <= now) {
      batchIdempotencyLocks.delete(existingKey);
    }
  }

  const active = batchIdempotencyLocks.get(key);
  if (active && active > now) {
    throw new BadRequestError('An invoice batch generation for this period is already in progress');
  }

  batchIdempotencyLocks.set(key, now + BATCH_IDEMPOTENCY_TTL_MS);
  return action().finally(() => {
    batchIdempotencyLocks.delete(key);
  });
}

function getJobBasedInvoiceEligibilityFilter() {
  return {
    status: 'completed',
    invoiceAllocations: { none: {} },
    OR: [
      { settlementReview: null },
      { settlementReview: { status: { in: ['ready', 'approved_invoice_only', 'approved_both'] } } },
    ],
  } satisfies Prisma.JobWhereInput;
}

function calculateContractInvoiceAmount(
  contractMonthlyValue: number,
  periodStart: Date,
  periodEnd: Date,
  prorate: boolean
): number {
  if (!Number.isFinite(contractMonthlyValue) || contractMonthlyValue < 0) {
    throw new BadRequestError('Contract is missing a valid monthly billing value');
  }

  if (!prorate) {
    return Math.round(contractMonthlyValue * 100) / 100;
  }

  return calculateProratedAmount(contractMonthlyValue, periodStart, periodEnd);
}

function splitInclusiveTax(totalGrossAmount: number, taxRate: number): {
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
} {
  if (!Number.isFinite(taxRate) || taxRate <= 0) {
    const roundedTotal = Math.round(totalGrossAmount * 100) / 100;
    return { subtotal: roundedTotal, taxAmount: 0, totalAmount: roundedTotal };
  }

  const totalAmount = Math.round(totalGrossAmount * 100) / 100;
  const subtotal = Math.round((totalAmount / (1 + taxRate)) * 100) / 100;
  const taxAmount = Math.round((totalAmount - subtotal) * 100) / 100;
  return { subtotal, taxAmount, totalAmount };
}

function splitAmountAcrossJobs(totalAmount: number, jobCount: number): number[] {
  if (jobCount <= 0) return [];

  const totalCents = Math.round(totalAmount * 100);
  const baseCents = Math.floor(totalCents / jobCount);
  const remainder = totalCents - baseCents * jobCount;

  return Array.from({ length: jobCount }, (_, index) => (baseCents + (index < remainder ? 1 : 0)) / 100);
}

const CUSTOMER_VISIBLE_INVOICE_STATUSES = new Set([
  'sent',
  'partial',
  'paid',
  'overdue',
  'written_off',
]);

const EDITABLE_INVOICE_STATUSES = new Set(['draft', 'pending_review']);

async function createInvoiceFromJobs(input: {
  jobs: JobInvoiceCandidate[];
  createdByUserId: string;
  issueDate: Date;
  dueDate: Date;
  periodStart: Date;
  periodEnd: Date;
  prorate: boolean;
  status?: string;
  applyMissedJobCredit?: boolean;
}) {
  if (input.jobs.length === 0) {
    throw new BadRequestError('No eligible completed jobs found to invoice');
  }

  const accountId = input.jobs[0].accountId;
  const contractId =
    input.jobs.every((job) => job.contractId && job.contractId === input.jobs[0].contractId)
      ? input.jobs[0].contractId
      : null;
  const facilityId =
    input.jobs.every((job) => job.facilityId === input.jobs[0].facilityId)
      ? input.jobs[0].facilityId
      : null;

  const jobsByContract = new Map<string, JobInvoiceCandidate[]>();

  for (const job of input.jobs) {
    if (!job.contractId || !job.contract) {
      throw new BadRequestError(`Job ${job.jobNumber} is missing a contract and cannot be invoiced automatically`);
    }

    const existing = jobsByContract.get(job.contractId) ?? [];
    existing.push(job);
    jobsByContract.set(job.contractId, existing);
  }

  const invoiceLineItems = Array.from(jobsByContract.values()).map((contractJobs, index) => {
    const firstJob = contractJobs[0];
    const contractName = firstJob.contract?.title ?? firstJob.contract?.contractNumber ?? 'Monthly Service';
    const facilityName = firstJob.facility?.name ?? 'Service Location';
    const grossAmount = calculateContractInvoiceAmount(
      Number(firstJob.contract?.monthlyValue ?? 0),
      input.periodStart,
      input.periodEnd,
      input.prorate
    );
    const taxRate = Number(firstJob.contract?.taxRate ?? 0);
    const split = splitInclusiveTax(grossAmount, taxRate);

    return {
      sortOrder: index,
      description: `${facilityName} - ${contractName} monthly service (${toIsoDate(input.periodStart)} to ${toIsoDate(input.periodEnd)})`,
      grossAmount: split.totalAmount,
      netAmount: split.subtotal,
      taxAmount: split.taxAmount,
      taxRate,
      jobs: contractJobs,
      allocations: splitAmountAcrossJobs(split.subtotal, contractJobs.length),
    };
  });

  // Optional: derive credit lines for missed jobs in this window that
  // do not have a make-up scheduled. Only the auto-generation path opts
  // in. Each missed job becomes a per-visit credit applied to its
  // contract line.
  const creditLineItems: Array<{
    sortOrder: number;
    description: string;
    grossAmount: number;
    netAmount: number;
    taxAmount: number;
    taxRate: number;
    missedJobIds: string[];
  }> = [];

  if (input.applyMissedJobCredit) {
    let creditIndex = invoiceLineItems.length;
    for (const [contractKey, contractJobs] of jobsByContract.entries()) {
      const missed = await prisma.job.findMany({
        where: {
          contractId: contractKey,
          status: 'missed',
          scheduledDate: { gte: input.periodStart, lte: input.periodEnd },
          // Exclude missed jobs that already have an associated make-up
          activities: { none: { action: 'make_up_created' } },
        },
        select: { id: true, jobNumber: true, scheduledDate: true },
      });
      if (missed.length === 0) continue;

      const contractLine = invoiceLineItems.find((item) =>
        item.jobs.some((j) => j.contractId === contractKey)
      );
      if (!contractLine) continue;

      const perVisitGross = contractLine.grossAmount / (contractJobs.length + missed.length);
      const creditGross = -Math.round(perVisitGross * missed.length * 100) / 100;
      const taxRate = contractLine.taxRate;
      const split = splitInclusiveTax(creditGross, taxRate);

      creditLineItems.push({
        sortOrder: creditIndex++,
        description: `Credit for ${missed.length} missed visit${missed.length === 1 ? '' : 's'} (${missed.map((m) => m.jobNumber).join(', ')})`,
        grossAmount: split.totalAmount,
        netAmount: split.subtotal,
        taxAmount: split.taxAmount,
        taxRate,
        missedJobIds: missed.map((m) => m.id),
      });
    }
  }

  const taxBreakdown = [...invoiceLineItems, ...creditLineItems].reduce(
    (acc, item) => {
      acc.subtotal += item.netAmount;
      acc.taxAmount += item.taxAmount;
      acc.totalAmount += item.grossAmount;
      return acc;
    },
    { subtotal: 0, taxAmount: 0, totalAmount: 0 }
  );
  const subtotal = Math.round(taxBreakdown.subtotal * 100) / 100;
  const taxAmount = Math.round(taxBreakdown.taxAmount * 100) / 100;
  const totalAmount = Math.round(taxBreakdown.totalAmount * 100) / 100;
  const effectiveTaxRate = subtotal > 0 ? Math.round((taxAmount / subtotal) * 10000) / 10000 : 0;
  const invoiceNumber = await generateInvoiceNumber();
  const { hashedToken } = createPublicTokenPair();

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        contractId,
        accountId,
        facilityId,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        subtotal: new Prisma.Decimal(subtotal),
        taxRate: new Prisma.Decimal(effectiveTaxRate),
        taxAmount: new Prisma.Decimal(taxAmount),
        totalAmount: new Prisma.Decimal(totalAmount),
        balanceDue: new Prisma.Decimal(totalAmount),
        createdByUserId: input.createdByUserId,
        publicToken: hashedToken,
        publicTokenExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        ...(input.status ? { status: input.status } : {}),
      },
      select: { id: true },
    });

    for (const lineItem of invoiceLineItems) {
      const createdItem = await tx.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          itemType: 'service',
          description: lineItem.description,
          quantity: new Prisma.Decimal(1),
          unitPrice: new Prisma.Decimal(lineItem.netAmount),
          totalPrice: new Prisma.Decimal(lineItem.netAmount),
          sortOrder: lineItem.sortOrder,
        },
        select: { id: true },
      });

      for (const [jobIndex, job] of lineItem.jobs.entries()) {
        await tx.invoiceJobAllocation.create({
          data: {
            invoiceId: invoice.id,
            invoiceItemId: createdItem.id,
            jobId: job.id,
            allocatedAmount: new Prisma.Decimal(lineItem.allocations[jobIndex] ?? 0),
          },
        });
      }
    }

    for (const credit of creditLineItems) {
      await tx.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          itemType: 'credit',
          description: credit.description,
          quantity: new Prisma.Decimal(1),
          unitPrice: new Prisma.Decimal(credit.netAmount),
          totalPrice: new Prisma.Decimal(credit.netAmount),
          sortOrder: credit.sortOrder,
        },
      });
    }

    await tx.invoiceActivity.create({
      data: {
        invoiceId: invoice.id,
        action: 'created',
        performedByUserId: input.createdByUserId,
        metadata: {
          source: 'completed_jobs',
          jobCount: input.jobs.length,
          billingMode: 'monthly_contract_value',
          taxIncluded: taxAmount > 0,
          jobIds: input.jobs.map((job) => job.id),
        },
      },
    });

    const detailed = await tx.invoice.findUnique({
      where: { id: invoice.id },
      select: invoiceDetailSelect,
    });
    if (!detailed) {
      throw new NotFoundError('Invoice not found after creation');
    }
    return detailed;
  });
}

// ==================== Service ====================

export async function listInvoices(
  params: InvoiceListParams,
  options?: InvoiceListAccessOptions
) {
  const { page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.InvoiceWhereInput = {};
  if (options?.userRole === 'manager' && options.userId) {
    where.account = { accountManagerId: options.userId };
  }
  if (params.accountId) where.accountId = params.accountId;
  if (params.contractId) where.contractId = params.contractId;
  if (params.facilityId) where.facilityId = params.facilityId;
  if (params.status) where.status = params.status;
  if (params.overdue) {
    where.dueDate = { lt: new Date() };
    where.balanceDue = { gt: 0 };
    where.status = { notIn: ['paid', 'void', 'written_off'] };
  }

  if (params.dateFrom != null || params.dateTo != null) {
    where.issueDate = {};
    if (params.dateFrom) (where.issueDate as Record<string, unknown>).gte = params.dateFrom;
    if (params.dateTo) (where.issueDate as Record<string, unknown>).lte = params.dateTo;
  }

  const [data, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      select: invoiceListSelect,
      orderBy: { issueDate: 'desc' },
      skip,
      take: limit,
    }),
    prisma.invoice.count({ where }),
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

export async function getInvoiceById(id: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: invoiceDetailSelect,
  });
  if (!invoice) throw new NotFoundError('Invoice not found');
  return invoice;
}

export async function getInvoiceByPublicToken(token: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: hashPublicToken(token) },
    select: invoiceDetailSelect,
  });
  if (!invoice) throw new NotFoundError('Invoice not found');
  if (!CUSTOMER_VISIBLE_INVOICE_STATUSES.has(invoice.status)) {
    // Hide pre-send statuses (draft, pending_review, void) behind a generic
    // not-found to avoid leaking that an invoice exists.
    throw new NotFoundError('Invoice not found');
  }
  if (invoice.publicTokenExpiresAt && new Date() > new Date(invoice.publicTokenExpiresAt)) {
    throw new BadRequestError('Invoice link has expired');
  }

  // Mark as viewed
  if (!invoice.viewedAt) {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { viewedAt: new Date() },
    });
  }

  return invoice;
}

export async function generateInvoicePublicToken(invoiceId: string): Promise<string> {
  const { rawToken, hashedToken } = createPublicTokenPair();
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      publicToken: hashedToken,
      publicTokenExpiresAt: expiresAt,
    },
  });

  return rawToken;
}

export async function createInvoice(input: InvoiceCreateInput) {
  const invoiceNumber = await generateInvoiceNumber();
  const globalSettings = input.taxRate === undefined ? await getGlobalSettings() : null;
  const taxRate = input.taxRate ?? globalSettings?.taxRate ?? 0;
  const { subtotal, taxAmount, totalAmount } = calculateTotals(input.items, taxRate);
  const { hashedToken } = createPublicTokenPair();

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      contractId: input.contractId,
      accountId: input.accountId,
      facilityId: input.facilityId,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      subtotal: new Prisma.Decimal(subtotal),
      taxRate: new Prisma.Decimal(taxRate),
      taxAmount: new Prisma.Decimal(taxAmount),
      totalAmount: new Prisma.Decimal(totalAmount),
      balanceDue: new Prisma.Decimal(totalAmount),
      notes: input.notes,
      paymentInstructions: input.paymentInstructions,
      createdByUserId: input.createdByUserId,
      publicToken: hashedToken,
      publicTokenExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      items: {
        create: input.items.map((item, idx) => ({
          itemType: item.itemType ?? 'service',
          description: item.description,
          quantity: new Prisma.Decimal(item.quantity),
          unitPrice: new Prisma.Decimal(item.unitPrice),
          totalPrice: new Prisma.Decimal(Math.round(item.quantity * item.unitPrice * 100) / 100),
          sortOrder: item.sortOrder ?? idx,
        })),
      },
      activities: {
        create: {
          action: 'created',
          performedByUserId: input.createdByUserId,
          metadata: {},
        },
      },
    },
    select: invoiceDetailSelect,
  });

  return invoice;
}

export async function updateInvoice(id: string, input: InvoiceUpdateInput) {
  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Invoice not found');
  if (!EDITABLE_INVOICE_STATUSES.has(existing.status)) {
    throw new BadRequestError('Only draft or pending-review invoices can be edited');
  }

  return prisma.$transaction(async (tx) => {
    if (input.items !== undefined) {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
      const taxRate = input.taxRate ?? parseFloat(existing.taxRate.toString());
      const { subtotal, taxAmount, totalAmount } = calculateTotals(input.items, taxRate);
      const amountPaid = parseFloat(existing.amountPaid.toString());

      await tx.invoiceItem.createMany({
        data: input.items.map((item, idx) => ({
          invoiceId: id,
          itemType: item.itemType ?? 'service',
          description: item.description,
          quantity: new Prisma.Decimal(item.quantity),
          unitPrice: new Prisma.Decimal(item.unitPrice),
          totalPrice: new Prisma.Decimal(Math.round(item.quantity * item.unitPrice * 100) / 100),
          sortOrder: item.sortOrder ?? idx,
        })),
      });

      await tx.invoice.update({
        where: { id },
        data: {
          subtotal: new Prisma.Decimal(subtotal),
          taxRate: new Prisma.Decimal(taxRate),
          taxAmount: new Prisma.Decimal(taxAmount),
          totalAmount: new Prisma.Decimal(totalAmount),
          balanceDue: new Prisma.Decimal(Math.max(0, totalAmount - amountPaid)),
          ...(input.issueDate && { issueDate: input.issueDate }),
          ...(input.dueDate && { dueDate: input.dueDate }),
          ...(input.notes !== undefined && { notes: input.notes }),
          ...(input.paymentInstructions !== undefined && { paymentInstructions: input.paymentInstructions }),
        },
      });
    } else {
      const data: Record<string, unknown> = {};
      if (input.issueDate) data.issueDate = input.issueDate;
      if (input.dueDate) data.dueDate = input.dueDate;
      if (input.notes !== undefined) data.notes = input.notes;
      if (input.paymentInstructions !== undefined) data.paymentInstructions = input.paymentInstructions;

      if (input.taxRate !== undefined) {
        const subtotal = parseFloat(existing.subtotal.toString());
        const taxAmount = Math.round(subtotal * input.taxRate * 100) / 100;
        const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;
        const amountPaid = parseFloat(existing.amountPaid.toString());
        data.taxRate = new Prisma.Decimal(input.taxRate);
        data.taxAmount = new Prisma.Decimal(taxAmount);
        data.totalAmount = new Prisma.Decimal(totalAmount);
        data.balanceDue = new Prisma.Decimal(Math.max(0, totalAmount - amountPaid));
      }

      await tx.invoice.update({ where: { id }, data });
    }

    return tx.invoice.findUnique({
      where: { id },
      select: invoiceDetailSelect,
    });
  });
}

export async function sendInvoice(id: string, userId: string) {
  const existing = await prisma.invoice.findUnique({
    where: { id },
    select: {
      ...invoiceDetailSelect,
      account: { select: { id: true, name: true, billingEmail: true, billingAddress: true } },
      facility: { select: { id: true, name: true, address: true } },
    },
  });
  if (!existing) throw new NotFoundError('Invoice not found');
  if (existing.status === 'void') throw new BadRequestError('Cannot send a voided invoice');
  if (!EDITABLE_INVOICE_STATUSES.has(existing.status)) {
    throw new BadRequestError('Invoice has already been sent');
  }
  if (!existing.account?.billingEmail) {
    throw new BadRequestError('Account is missing a billing email; cannot send invoice');
  }

  const rawToken = await generateInvoicePublicToken(id);
  const baseUrl = (process.env.PUBLIC_APP_URL ?? process.env.APP_BASE_URL ?? '').replace(/\/$/, '');
  const publicUrl = baseUrl ? `${baseUrl}/invoices/public/${rawToken}` : null;

  const pdfBuffer = await generateInvoicePdf({
    invoiceNumber: existing.invoiceNumber,
    issueDate: existing.issueDate,
    dueDate: existing.dueDate,
    periodStart: existing.periodStart,
    periodEnd: existing.periodEnd,
    notes: existing.notes,
    paymentInstructions: existing.paymentInstructions,
    subtotal: existing.subtotal.toString(),
    taxRate: existing.taxRate.toString(),
    taxAmount: existing.taxAmount.toString(),
    totalAmount: existing.totalAmount.toString(),
    amountPaid: existing.amountPaid.toString(),
    balanceDue: existing.balanceDue.toString(),
    account: {
      name: existing.account.name,
      billingAddress: existing.account.billingAddress,
    },
    facility: existing.facility
      ? { name: existing.facility.name, address: existing.facility.address }
      : null,
    items: existing.items.map((item) => ({
      description: item.description,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      totalPrice: item.totalPrice.toString(),
    })),
  });

  const subject = `Invoice ${existing.invoiceNumber} from ${existing.account.name}`;
  const linkBlock = publicUrl
    ? `<p>You can view this invoice online: <a href="${publicUrl}">${publicUrl}</a></p>`
    : '';
  const html = `
    <p>Hello,</p>
    <p>Please find your invoice <strong>${existing.invoiceNumber}</strong> attached.</p>
    <p><strong>Total Due:</strong> ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(existing.balanceDue))}</p>
    <p><strong>Due Date:</strong> ${new Date(existing.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    ${linkBlock}
    <p>Thank you for your business.</p>
  `;

  let emailDelivered = false;
  try {
    emailDelivered = await sendInvoiceEmail(
      existing.account.billingEmail,
      undefined,
      subject,
      html,
      pdfBuffer,
      existing.invoiceNumber,
    );
  } catch (error) {
    logger.error('Failed to send invoice email', { invoiceId: id, error });
    throw new BadRequestError('Invoice email failed to send. Please verify the billing email and try again.');
  }

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      status: 'sent',
      sentAt: new Date(),
      activities: {
        create: {
          action: 'sent',
          performedByUserId: userId,
          metadata: {
            recipient: existing.account.billingEmail,
            emailDelivered,
            invoiceNumber: existing.invoiceNumber,
          },
        },
      },
    },
    select: invoiceDetailSelect,
  });

  return invoice;
}

export async function recordPayment(invoiceId: string, input: RecordPaymentInput) {
  const existing = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!existing) throw new NotFoundError('Invoice not found');
  if (existing.status === 'void') throw new BadRequestError('Cannot record payment on voided invoice');

  const newAmountPaid = parseFloat(existing.amountPaid.toString()) + input.amount;
  const totalAmount = parseFloat(existing.totalAmount.toString());
  const newBalanceDue = Math.max(0, Math.round((totalAmount - newAmountPaid) * 100) / 100);
  const newStatus = newBalanceDue <= 0 ? 'paid' : 'partial';

  const result = await prisma.$transaction(async (tx) => {
    await tx.invoicePayment.create({
      data: {
        invoiceId,
        paymentDate: input.paymentDate,
        amount: new Prisma.Decimal(input.amount),
        paymentMethod: input.paymentMethod,
        referenceNumber: input.referenceNumber,
        notes: input.notes,
        recordedByUserId: input.recordedByUserId,
      },
    });

    const invoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: new Prisma.Decimal(newAmountPaid),
        balanceDue: new Prisma.Decimal(newBalanceDue),
        status: newStatus,
        ...(newBalanceDue <= 0 && { paidAt: new Date() }),
        activities: {
          create: {
            action: 'payment_recorded',
            performedByUserId: input.recordedByUserId,
            metadata: { amount: input.amount, method: input.paymentMethod },
          },
        },
      },
      select: invoiceDetailSelect,
    });

    return invoice;
  });

  return result;
}

export async function voidInvoice(id: string, userId: string, reason?: string) {
  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Invoice not found');
  if (existing.status === 'paid') throw new BadRequestError('Cannot void a paid invoice');

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      status: 'void',
      activities: {
        create: {
          action: 'voided',
          performedByUserId: userId,
          metadata: reason ? { reason } : {},
        },
      },
    },
    select: invoiceDetailSelect,
  });

  return invoice;
}

export async function generateInvoiceFromContract(
  contractId: string,
  periodStart: Date,
  periodEnd: Date,
  createdByUserId: string,
  prorate = true
) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      id: true,
      paymentTerms: true,
      facility: { select: { address: true } },
    },
  });
  if (!contract) throw new NotFoundError('Contract not found');

  const timezone = extractFacilityTimezone(contract.facility?.address) ?? 'UTC';
  const window = normalizePeriodWindow(periodStart, periodEnd, timezone);
  const termsDays = parsePaymentTermsDays(contract.paymentTerms);
  const issueDate = atUtcStartOfDay(window.end);
  const dueDate = atUtcStartOfDay(addUtcDays(issueDate, termsDays));

  const jobs = await prisma.job.findMany({
    where: {
      ...getJobBasedInvoiceEligibilityFilter(),
      contractId,
      scheduledDate: {
        gte: atUtcStartOfDay(window.start),
        lte: atUtcStartOfDay(window.end),
      },
    },
    select: jobInvoiceCandidateSelect,
    orderBy: [{ scheduledDate: 'asc' }, { createdAt: 'asc' }],
  });

  if (jobs.length === 0) {
    throw new BadRequestError('No eligible completed jobs found for this contract and period');
  }

  return createInvoiceFromJobs({
    jobs,
    createdByUserId,
    issueDate,
    dueDate,
    periodStart: window.start,
    periodEnd: window.end,
    prorate,
  });
}

export async function batchGenerateInvoices(
  periodStart: Date,
  periodEnd: Date,
  createdByUserId: string,
  prorate = true,
  options: { status?: string } = {}
) {
  const normalizedWindow = normalizePeriodWindow(periodStart, periodEnd, 'UTC');
  const batchKey = `invoice_batch:${toIsoDate(normalizedWindow.start)}:${toIsoDate(normalizedWindow.end)}:${normalizedWindow.timezone}:${prorate ? 'prorate' : 'full'}`;

  return runWithBatchIdempotency(batchKey, async () => {
    const eligibleJobs = await prisma.job.findMany({
      where: {
        ...getJobBasedInvoiceEligibilityFilter(),
        scheduledDate: {
          gte: atUtcStartOfDay(normalizedWindow.start),
          lte: atUtcStartOfDay(normalizedWindow.end),
        },
      },
      select: jobInvoiceCandidateSelect,
      orderBy: [{ accountId: 'asc' }, { scheduledDate: 'asc' }, { createdAt: 'asc' }],
    });

    const results: {
      accountId: string;
      status: 'generated' | 'skipped_no_jobs' | 'error';
      reason?: string;
      invoiceId?: string;
      lineItems?: number;
    }[] = [];

    const jobsByAccount = new Map<
      string,
      typeof eligibleJobs
    >();

    for (const job of eligibleJobs) {
      if (!job.contract) {
        results.push({
          accountId: job.accountId,
          status: 'error',
          reason: `Job ${job.jobNumber} is missing a contract`,
        });
        continue;
      }
      const existing = jobsByAccount.get(job.accountId) ?? [];
      existing.push(job);
      jobsByAccount.set(job.accountId, existing);
    }

    for (const [accountId, accountJobs] of jobsByAccount.entries()) {
      try {
        if (accountJobs.length === 0) {
          results.push({ accountId, status: 'skipped_no_jobs', reason: 'No eligible completed jobs found' });
          continue;
        }

        const issueDate = atUtcStartOfDay(normalizedWindow.end);
        const paymentTerms = accountJobs[0]?.contract?.paymentTerms;
        const dueDate = atUtcStartOfDay(addUtcDays(issueDate, parsePaymentTermsDays(paymentTerms)));
        const invoice = await createInvoiceFromJobs({
          jobs: accountJobs,
          createdByUserId,
          issueDate,
          dueDate,
          periodStart: normalizedWindow.start,
          periodEnd: normalizedWindow.end,
          prorate,
          status: options.status,
        });

        results.push({
          accountId,
          status: 'generated',
          invoiceId: invoice.id,
          lineItems: invoice.items.length,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        results.push({ accountId, status: 'error', reason: message });
      }
    }

    return {
      periodStart: toIsoDate(normalizedWindow.start),
      periodEnd: toIsoDate(normalizedWindow.end),
      prorate,
      generated: results.filter((r) => r.status === 'generated').length,
      skipped: results.filter((r) => r.status !== 'generated').length,
      duplicates: 0,
      errors: results.filter((r) => r.status === 'error').length,
      results,
    };
  });
}

// ==================== Activity ====================

export async function listInvoiceActivities(invoiceId: string) {
  return prisma.invoiceActivity.findMany({
    where: { invoiceId },
    select: {
      id: true,
      action: true,
      performedByUserId: true,
      metadata: true,
      createdAt: true,
      performedByUser: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}
