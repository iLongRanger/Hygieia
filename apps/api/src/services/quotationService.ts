import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';

// ==================== Interfaces ====================

export interface QuotationListParams {
  page?: number;
  limit?: number;
  status?: string;
  accountId?: string;
  facilityId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeArchived?: boolean;
}

export interface QuotationServiceInput {
  serviceName: string;
  description?: string | null;
  price: number;
  includedTasks?: string[];
  sortOrder?: number;
}

export interface QuotationCreateInput {
  accountId: string;
  facilityId?: string | null;
  title: string;
  description?: string | null;
  validUntil?: Date | null;
  scheduledDate?: Date | null;
  scheduledStartTime?: Date | null;
  scheduledEndTime?: Date | null;
  taxRate?: number;
  notes?: string | null;
  termsAndConditions?: string | null;
  createdByUserId: string;
  services?: QuotationServiceInput[];
}

export interface QuotationUpdateInput {
  accountId?: string;
  facilityId?: string | null;
  title?: string;
  status?: string;
  description?: string | null;
  validUntil?: Date | null;
  scheduledDate?: Date | null;
  scheduledStartTime?: Date | null;
  scheduledEndTime?: Date | null;
  taxRate?: number;
  notes?: string | null;
  termsAndConditions?: string | null;
  services?: (QuotationServiceInput & { id?: string })[];
}

// ==================== Select objects ====================

const quotationListSelect = {
  id: true,
  quotationNumber: true,
  title: true,
  status: true,
  subtotal: true,
  taxRate: true,
  taxAmount: true,
  totalAmount: true,
  validUntil: true,
  scheduledDate: true,
  scheduledStartTime: true,
  scheduledEndTime: true,
  sentAt: true,
  viewedAt: true,
  acceptedAt: true,
  rejectedAt: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  account: {
    select: { id: true, name: true, type: true },
  },
  facility: {
    select: { id: true, name: true },
  },
  createdByUser: {
    select: { id: true, fullName: true },
  },
  _count: {
    select: { services: true },
  },
};

const quotationDetailSelect = {
  id: true,
  quotationNumber: true,
  title: true,
  status: true,
  description: true,
  subtotal: true,
  taxRate: true,
  taxAmount: true,
  totalAmount: true,
  validUntil: true,
  scheduledDate: true,
  scheduledStartTime: true,
  scheduledEndTime: true,
  notes: true,
  termsAndConditions: true,
  sentAt: true,
  viewedAt: true,
  acceptedAt: true,
  rejectedAt: true,
  rejectionReason: true,
  publicToken: true,
  signatureName: true,
  signatureDate: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  account: {
    select: { id: true, name: true, type: true, billingEmail: true },
  },
  facility: {
    select: { id: true, name: true, address: true },
  },
  createdByUser: {
    select: { id: true, fullName: true, email: true },
  },
  services: {
    select: {
      id: true,
      serviceName: true,
      description: true,
      price: true,
      includedTasks: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: 'asc' as const },
  },
  activities: {
    select: {
      id: true,
      action: true,
      metadata: true,
      ipAddress: true,
      createdAt: true,
      performedByUser: {
        select: { id: true, fullName: true },
      },
    },
    orderBy: { createdAt: 'desc' as const },
    take: 50,
  },
  generatedJob: {
    select: {
      id: true,
      jobNumber: true,
      status: true,
    },
  },
};

// ==================== Helpers ====================

async function generateQuotationNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `QT-${year}`;

  const latest = await prisma.quotation.findFirst({
    where: {
      quotationNumber: { startsWith: prefix },
    },
    orderBy: { quotationNumber: 'desc' },
    select: { quotationNumber: true },
  });

  let sequence = 1;
  if (latest) {
    const parts = latest.quotationNumber.split('-');
    const lastSeq = parseInt(parts[2], 10);
    sequence = lastSeq + 1;
  }

  return `${prefix}-${sequence.toString().padStart(4, '0')}`;
}

function calculateTotals(
  services: QuotationServiceInput[],
  taxRate: number
): { subtotal: number; taxAmount: number; totalAmount: number } {
  const subtotal = services.reduce((sum, s) => sum + Number(s.price), 0);
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;
  return { subtotal, taxAmount, totalAmount };
}

