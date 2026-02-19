import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';

// ==================== Interfaces ====================

export interface InspectionListParams {
  facilityId?: string;
  accountId?: string;
  contractId?: string;
  jobId?: string;
  inspectorUserId?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minScore?: number;
  maxScore?: number;
  page?: number;
  limit?: number;
}

export interface InspectionCreateInput {
  templateId?: string | null;
  jobId?: string | null;
  contractId?: string | null;
  facilityId: string;
  accountId: string;
  inspectorUserId: string;
  scheduledDate: Date;
  notes?: string | null;
  createdByUserId: string;
  skipAutoCreate?: boolean;
}

export interface InspectionUpdateInput {
  inspectorUserId?: string;
  scheduledDate?: Date;
  notes?: string | null;
  summary?: string | null;
}

export interface InspectionItemInput {
  templateItemId?: string | null;
  category: string;
  itemText: string;
  score?: string | null;
  rating?: number | null;
  notes?: string | null;
  photoUrl?: string | null;
  sortOrder?: number;
}

export interface InspectionCompleteInput {
  summary?: string | null;
  items: InspectionItemScoreInput[];
  userId: string;
}

export interface InspectionItemScoreInput {
  id: string;
  score: string; // pass | fail | na
  rating?: number | null; // 1-5
  notes?: string | null;
  photoUrl?: string | null;
}

// ==================== Select objects ====================

const inspectionListSelect = {
  id: true,
  inspectionNumber: true,
  status: true,
  scheduledDate: true,
  completedAt: true,
  overallScore: true,
  overallRating: true,
  facility: { select: { id: true, name: true } },
  account: { select: { id: true, name: true } },
  inspectorUser: { select: { id: true, fullName: true } },
  template: { select: { id: true, name: true } },
  job: { select: { id: true, jobNumber: true } },
  _count: { select: { items: true } },
  createdAt: true,
};

