import { z } from 'zod';

export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(255),
  termsAndConditions: z.string().min(1, 'Terms and conditions content is required').max(50000),
  isDefault: z.boolean().optional().default(false),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  termsAndConditions: z.string().min(1).max(50000).optional(),
  isDefault: z.boolean().optional(),
});

export const listTemplatesQuerySchema = z.object({
  includeArchived: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