// ==================== Service ====================

export async function listQuotations(params: QuotationListParams) {
  const {
    page = 1,
    limit = 20,
    status,
    accountId,
    facilityId,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includeArchived = false,
  } = params;

  const skip = (page - 1) * limit;
  const where: Prisma.QuotationWhereInput = {};

  if (!includeArchived) where.archivedAt = null;
  if (status) where.status = status;
  if (accountId) where.accountId = accountId;
  if (facilityId) where.facilityId = facilityId;
  if (search) {
    where.OR = [
      { quotationNumber: { contains: search, mode: 'insensitive' } },
      { title: { contains: search, mode: 'insensitive' } },
      { account: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const orderBy: Record<string, string> = {};
  orderBy[sortBy] = sortOrder;

  const [data, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      select: quotationListSelect,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.quotation.count({ where }),
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

export async function getQuotationById(id: string) {
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    select: quotationDetailSelect,
  });
  if (!quotation) throw new NotFoundError('Quotation not found');
  return quotation;
}

export async function getQuotationByNumber(quotationNumber: string) {
  const quotation = await prisma.quotation.findUnique({
    where: { quotationNumber },
    select: quotationDetailSelect,
  });
  if (!quotation) throw new NotFoundError('Quotation not found');
  return quotation;
}

export async function createQuotation(input: QuotationCreateInput) {
  const quotationNumber = await generateQuotationNumber();
  const taxRate = input.taxRate ?? 0;
  const services = input.services ?? [];
  const totals = calculateTotals(services, taxRate);

  return prisma.quotation.create({
    data: {
      quotationNumber,
      title: input.title,
      description: input.description,
      status: 'draft',
      subtotal: totals.subtotal,
      taxRate,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      validUntil: input.validUntil,
      scheduledDate: input.scheduledDate,
      scheduledStartTime: input.scheduledStartTime,
      scheduledEndTime: input.scheduledEndTime,
      notes: input.notes,
      termsAndConditions: input.termsAndConditions,
      accountId: input.accountId,
      facilityId: input.facilityId,
      createdByUserId: input.createdByUserId,
      services: {
        create: services.map((s, index) => ({
          serviceName: s.serviceName,
          description: s.description,
          price: s.price,
          includedTasks: s.includedTasks ?? [],
          sortOrder: s.sortOrder ?? index,
        })),
      },
    },
    select: quotationDetailSelect,
  });
}

export async function updateQuotation(id: string, input: QuotationUpdateInput) {
  const existing = await prisma.quotation.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Quotation not found');

  return prisma.$transaction(async (tx) => {
    // Rebuild services if provided
    if (input.services !== undefined) {
      await tx.quotationService.deleteMany({ where: { quotationId: id } });
      await tx.quotationService.createMany({
        data: input.services.map((s, index) => ({
          quotationId: id,
          serviceName: s.serviceName,
          description: s.description,
          price: s.price,
          includedTasks: s.includedTasks ?? [],
          sortOrder: s.sortOrder ?? index,
        })),
      });
    }

    // Recalculate totals
    const taxRate = input.taxRate ?? Number(existing.taxRate);
    let subtotal: number;

    if (input.services !== undefined) {
      subtotal = input.services.reduce((sum, s) => sum + Number(s.price), 0);
    } else {
      // Keep existing subtotal
      subtotal = Number(existing.subtotal);
    }

    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    return tx.quotation.update({
      where: { id },
      data: {
        ...(input.accountId !== undefined && { accountId: input.accountId }),
        ...(input.facilityId !== undefined && { facilityId: input.facilityId }),
        ...(input.title !== undefined && { title: input.title }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.validUntil !== undefined && { validUntil: input.validUntil }),
        ...(input.scheduledDate !== undefined && { scheduledDate: input.scheduledDate }),
        ...(input.scheduledStartTime !== undefined && { scheduledStartTime: input.scheduledStartTime }),
        ...(input.scheduledEndTime !== undefined && { scheduledEndTime: input.scheduledEndTime }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.termsAndConditions !== undefined && { termsAndConditions: input.termsAndConditions }),
        subtotal,
        taxRate,
        taxAmount,
        totalAmount,
      },
      select: quotationDetailSelect,
    });
  });
}

export async function sendQuotation(id: string) {
  const existing = await prisma.quotation.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) throw new NotFoundError('Quotation not found');

  return prisma.quotation.update({
    where: { id },
    data: {
      status: 'sent',
      sentAt: new Date(),
    },
    select: quotationDetailSelect,
  });
}

export async function markQuotationAsViewed(id: string) {
  const existing = await prisma.quotation.findUnique({
    where: { id },
    select: { id: true, status: true, viewedAt: true },
  });
  if (!existing) throw new NotFoundError('Quotation not found');

  if (!existing.viewedAt) {
    return prisma.quotation.update({
      where: { id },
      data: {
        status: existing.status === 'sent' ? 'viewed' : existing.status,
        viewedAt: new Date(),
      },
      select: quotationDetailSelect,
    });
  }
  return getQuotationById(id);
}

export async function acceptQuotation(id: string, signatureName?: string) {
  const existing = await prisma.quotation.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      accountId: true,
      facilityId: true,
      title: true,
      quotationNumber: true,
      description: true,
      scheduledDate: true,
      scheduledStartTime: true,
      scheduledEndTime: true,
      createdByUserId: true,
      services: {
        select: {
          serviceName: true,
          description: true,
          includedTasks: true,
        },
        orderBy: { sortOrder: 'asc' },
      },
      generatedJob: {
        select: { id: true },
      },
    },
  });
  if (!existing) throw new NotFoundError('Quotation not found');

  if (existing.status === 'accepted') {
    await ensureOneTimeJobForAcceptedQuotation(id);
    return getQuotationById(id);
  }

  if (!existing.facilityId) {
    throw new BadRequestError('Facility is required before accepting a quotation');
  }
  if (!existing.scheduledDate || !existing.scheduledStartTime || !existing.scheduledEndTime) {
    throw new BadRequestError(
      'Scheduled date, start time, and end time are required before accepting a quotation'
    );
  }
  if (existing.scheduledEndTime <= existing.scheduledStartTime) {
    throw new BadRequestError('Scheduled end time must be after scheduled start time');
  }

  await prisma.quotation.update({
    where: { id },
    data: {
      status: 'accepted',
      acceptedAt: new Date(),
      ...(signatureName && {
        signatureName,
        signatureDate: new Date(),
      }),
    },
  });

  await ensureOneTimeJobForAcceptedQuotation(id);
  return getQuotationById(id);
}

