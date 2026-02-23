import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';
import { createNotification } from './notificationService';

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
  autoCreateCorrectiveActions?: boolean;
  defaultActionDueDate?: Date;
}

export interface InspectionItemScoreInput {
  id: string;
  score: string; // pass | fail | na
  rating?: number | null; // 1-5
  notes?: string | null;
  photoUrl?: string | null;
}

export interface InspectionCorrectiveActionCreateInput {
  inspectionItemId?: string | null;
  title: string;
  description?: string | null;
  severity?: 'critical' | 'major' | 'minor';
  dueDate?: Date | null;
  assigneeUserId?: string | null;
}

export interface InspectionCorrectiveActionUpdateInput {
  status?: 'open' | 'in_progress' | 'resolved' | 'verified' | 'canceled';
  title?: string;
  description?: string | null;
  severity?: 'critical' | 'major' | 'minor';
  dueDate?: Date | null;
  assigneeUserId?: string | null;
  resolutionNotes?: string | null;
}

export interface InspectionSignoffInput {
  signerType: 'supervisor' | 'client';
  signerName: string;
  signerTitle?: string | null;
  comments?: string | null;
}

export interface CreateReinspectionInput {
  scheduledDate?: Date;
  inspectorUserId?: string;
  notes?: string | null;
  actionIds?: string[];
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
  correctiveActions: {
    select: {
      status: true,
      dueDate: true,
    },
  },
  signoffs: {
    select: { id: true },
  },
  _count: { select: { items: true, correctiveActions: true, signoffs: true } },
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
  correctiveActions: {
    select: {
      id: true,
      inspectionItemId: true,
      title: true,
      description: true,
      severity: true,
      status: true,
      dueDate: true,
      assigneeUserId: true,
      createdByUserId: true,
      resolvedByUserId: true,
      resolvedAt: true,
      resolutionNotes: true,
      verifiedByUserId: true,
      verifiedAt: true,
      followUpInspectionId: true,
      createdAt: true,
      updatedAt: true,
      inspectionItem: {
        select: {
          id: true,
          category: true,
          itemText: true,
        },
      },
      assigneeUser: { select: { id: true, fullName: true } },
      createdByUser: { select: { id: true, fullName: true } },
      resolvedByUser: { select: { id: true, fullName: true } },
      verifiedByUser: { select: { id: true, fullName: true } },
    },
    orderBy: [{ status: 'asc' as const }, { dueDate: 'asc' as const }, { createdAt: 'desc' as const }],
  },
  signoffs: {
    select: {
      id: true,
      signerType: true,
      signerName: true,
      signerTitle: true,
      comments: true,
      signedByUserId: true,
      signedAt: true,
      createdAt: true,
      signedByUser: { select: { id: true, fullName: true } },
    },
    orderBy: { signedAt: 'desc' as const },
  },
};

const correctiveActionSelect = {
  id: true,
  inspectionId: true,
  inspectionItemId: true,
  title: true,
  description: true,
  severity: true,
  status: true,
  dueDate: true,
  assigneeUserId: true,
  createdByUserId: true,
  resolvedByUserId: true,
  resolvedAt: true,
  resolutionNotes: true,
  verifiedByUserId: true,
  verifiedAt: true,
  followUpInspectionId: true,
  createdAt: true,
  updatedAt: true,
  inspectionItem: { select: { id: true, category: true, itemText: true } },
  assigneeUser: { select: { id: true, fullName: true } },
  createdByUser: { select: { id: true, fullName: true } },
  resolvedByUser: { select: { id: true, fullName: true } },
  verifiedByUser: { select: { id: true, fullName: true } },
};

