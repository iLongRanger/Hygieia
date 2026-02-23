import { z } from 'zod';

// ==================== Template schemas ====================

export const listInspectionTemplatesSchema = z.object({
  query: z.object({
    facilityTypeFilter: z.string().optional(),
    includeArchived: z.enum(['true', 'false']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

const templateItemSchema = z.object({
  category: z.string().min(1).max(100),
  itemText: z.string().min(1).max(500),
  sortOrder: z.number().int().min(0).optional(),
  weight: z.number().int().min(1).max(5).optional(),
});

export const createInspectionTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(2000).optional().nullable(),
    facilityTypeFilter: z.string().max(50).optional().nullable(),
    items: z.array(templateItemSchema).min(1),
  }),
});

export const updateInspectionTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(2000).optional().nullable(),
    facilityTypeFilter: z.string().max(50).optional().nullable(),
    items: z.array(templateItemSchema).min(1).optional(),
  }),
});

// ==================== Inspection schemas ====================

export const listInspectionsSchema = z.object({
  query: z.object({
    facilityId: z.string().uuid().optional(),
    accountId: z.string().uuid().optional(),
    contractId: z.string().uuid().optional(),
    jobId: z.string().uuid().optional(),
    inspectorUserId: z.string().uuid().optional(),
    status: z.enum(['scheduled', 'in_progress', 'completed', 'canceled']).optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    minScore: z.coerce.number().min(0).max(100).optional(),
    maxScore: z.coerce.number().min(0).max(100).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const createInspectionSchema = z.object({
  body: z.object({
    templateId: z.string().uuid().optional().nullable(),
    jobId: z.string().uuid().optional().nullable(),
    contractId: z.string().uuid().optional().nullable(),
    facilityId: z.string().uuid(),
    accountId: z.string().uuid(),
    inspectorUserId: z.string().uuid(),
    scheduledDate: z.string(),
    notes: z.string().max(2000).optional().nullable(),
  }),
});

export const updateInspectionSchema = z.object({
  body: z.object({
    inspectorUserId: z.string().uuid().optional(),
    scheduledDate: z.string().optional(),
    notes: z.string().max(2000).optional().nullable(),
    summary: z.string().max(5000).optional().nullable(),
  }),
});

const itemScoreSchema = z.object({
  id: z.string().uuid(),
  score: z.enum(['pass', 'fail', 'na']),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  photoUrl: z.string().max(2000).optional().nullable(),
});

export const completeInspectionSchema = z.object({
  body: z.object({
    summary: z.string().min(1, 'Summary is required').max(5000),
    items: z.array(itemScoreSchema),
    autoCreateCorrectiveActions: z.boolean().optional(),
    defaultActionDueDate: z.string().optional(),
  }),
});

export const cancelInspectionSchema = z.object({
  body: z.object({
    reason: z.string().max(1000).optional(),
  }),
});

export const addInspectionItemSchema = z.object({
  body: z.object({
    templateItemId: z.string().uuid().optional().nullable(),
    category: z.string().min(1).max(100),
    itemText: z.string().min(1).max(500),
    score: z.enum(['pass', 'fail', 'na']).optional().nullable(),
    rating: z.number().int().min(1).max(5).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
    photoUrl: z.string().max(2000).optional().nullable(),
    sortOrder: z.number().int().min(0).optional(),
  }),
});

export const updateInspectionItemSchema = z.object({
  body: z.object({
    score: z.enum(['pass', 'fail', 'na']).optional().nullable(),
    rating: z.number().int().min(1).max(5).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
    photoUrl: z.string().max(2000).optional().nullable(),
  }),
});

const correctiveActionSeveritySchema = z.enum(['critical', 'major', 'minor']);
const correctiveActionStatusSchema = z.enum(['open', 'in_progress', 'resolved', 'verified', 'canceled']);

export const createInspectionCorrectiveActionSchema = z.object({
  body: z.object({
    inspectionItemId: z.string().uuid().optional().nullable(),
    title: z.string().min(1).max(255),
    description: z.string().max(5000).optional().nullable(),
    severity: correctiveActionSeveritySchema.optional(),
    dueDate: z.string().optional().nullable(),
    assigneeUserId: z.string().uuid().optional().nullable(),
  }),
});

export const updateInspectionCorrectiveActionSchema = z.object({
  body: z.object({
    status: correctiveActionStatusSchema.optional(),
    title: z.string().min(1).max(255).optional(),
    description: z.string().max(5000).optional().nullable(),
    severity: correctiveActionSeveritySchema.optional(),
    dueDate: z.string().optional().nullable(),
    assigneeUserId: z.string().uuid().optional().nullable(),
    resolutionNotes: z.string().max(5000).optional().nullable(),
  }),
});

export const verifyInspectionCorrectiveActionSchema = z.object({
  body: z.object({
    notes: z.string().max(5000).optional().nullable(),
  }),
});

export const createInspectionSignoffSchema = z.object({
  body: z.object({
    signerType: z.enum(['supervisor', 'client']),
    signerName: z.string().min(1).max(255),
    signerTitle: z.string().max(255).optional().nullable(),
    comments: z.string().max(5000).optional().nullable(),
  }),
});

export const createReinspectionSchema = z.object({
  body: z.object({
    scheduledDate: z.string().optional(),
    inspectorUserId: z.string().uuid().optional(),
    notes: z.string().max(2000).optional().nullable(),
    actionIds: z.array(z.string().uuid()).optional(),
  }),
});
