import { z } from 'zod';

const unitTypeSchema = z.enum(['per_window', 'per_sqft', 'fixed']);
const serviceTypeSchema = z.enum(['window_cleaning', 'carpet_cleaning', 'custom']);

const addOnSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(100),
  price: z.coerce.number().nonnegative(),
  defaultQuantity: z.coerce.number().positive().optional().default(1),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().nonnegative().optional().default(0),
});

export const listOneTimeServiceCatalogQuerySchema = z.object({
  includeInactive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  serviceType: serviceTypeSchema.optional(),
});

export const createOneTimeServiceCatalogItemSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(100),
  description: z.string().max(5000).optional().nullable(),
  serviceType: serviceTypeSchema,
  unitType: unitTypeSchema,
  baseRate: z.coerce.number().nonnegative(),
  defaultQuantity: z.coerce.number().positive().optional().default(1),
  minimumCharge: z.coerce.number().nonnegative().optional().nullable(),
  maxDiscountPercent: z.coerce.number().min(0).max(100).optional().default(10),
  requiresSchedule: z.boolean().optional().default(true),
  isActive: z.boolean().optional().default(true),
  addOns: z.array(addOnSchema).optional().default([]),
});

export const updateOneTimeServiceCatalogItemSchema = createOneTimeServiceCatalogItemSchema.partial();

export type CreateOneTimeServiceCatalogItemInput = z.infer<typeof createOneTimeServiceCatalogItemSchema>;
export type UpdateOneTimeServiceCatalogItemInput = z.infer<typeof updateOneTimeServiceCatalogItemSchema>;
export type ListOneTimeServiceCatalogQuery = z.infer<typeof listOneTimeServiceCatalogQuerySchema>;