const inspectionSignoffSelect = {
  id: true,
  inspectionId: true,
  signerType: true,
  signerName: true,
  signerTitle: true,
  comments: true,
  signedByUserId: true,
  signedAt: true,
  createdAt: true,
  signedByUser: { select: { id: true, fullName: true } },
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

function getDefaultCorrectiveActionDueDate(baseDate: Date): Date {
  const dueDate = new Date(baseDate);
  dueDate.setDate(dueDate.getDate() + 7);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate;
}

function deriveCorrectiveActionSeverity(score: InspectionItemScoreInput): 'critical' | 'major' | 'minor' {
  if (score.rating !== undefined && score.rating !== null) {
    if (score.rating <= 2) return 'critical';
    if (score.rating <= 3) return 'major';
    return 'minor';
  }
  return 'major';
}

function isActionOpen(status: string): boolean {
  return status === 'open' || status === 'in_progress';
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

  const [rawData, total] = await Promise.all([
    prisma.inspection.findMany({
      where,
      select: inspectionListSelect,
      orderBy: { scheduledDate: 'desc' },
      skip,
      take: limit,
    }),
    prisma.inspection.count({ where }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const data = rawData.map((inspection) => {
    const openCorrectiveActions = inspection.correctiveActions.filter((action) => isActionOpen(action.status));
    const overdueCorrectiveActions = openCorrectiveActions.filter((action) => {
      if (!action.dueDate) return false;
      const dueDate = new Date(action.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    }).length;

    return {
      ...inspection,
      openCorrectiveActions: openCorrectiveActions.length,
      overdueCorrectiveActions,
      signoffCount: inspection.signoffs.length,
    };
  });

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

  // Notify the assigned inspector
  if (input.inspectorUserId !== input.createdByUserId) {
    createNotification({
      userId: input.inspectorUserId,
      type: 'inspection_assigned',
      title: `Inspection ${inspectionNumber} assigned to you`,
      body: `Scheduled for ${input.scheduledDate.toLocaleDateString()}`,
      metadata: { inspectionId: inspection.id, facilityId: input.facilityId },
    }).catch(() => {});
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
    include: {
      items: {
        select: {
          id: true,
          templateItemId: true,
          category: true,
          itemText: true,
          sortOrder: true,
        },
      },
    },
  });
  if (!existing) throw new NotFoundError('Inspection not found');
  if (existing.status !== 'in_progress' && existing.status !== 'scheduled') {
    throw new BadRequestError('Inspection can only be completed from scheduled or in_progress status');
  }

  // Require a summary
  if (!input.summary?.trim()) {
    throw new BadRequestError('A summary is required to complete the inspection');
  }

  // Require notes on every item
  const itemsById = new Map(input.items.map((i) => [i.id, i]));
  const categoriesMissingNotes = new Set<string>();
  for (const existingItem of existing.items) {
    const scored = itemsById.get(existingItem.id);
    if (!scored?.notes?.trim()) {
      categoriesMissingNotes.add(existingItem.category);
    }
  }
  if (categoriesMissingNotes.size > 0) {
    throw new BadRequestError(
      `Notes are required for all areas. Missing: ${[...categoriesMissingNotes].join(', ')}`
    );
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

  const inspectionItemsById = new Map(existing.items.map((item) => [item.id, item]));

  // Update items with scores
  const itemsForScoring: Array<{ score: string | null; rating: number | null; weight?: number }> = [];
  const failedItems: Array<{
    itemId: string;
    itemText: string;
    category: string;
    notes: string | null;
    severity: 'critical' | 'major' | 'minor';
  }> = [];

  for (const itemScore of input.items) {
    const existingItem = inspectionItemsById.get(itemScore.id);
    if (!existingItem) {
      throw new BadRequestError(`Inspection item ${itemScore.id} does not belong to inspection ${id}`);
    }

    await prisma.inspectionItem.update({
      where: { id: itemScore.id },
      data: {
        score: itemScore.score,
        rating: itemScore.rating,
        notes: itemScore.notes,
        photoUrl: itemScore.photoUrl,
      },
    });

    const weight = existingItem.templateItemId ? templateWeights.get(existingItem.templateItemId) : 1;
    itemsForScoring.push({
      score: itemScore.score,
      rating: itemScore.rating ?? null,
      weight: weight ?? 1,
    });

    if (itemScore.score === 'fail') {
      failedItems.push({
        itemId: existingItem.id,
        itemText: existingItem.itemText,
        category: existingItem.category,
        notes: itemScore.notes ?? null,
        severity: deriveCorrectiveActionSeverity(itemScore),
      });
    }
  }

  const { score, rating } = calculateOverallScore(itemsForScoring);

  const shouldAutoCreateActions = input.autoCreateCorrectiveActions !== false;
  const defaultDueDate = input.defaultActionDueDate ?? getDefaultCorrectiveActionDueDate(new Date());

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
          metadata: {
            overallScore: score,
            overallRating: rating,
            failedItems: failedItems.length,
            correctiveActionsAutoCreated: shouldAutoCreateActions ? failedItems.length : 0,
          },
        },
      },
    },
    select: inspectionDetailSelect,
  });

  if (shouldAutoCreateActions && failedItems.length > 0) {
    await prisma.inspectionCorrectiveAction.createMany({
      data: failedItems.map((failedItem) => ({
        inspectionId: id,
        inspectionItemId: failedItem.itemId,
        title: `Correct: ${failedItem.itemText}`,
        description: failedItem.notes ?? `Failed checklist item in ${failedItem.category}`,
        severity: failedItem.severity,
        dueDate: defaultDueDate,
        assigneeUserId: existing.inspectorUserId,
        createdByUserId: input.userId,
      })),
    });

    await prisma.inspectionActivity.create({
      data: {
        inspectionId: id,
        action: 'corrective_actions_created',
        performedByUserId: input.userId,
        metadata: {
          count: failedItems.length,
          dueDate: defaultDueDate.toISOString(),
        },
      },
    });
  }

  return getInspectionById(inspection.id);
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

// ==================== Corrective actions ====================

export async function listInspectionCorrectiveActions(inspectionId: string) {
  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    select: { id: true },
  });
  if (!inspection) throw new NotFoundError('Inspection not found');

  return prisma.inspectionCorrectiveAction.findMany({
    where: { inspectionId },
    select: correctiveActionSelect,
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function createInspectionCorrectiveAction(
  inspectionId: string,
  input: InspectionCorrectiveActionCreateInput,
  userId: string
) {
  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    select: { id: true, status: true },
  });
  if (!inspection) throw new NotFoundError('Inspection not found');
  if (inspection.status === 'canceled') throw new BadRequestError('Cannot add actions to a canceled inspection');

  if (input.inspectionItemId) {
    const inspectionItem = await prisma.inspectionItem.findFirst({
      where: { id: input.inspectionItemId, inspectionId },
      select: { id: true },
    });
    if (!inspectionItem) throw new BadRequestError('Inspection item does not belong to this inspection');
  }

  const action = await prisma.inspectionCorrectiveAction.create({
    data: {
      inspectionId,
      inspectionItemId: input.inspectionItemId ?? null,
      title: input.title,
      description: input.description ?? null,
      severity: input.severity ?? 'major',
      dueDate: input.dueDate ?? null,
      assigneeUserId: input.assigneeUserId ?? null,
      createdByUserId: userId,
    },
    select: correctiveActionSelect,
  });

  await prisma.inspectionActivity.create({
    data: {
      inspectionId,
      action: 'corrective_action_created',
      performedByUserId: userId,
      metadata: {
        correctiveActionId: action.id,
        severity: action.severity,
      },
    },
  });

  return action;
}

