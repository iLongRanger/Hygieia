import { z } from 'zod';

const areaTemplateItemSchema = z.object({
  fixtureTypeId: z.string().uuid('Invalid item type ID'),
  defaultCount: z.coerce.number().int().min(0),
  minutesPerItem: z.coerce.number().min(0),
  sortOrder: z.coerce.number().int().min(0).optional().default(0),
});

const areaTemplateTaskSchema = z.object({
  name: z.string().min(1).max(255),
  baseMinutes: z.coerce.number().min(0).optional().default(0),
  perSqftMinutes: z.coerce.number().min(0).optional().default(0),
  perUnitMinutes: z.coerce.number().min(0).optional().default(0),
  perRoomMinutes: z.coerce.number().min(0).optional().default(0),
  sortOrder: z.coerce.number().int().min(0).optional().default(0),
});

export const createAreaTemplateSchema = z.object({
  areaTypeId: z.string().uuid('Invalid area type ID'),
  name: z.string().max(255).optional().nullable(),
  defaultSquareFeet: z.coerce.number().min(0).optional().nullable(),
  items: z.array(areaTemplateItemSchema).optional().default([]),
  tasks: z.array(areaTemplateTaskSchema).optional().default([]),
});

export const updateAreaTemplateSchema = z.object({
  areaTypeId: z.string().uuid().optional(),
  name: z.string().max(255).optional().nullable(),
  defaultSquareFeet: z.coerce.number().min(0).optional().nullable(),
  items: z.array(areaTemplateItemSchema).optional(),
  tasks: z.array(areaTemplateTaskSchema).optional(),
});

export const listAreaTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  areaTypeId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
});

export type CreateAreaTemplateInput = z.infer<typeof createAreaTemplateSchema>;
export type UpdateAreaTemplateInput = z.infer<typeof updateAreaTemplateSchema>;
export type ListAreaTemplatesQuery = z.infer<typeof listAreaTemplatesQuerySchema>;
