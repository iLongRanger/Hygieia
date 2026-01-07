import { z } from 'zod';

const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format')
  .optional()
  .default('#6B7280');

export const createLeadSourceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(1000).optional().nullable(),
  color: hexColorSchema,
  isActive: z.boolean().optional().default(true),
});

export const updateLeadSourceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional().nullable(),
  color: hexColorSchema.optional(),
  isActive: z.boolean().optional(),
});

export const listLeadSourcesQuerySchema = z.object({
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export type CreateLeadSourceInput = z.infer<typeof createLeadSourceSchema>;
export type UpdateLeadSourceInput = z.infer<typeof updateLeadSourceSchema>;
export type ListLeadSourcesQuery = z.infer<typeof listLeadSourcesQuerySchema>;