export async function updateInspectionCorrectiveAction(
  inspectionId: string,
  actionId: string,
  input: InspectionCorrectiveActionUpdateInput,
  userId: string
) {
  const existingAction = await prisma.inspectionCorrectiveAction.findFirst({
    where: { id: actionId, inspectionId },
    select: { id: true, status: true },
  });
  if (!existingAction) throw new NotFoundError('Corrective action not found');

  const data: Record<string, unknown> = {
    ...(input.status !== undefined && { status: input.status }),
    ...(input.title !== undefined && { title: input.title }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.severity !== undefined && { severity: input.severity }),
    ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
    ...(input.assigneeUserId !== undefined && { assigneeUserId: input.assigneeUserId }),
    ...(input.resolutionNotes !== undefined && { resolutionNotes: input.resolutionNotes }),
  };

  if (input.status === 'resolved' && existingAction.status !== 'resolved') {
    data.resolvedAt = new Date();
    data.resolvedByUserId = userId;
  }

  if (input.status && input.status !== 'resolved') {
    data.resolvedAt = null;
    data.resolvedByUserId = null;
    if (input.status !== 'verified') {
      data.verifiedAt = null;
      data.verifiedByUserId = null;
    }
  }

  if (input.status === 'verified') {
    data.verifiedAt = new Date();
    data.verifiedByUserId = userId;
  }

  const action = await prisma.inspectionCorrectiveAction.update({
    where: { id: actionId },
    data,
    select: correctiveActionSelect,
  });

  await prisma.inspectionActivity.create({
    data: {
      inspectionId,
      action: 'corrective_action_updated',
      performedByUserId: userId,
      metadata: {
        correctiveActionId: action.id,
        status: action.status,
      },
    },
  });

  return action;
}

