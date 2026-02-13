import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';
import crypto from 'crypto';

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
  publicToken: true,
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
    },
    orderBy: { sortOrder: 'asc' as const },
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

// ==================== Service ====================

export async function listInvoices(params: InvoiceListParams) {
  const { page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (params.accountId) where.accountId = params.accountId;
  if (params.contractId) where.contractId = params.contractId;
  if (params.facilityId) where.facilityId = params.facilityId;
  if (params.status) where.status = params.status;
  if (params.overdue) {
    where.dueDate = { lt: new Date() };
    where.balanceDue = { gt: 0 };
    where.status = { notIn: ['paid', 'void', 'written_off'] };
  }

  if (params.dateFrom || params.dateTo) {
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
    where: { publicToken: token },
    select: invoiceDetailSelect,
  });
  if (!invoice) throw new NotFoundError('Invoice not found');
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

export async function createInvoice(input: InvoiceCreateInput) {
  const invoiceNumber = await generateInvoiceNumber();
  const taxRate = input.taxRate || 0;
  const { subtotal, taxAmount, totalAmount } = calculateTotals(input.items, taxRate);

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
      publicToken: crypto.randomBytes(32).toString('hex'),
      publicTokenExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      items: {
        create: input.items.map((item, idx) => ({
          itemType: item.itemType || 'service',
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
  if (existing.status !== 'draft') throw new BadRequestError('Only draft invoices can be edited');

  return prisma.$transaction(async (tx) => {
    if (input.items !== undefined) {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
      const taxRate = input.taxRate !== undefined ? input.taxRate : parseFloat(existing.taxRate.toString());
      const { subtotal, taxAmount, totalAmount } = calculateTotals(input.items, taxRate);
      const amountPaid = parseFloat(existing.amountPaid.toString());

      await tx.invoiceItem.createMany({
        data: input.items.map((item, idx) => ({
          invoiceId: id,
          itemType: item.itemType || 'service',
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
  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Invoice not found');
  if (existing.status === 'void') throw new BadRequestError('Cannot send a voided invoice');

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      status: 'sent',
      sentAt: new Date(),
      activities: {
        create: {
          action: 'sent',
          performedByUserId: userId,
          metadata: {},
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
  createdByUserId: string
) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      id: true,
      contractNumber: true,
      title: true,
      accountId: true,
      facilityId: true,
      monthlyValue: true,
    },
  });
  if (!contract) throw new NotFoundError('Contract not found');

  const monthlyValue = parseFloat(contract.monthlyValue.toString());

  return createInvoice({
    contractId,
    accountId: contract.accountId,
    facilityId: contract.facilityId,
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // NET30
    periodStart,
    periodEnd,
    createdByUserId,
    items: [
      {
        itemType: 'service',
        description: `${contract.title || contract.contractNumber} — Cleaning Services (${periodStart.toLocaleDateString()} – ${periodEnd.toLocaleDateString()})`,
        quantity: 1,
        unitPrice: monthlyValue,
      },
    ],
  });
}

export async function batchGenerateInvoices(
  periodStart: Date,
  periodEnd: Date,
  createdByUserId: string
) {
  const activeContracts = await prisma.contract.findMany({
    where: { status: 'active' },
    select: { id: true },
  });

  const results: { contractId: string; invoiceId?: string; error?: string }[] = [];

  for (const contract of activeContracts) {
    try {
      // Check if invoice already exists for this period
      const existing = await prisma.invoice.findFirst({
        where: {
          contractId: contract.id,
          periodStart,
          periodEnd,
        },
      });
      if (existing) {
        results.push({ contractId: contract.id, error: 'Invoice already exists' });
        continue;
      }

      const invoice = await generateInvoiceFromContract(
        contract.id,
        periodStart,
        periodEnd,
        createdByUserId
      );
      results.push({ contractId: contract.id, invoiceId: invoice.id });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      results.push({ contractId: contract.id, error: message });
    }
  }

  return {
    generated: results.filter((r) => r.invoiceId).length,
    skipped: results.filter((r) => r.error).length,
    results,
  };
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