const inspectionDetailSelect = {
  id: true,
  inspectionNumber: true,
  templateId: true,
  jobId: true,
  contractId: true,
  facilityId: true,
  accountId: true,
  inspectorUserId: true,
  status: true,
  scheduledDate: true,
  completedAt: true,
  overallScore: true,
  overallRating: true,
  notes: true,
  summary: true,
  createdAt: true,
  updatedAt: true,
  template: { select: { id: true, name: true } },
  job: { select: { id: true, jobNumber: true } },
  contract: { select: { id: true, contractNumber: true } },
  facility: { select: { id: true, name: true } },
  account: { select: { id: true, name: true } },
  inspectorUser: { select: { id: true, fullName: true } },
  items: {
    select: {
      id: true,
      templateItemId: true,
      category: true,
      itemText: true,
      score: true,
      rating: true,
      notes: true,
      photoUrl: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: 'asc' as const },
  },
  appointment: {
    select: {
      id: true,
      type: true,
      status: true,
      scheduledStart: true,
      scheduledEnd: true,
    },
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

async function generateInspectionNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INS-${year}-`;

  const latest = await prisma.inspection.findFirst({
    where: { inspectionNumber: { startsWith: prefix } },
    orderBy: { inspectionNumber: 'desc' },
    select: { inspectionNumber: true },
  });

  let nextNum = 1;
  if (latest) {
    const numPart = latest.inspectionNumber.replace(prefix, '');
    nextNum = parseInt(numPart, 10) + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

// ==================== Scoring ====================

function calculateOverallScore(items: Array<{ score: string | null; rating: number | null; weight?: number }>): {
  score: number;
  rating: string;
} {
  const scoredItems = items.filter((i) => i.score && i.score !== 'na');
  if (scoredItems.length === 0) return { score: 100, rating: 'excellent' };

  let totalWeight = 0;
  let weightedScore = 0;

  for (const item of scoredItems) {
    const weight = item.weight ?? 1;
    totalWeight += weight;

    if (item.rating) {
      // Rating-based: 1-5 scale mapped to 0-100
      weightedScore += (item.rating / 5) * 100 * weight;
    } else {
      // Pass/fail: pass = 100, fail = 0
      weightedScore += (item.score === 'pass' ? 100 : 0) * weight;
    }
  }

  const score = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) / 100 : 100;

  let rating: string;
  if (score >= 90) rating = 'excellent';
  else if (score >= 75) rating = 'good';
  else if (score >= 60) rating = 'fair';
  else if (score >= 40) rating = 'poor';
  else rating = 'failing';

  return { score, rating };
}

// ==================== Service ====================

export async function listInspections(params: InspectionListParams) {
  const { page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (params.facilityId) where.facilityId = params.facilityId;
  if (params.accountId) where.accountId = params.accountId;
  if (params.contractId) where.contractId = params.contractId;
  if (params.jobId) where.jobId = params.jobId;
  if (params.inspectorUserId) where.inspectorUserId = params.inspectorUserId;
  if (params.status) where.status = params.status;

  if (params.dateFrom || params.dateTo) {
    where.scheduledDate = {};
    if (params.dateFrom) (where.scheduledDate as Record<string, unknown>).gte = params.dateFrom;
    if (params.dateTo) (where.scheduledDate as Record<string, unknown>).lte = params.dateTo;
  }

  if (params.minScore !== undefined || params.maxScore !== undefined) {
    where.overallScore = {};
    if (params.minScore !== undefined) (where.overallScore as Record<string, unknown>).gte = params.minScore;
    if (params.maxScore !== undefined) (where.overallScore as Record<string, unknown>).lte = params.maxScore;
  }

  const [data, total] = await Promise.all([
    prisma.inspection.findMany({
      where,
      select: inspectionListSelect,
      orderBy: { scheduledDate: 'desc' },
      skip,
      take: limit,
    }),
    prisma.inspection.count({ where }),
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

export async function getInspectionById(id: string) {
  const inspection = await prisma.inspection.findUnique({
    where: { id },
    select: inspectionDetailSelect,
  });
  if (!inspection) throw new NotFoundError('Inspection not found');
  return inspection;
}

export async function createInspection(input: InspectionCreateInput) {
  const inspectionNumber = await generateInspectionNumber();

  // If template provided, pre-populate items from template
  let templateItems: Array<{
    templateItemId: string;
    category: string;
    itemText: string;
    sortOrder: number;
    weight: number;
  }> = [];

  if (input.templateId) {
    const template = await prisma.inspectionTemplate.findUnique({
      where: { id: input.templateId },
      select: {
        items: {
          select: { id: true, category: true, itemText: true, sortOrder: true, weight: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (template) {
      templateItems = template.items.map((item) => ({
        templateItemId: item.id,
        category: item.category,
        itemText: item.itemText,
        sortOrder: item.sortOrder,
        weight: item.weight,
      }));
    }
  }

  const inspection = await prisma.inspection.create({
    data: {
      inspectionNumber,
      templateId: input.templateId,
      jobId: input.jobId,
      contractId: input.contractId,
      facilityId: input.facilityId,
      accountId: input.accountId,
      inspectorUserId: input.inspectorUserId,
      scheduledDate: input.scheduledDate,
      notes: input.notes,
      items: {
        create: templateItems.map((item) => ({
          templateItemId: item.templateItemId,
          category: item.category,
          itemText: item.itemText,
          sortOrder: item.sortOrder,
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
    select: inspectionDetailSelect,
  });

  // Auto-create linked appointment
  if (!input.skipAutoCreate) {
    try {
      const { createAppointment } = await import('./appointmentService');
      const scheduledStart = new Date(input.scheduledDate);
      scheduledStart.setHours(9, 0, 0, 0);
      const scheduledEnd = new Date(scheduledStart);
      scheduledEnd.setHours(10, 0, 0, 0);

      await createAppointment({
        accountId: input.accountId,
        assignedToUserId: input.inspectorUserId,
        type: 'inspection',
        status: 'scheduled',
        scheduledStart,
        scheduledEnd,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
        notes: `Auto-created for inspection ${inspectionNumber}`,
        createdByUserId: input.createdByUserId,
        inspectionId: inspection.id,
        skipAutoCreate: true,
      });
    } catch (e) {
      console.error('Failed to auto-create appointment for inspection:', e);
    }
  }

  return inspection;
}

export async function updateInspection(id: string, input: InspectionUpdateInput) {
  const existing = await prisma.inspection.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Inspection not found');
  if (existing.status === 'completed') throw new BadRequestError('Cannot edit a completed inspection');

  const inspection = await prisma.inspection.update({
    where: { id },
    data: {
      ...(input.inspectorUserId !== undefined && { inspectorUserId: input.inspectorUserId }),
      ...(input.scheduledDate !== undefined && { scheduledDate: input.scheduledDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.summary !== undefined && { summary: input.summary }),
    },
    select: inspectionDetailSelect,
  });

  return inspection;
}

export async function startInspection(id: string, userId: string) {
  const existing = await prisma.inspection.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Inspection not found');
  if (existing.status !== 'scheduled') throw new BadRequestError('Inspection can only be started from scheduled status');

  const inspection = await prisma.inspection.update({
    where: { id },
    data: {
      status: 'in_progress',
      activities: {
        create: {
          action: 'started',
          performedByUserId: userId,
          metadata: {},
        },
      },
    },
    select: inspectionDetailSelect,
  });

  return inspection;
}

export async function completeInspection(id: string, input: InspectionCompleteInput) {
  const existing = await prisma.inspection.findUnique({
    where: { id },
    include: { items: { select: { id: true } } },
  });
  if (!existing) throw new NotFoundError('Inspection not found');
  if (existing.status !== 'in_progress' && existing.status !== 'scheduled') {
    throw new BadRequestError('Inspection can only be completed from scheduled or in_progress status');
  }

  // Get template weights if available
  const templateWeights = new Map<string, number>();
  if (existing.templateId) {
    const template = await prisma.inspectionTemplate.findUnique({
      where: { id: existing.templateId },
      select: { items: { select: { id: true, weight: true } } },
    });
    if (template) {
      template.items.forEach((i) => templateWeights.set(i.id, i.weight));
    }
  }

  // Update items with scores
  const itemsForScoring: Array<{ score: string | null; rating: number | null; weight?: number }> = [];
  for (const itemScore of input.items) {
    const existingItem = await prisma.inspectionItem.findUnique({
      where: { id: itemScore.id },
      select: { templateItemId: true },
    });

    await prisma.inspectionItem.update({
      where: { id: itemScore.id },
      data: {
        score: itemScore.score,
        rating: itemScore.rating,
        notes: itemScore.notes,
        photoUrl: itemScore.photoUrl,
      },
    });

    const weight = existingItem?.templateItemId ? templateWeights.get(existingItem.templateItemId) : 1;
    itemsForScoring.push({
      score: itemScore.score,
      rating: itemScore.rating ?? null,
      weight: weight ?? 1,
    });
  }

  const { score, rating } = calculateOverallScore(itemsForScoring);

  const inspection = await prisma.inspection.update({
    where: { id },
    data: {
      status: 'completed',
      completedAt: new Date(),
      overallScore: new Prisma.Decimal(score),
      overallRating: rating,
      summary: input.summary,
      activities: {
        create: {
          action: 'completed',
          performedByUserId: input.userId,
          metadata: { overallScore: score, overallRating: rating },
        },
      },
    },
    select: inspectionDetailSelect,
  });

  return inspection;
}

export async function cancelInspection(id: string, userId: string, reason?: string) {
  const existing = await prisma.inspection.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Inspection not found');
  if (existing.status === 'completed') throw new BadRequestError('Cannot cancel a completed inspection');

  const inspection = await prisma.inspection.update({
    where: { id },
    data: {
      status: 'canceled',
      activities: {
        create: {
          action: 'canceled',
          performedByUserId: userId,
          metadata: reason ? { reason } : {},
        },
      },
    },
    select: inspectionDetailSelect,
  });

  return inspection;
}

// ==================== Item management ====================

export async function addInspectionItem(inspectionId: string, input: InspectionItemInput) {
  const existing = await prisma.inspection.findUnique({ where: { id: inspectionId } });
  if (!existing) throw new NotFoundError('Inspection not found');
  if (existing.status === 'completed') throw new BadRequestError('Cannot modify a completed inspection');

  const lastItem = await prisma.inspectionItem.findFirst({
    where: { inspectionId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  const item = await prisma.inspectionItem.create({
    data: {
      inspectionId,
      templateItemId: input.templateItemId,
      category: input.category,
      itemText: input.itemText,
      score: input.score,
      rating: input.rating,
      notes: input.notes,
      photoUrl: input.photoUrl,
      sortOrder: input.sortOrder ?? (lastItem ? lastItem.sortOrder + 1 : 0),
    },
  });

  return item;
}

export async function updateInspectionItem(
  itemId: string,
  input: Partial<InspectionItemInput>
) {
  const existing = await prisma.inspectionItem.findUnique({
    where: { id: itemId },
    include: { inspection: { select: { status: true } } },
  });
  if (!existing) throw new NotFoundError('Inspection item not found');

  const item = await prisma.inspectionItem.update({
    where: { id: itemId },
    data: {
      ...(input.score !== undefined && { score: input.score }),
      ...(input.rating !== undefined && { rating: input.rating }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.photoUrl !== undefined && { photoUrl: input.photoUrl }),
    },
  });

  return item;
}

export async function deleteInspectionItem(itemId: string) {
  const existing = await prisma.inspectionItem.findUnique({
    where: { id: itemId },
    include: { inspection: { select: { status: true } } },
  });
  if (!existing) throw new NotFoundError('Inspection item not found');
  if (existing.inspection.status === 'completed') throw new BadRequestError('Cannot modify a completed inspection');

  await prisma.inspectionItem.delete({ where: { id: itemId } });
}

// ==================== Activity ====================

export async function listInspectionActivities(inspectionId: string) {
  const activities = await prisma.inspectionActivity.findMany({
    where: { inspectionId },
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
  return activities;
}