export async function verifyInspectionCorrectiveAction(
  inspectionId: string,
  actionId: string,
  userId: string,
  notes?: string | null
) {
  const existingAction = await prisma.inspectionCorrectiveAction.findFirst({
    where: { id: actionId, inspectionId },
    select: { id: true },
  });
  if (!existingAction) throw new NotFoundError('Corrective action not found');

  const action = await prisma.inspectionCorrectiveAction.update({
    where: { id: actionId },
    data: {
      status: 'verified',
      verifiedAt: new Date(),
      verifiedByUserId: userId,
      ...(notes !== undefined && { resolutionNotes: notes }),
    },
    select: correctiveActionSelect,
  });

  await prisma.inspectionActivity.create({
    data: {
      inspectionId,
      action: 'corrective_action_verified',
      performedByUserId: userId,
      metadata: {
        correctiveActionId: action.id,
      },
    },
  });

  return action;
}

// ==================== Signoff ====================

export async function listInspectionSignoffs(inspectionId: string) {
  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    select: { id: true },
  });
  if (!inspection) throw new NotFoundError('Inspection not found');

  return prisma.inspectionSignoff.findMany({
    where: { inspectionId },
    select: inspectionSignoffSelect,
    orderBy: { signedAt: 'desc' },
  });
}

export async function createInspectionSignoff(
  inspectionId: string,
  input: InspectionSignoffInput,
  userId: string
) {
  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    select: { id: true, status: true },
  });
  if (!inspection) throw new NotFoundError('Inspection not found');
  if (inspection.status !== 'completed') {
    throw new BadRequestError('Inspection must be completed before signoff');
  }

  const signoff = await prisma.inspectionSignoff.create({
    data: {
      inspectionId,
      signerType: input.signerType,
      signerName: input.signerName,
      signerTitle: input.signerTitle ?? null,
      comments: input.comments ?? null,
      signedByUserId: userId,
    },
    select: inspectionSignoffSelect,
  });

  await prisma.inspectionActivity.create({
    data: {
      inspectionId,
      action: 'signoff_added',
      performedByUserId: userId,
      metadata: {
        signerType: signoff.signerType,
        signerName: signoff.signerName,
      },
    },
  });

  return signoff;
}

// ==================== Reinspection ====================

