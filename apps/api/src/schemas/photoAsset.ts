import { z } from 'zod';

export const photoTargetTypeSchema = z.enum(['facility', 'appointment', 'inspection', 'job']);

export const photoCategorySchema = z.enum([
  'general',
  'parking',
  'access',
  'walkthrough',
  'inspection',
  'before',
  'after',
  'issue',
]);

export const listPhotoAssetsQuerySchema = z.object({
  targetType: photoTargetTypeSchema,
  targetId: z.string().uuid(),
  includeArchived: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export const createPhotoUploadSchema = z.object({
  targetType: photoTargetTypeSchema,
  targetId: z.string().uuid(),
  category: photoCategorySchema.default('general'),
  caption: z.string().max(2000).optional().nullable(),
  fileName: z.string().min(1).max(255),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  sizeBytes: z.number().int().positive().max(8 * 1024 * 1024),
});

export const completePhotoUploadSchema = z.object({
  sizeBytes: z.number().int().positive().max(8 * 1024 * 1024).optional(),
});

export const updatePhotoAssetSchema = z.object({
  category: photoCategorySchema.optional(),
  caption: z.string().max(2000).optional().nullable(),
});

export type PhotoTargetType = z.infer<typeof photoTargetTypeSchema>;
export type PhotoCategory = z.infer<typeof photoCategorySchema>;
export type CreatePhotoUploadInput = z.infer<typeof createPhotoUploadSchema>;
export type UpdatePhotoAssetInput = z.infer<typeof updatePhotoAssetSchema>;