export async function ensureOneTimeJobForAcceptedQuotation(quotationId: string): Promise<{
  created: boolean;
  jobId: string;
  jobNumber: string;
}> {
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    select: {
      id: true,
      status: true,
      quotationNumber: true,
      title: true,
      description: true,
      accountId: true,
      facilityId: true,
      scheduledDate: true,
      scheduledStartTime: true,
      scheduledEndTime: true,
      createdByUserId: true,
      generatedJob: {
        select: {
          id: true,
          jobNumber: true,
        },
      },
      services: {
        select: {
          serviceName: true,
          description: true,
          includedTasks: true,
        },
        orderBy: { sortOrder: 'asc' as const },
      },
    },
  });

  if (!quotation) throw new NotFoundError('Quotation not found');
  if (quotation.status !== 'accepted') {
    throw new BadRequestError('Quotation must be accepted before creating a one-time job');
  }
  if (!quotation.facilityId) {
    throw new BadRequestError('Quotation must have a facility to create a one-time job');
  }
  if (!quotation.scheduledDate || !quotation.scheduledStartTime || !quotation.scheduledEndTime) {
    throw new BadRequestError(
      'Quotation must include scheduled date, start time, and end time before creating a one-time job'
    );
  }

  if (quotation.generatedJob) {
    return {
      created: false,
      jobId: quotation.generatedJob.id,
      jobNumber: quotation.generatedJob.jobNumber,
    };
  }

  const notesLines = quotation.services.map((service, idx) => {
    const line = `${idx + 1}. ${service.serviceName}`;
    return service.description ? `${line} - ${service.description}` : line;
  });

  try {
    return await prisma.$transaction(async (tx) => {
    const year = new Date().getFullYear();
    const prefix = `WO-${year}-`;
    const latest = await tx.job.findFirst({
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
    const jobNumber = `${prefix}${String(seq).padStart(4, '0')}`;

    const job = await tx.job.create({
      data: {
        jobNumber,
        contractId: null,
        quotationId: quotation.id,
        facilityId: quotation.facilityId,
        accountId: quotation.accountId,
        jobType: 'special_job',
        jobCategory: 'one_time',
        status: 'scheduled',
        scheduledDate: quotation.scheduledDate,
        scheduledStartTime: quotation.scheduledStartTime,
        scheduledEndTime: quotation.scheduledEndTime,
        notes:
          notesLines.length > 0
            ? `From quotation ${quotation.quotationNumber}\n${notesLines.join('\n')}`
            : `From quotation ${quotation.quotationNumber}`,
        createdByUserId: quotation.createdByUserId,
      },
      select: { id: true, jobNumber: true },
    });

    const tasks: Array<{
      taskName: string;
      description: string | null;
      status: string;
    }> = [];
    for (const service of quotation.services) {
      const includedTasks = Array.isArray(service.includedTasks)
        ? (service.includedTasks as unknown[]).filter((task): task is string => typeof task === 'string')
        : [];
      if (includedTasks.length > 0) {
        for (const taskName of includedTasks) {
          tasks.push({
            taskName,
            description: service.serviceName,
            status: 'pending',
          });
        }
      } else {
        tasks.push({
          taskName: service.serviceName,
          description: service.description ?? null,
          status: 'pending',
        });
      }
    }

    if (tasks.length > 0) {
      await tx.jobTask.createMany({
        data: tasks.map((task) => ({
          jobId: job.id,
          facilityTaskId: null,
          taskName: task.taskName,
          description: task.description,
          status: task.status,
          estimatedMinutes: null,
          actualMinutes: null,
          notes: null,
          completedAt: null,
          completedByUserId: null,
        })),
      });
    }

    await tx.jobActivity.create({
      data: {
        jobId: job.id,
        action: 'created',
        performedByUserId: quotation.createdByUserId,
        metadata: {
          source: 'quotation_accepted',
          quotationId: quotation.id,
          quotationNumber: quotation.quotationNumber,
        },
      },
    });

      return { created: true, jobId: job.id, jobNumber: job.jobNumber };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const existingJob = await prisma.job.findUnique({
        where: { quotationId: quotation.id },
        select: { id: true, jobNumber: true },
      });
      if (existingJob) {
        return {
          created: false,
          jobId: existingJob.id,
          jobNumber: existingJob.jobNumber,
        };
      }
    }
    throw error;
  }
}

export async function rejectQuotation(id: string, rejectionReason: string) {
  const existing = await prisma.quotation.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) throw new NotFoundError('Quotation not found');

  return prisma.quotation.update({
    where: { id },
    data: {
      status: 'rejected',
      rejectedAt: new Date(),
      rejectionReason,
    },
    select: quotationDetailSelect,
  });
}

export async function archiveQuotation(id: string) {
  const existing = await prisma.quotation.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Quotation not found');

  return prisma.quotation.update({
    where: { id },
    data: { archivedAt: new Date() },
    select: quotationDetailSelect,
  });
}

export async function restoreQuotation(id: string) {
  const existing = await prisma.quotation.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Quotation not found');

  return prisma.quotation.update({
    where: { id },
    data: { archivedAt: null },
    select: quotationDetailSelect,
  });
}

export async function deleteQuotation(id: string) {
  const existing = await prisma.quotation.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Quotation not found');

  await prisma.quotation.delete({ where: { id } });
}

export async function logQuotationActivity(params: {
  quotationId: string;
  action: string;
  performedByUserId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  return prisma.quotationActivity.create({
    data: {
      quotationId: params.quotationId,
      action: params.action,
      performedByUserId: params.performedByUserId ?? null,
      metadata: (params.metadata as Prisma.InputJsonValue) ?? {},
      ipAddress: params.ipAddress ?? null,
    },
  });
}