export async function createReinspection(
  inspectionId: string,
  input: CreateReinspectionInput,
  userId: string
) {
  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    select: {
      id: true,
      inspectionNumber: true,
      status: true,
      templateId: true,
      jobId: true,
      contractId: true,
      facilityId: true,
      accountId: true,
      inspectorUserId: true,
      items: {
        select: {
          id: true,
          templateItemId: true,
          category: true,
          itemText: true,
          score: true,
          sortOrder: true,
        },
      },
      correctiveActions: {
        select: {
          id: true,
          inspectionItemId: true,
          status: true,
        },
      },
    },
  });
  if (!inspection) throw new NotFoundError('Inspection not found');
  if (inspection.status !== 'completed') {
    throw new BadRequestError('Only completed inspections can create reinspections');
  }

  let itemsForReinspection = inspection.items.filter((item) => item.score === 'fail');

  const selectedActionIds = input.actionIds?.length ? new Set(input.actionIds) : null;
  if (selectedActionIds) {
    const selectedItemIds = new Set(
      inspection.correctiveActions
        .filter((action) => selectedActionIds.has(action.id) && action.inspectionItemId && isActionOpen(action.status))
        .map((action) => action.inspectionItemId as string)
    );
    itemsForReinspection = inspection.items.filter((item) => selectedItemIds.has(item.id));
  }

  if (itemsForReinspection.length === 0) {
    throw new BadRequestError('No failed items available for reinspection');
  }

  const scheduledDate = input.scheduledDate ?? getDefaultCorrectiveActionDueDate(new Date());
  const inspectionNumber = await generateInspectionNumber();
  const assigneeUserId = input.inspectorUserId ?? inspection.inspectorUserId;

  const reinspection = await prisma.inspection.create({
    data: {
      inspectionNumber,
      templateId: inspection.templateId,
      jobId: inspection.jobId,
      contractId: inspection.contractId,
      facilityId: inspection.facilityId,
      accountId: inspection.accountId,
      inspectorUserId: assigneeUserId,
      scheduledDate,
      notes: input.notes ?? `Follow-up reinspection for ${inspection.inspectionNumber}`,
      items: {
        create: itemsForReinspection.map((item, index) => ({
          templateItemId: item.templateItemId,
          category: item.category,
          itemText: item.itemText,
          sortOrder: item.sortOrder ?? index,
        })),
      },
      activities: {
        create: {
          action: 'created',
          performedByUserId: userId,
          metadata: {
            reinspectionOfInspectionId: inspection.id,
            failedItems: itemsForReinspection.length,
          },
        },
      },
    },
    select: inspectionDetailSelect,
  });

  const reinspectionItemIds = new Set(itemsForReinspection.map((item) => item.id));
  await prisma.inspectionCorrectiveAction.updateMany({
    where: {
      inspectionId,
      inspectionItemId: {
        in: Array.from(reinspectionItemIds),
      },
      status: {
        in: ['open', 'in_progress'],
      },
    },
    data: {
      followUpInspectionId: reinspection.id,
    },
  });

  await prisma.inspectionActivity.create({
    data: {
      inspectionId,
      action: 'reinspection_scheduled',
      performedByUserId: userId,
      metadata: {
        followUpInspectionId: reinspection.id,
        followUpInspectionNumber: reinspection.inspectionNumber,
        failedItems: itemsForReinspection.length,
      },
    },
  });

  // Auto-create linked appointment
  try {
    const { createAppointment } = await import('./appointmentService');
    const scheduledStart = new Date(scheduledDate);
    scheduledStart.setHours(9, 0, 0, 0);
    const scheduledEnd = new Date(scheduledStart);
    scheduledEnd.setHours(10, 0, 0, 0);

    await createAppointment({
      accountId: inspection.accountId,
      assignedToUserId: assigneeUserId,
      type: 'inspection',
      status: 'scheduled',
      scheduledStart,
      scheduledEnd,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
      notes: `Auto-created for reinspection ${inspectionNumber}`,
      createdByUserId: userId,
      inspectionId: reinspection.id,
      skipAutoCreate: true,
    });
  } catch (e) {
    console.error('Failed to auto-create appointment for reinspection:', e);
  }

  if (assigneeUserId !== userId) {
    createNotification({
      userId: assigneeUserId,
      type: 'inspection_assigned',
      title: `Reinspection ${inspectionNumber} assigned to you`,
      body: `Scheduled for ${scheduledDate.toLocaleDateString()}`,
      metadata: { inspectionId: reinspection.id, facilityId: inspection.facilityId },
    }).catch(() => {});
  }

  return getInspectionById(reinspection.id);
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
  if (existing.inspection.status === 'completed') {
    throw new BadRequestError('Cannot modify a completed inspection');
  }

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
