import { z } from 'zod';

export const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

export const facilityStatusSchema = z.enum(['active', 'inactive', 'pending']);

export const buildingTypeSchema = z.enum([
  'office',
  'medical',
  'retail',
  'industrial',
  'warehouse',
  'educational',
  'residential',
  'mixed',
  'other',
]);

export const createFacilitySchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  name: z.string().min(1, 'Name is required').max(255),
  address: addressSchema,
  squareFeet: z.coerce.number().min(0).optional().nullable(),
  buildingType: buildingTypeSchema.optional().nullable(),
  accessInstructions: z.string().max(10000).optional().nullable(),
  parkingInfo: z.string().max(5000).optional().nullable(),
  specialRequirements: z.string().max(10000).optional().nullable(),
  facilityManagerId: z.string().uuid().optional().nullable(),
  status: facilityStatusSchema.optional().default('active'),
  notes: z.string().max(10000).optional().nullable(),
});

export const updateFacilitySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  address: addressSchema.optional(),
  squareFeet: z.coerce.number().min(0).optional().nullable(),
  buildingType: buildingTypeSchema.optional().nullable(),
  accessInstructions: z.string().max(10000).optional().nullable(),
  parkingInfo: z.string().max(5000).optional().nullable(),
  specialRequirements: z.string().max(10000).optional().nullable(),
  facilityManagerId: z.string().uuid().optional().nullable(),
  status: facilityStatusSchema.optional(),
  notes: z.string().max(10000).optional().nullable(),
});

export const listFacilitiesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(20),
  accountId: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.string().uuid().optional()
  ),
  status: z.preprocess(
    (val) => (val === '' ? undefined : val),
    facilityStatusSchema.optional()
  ),
  buildingType: z.preprocess(
    (val) => (val === '' ? undefined : val),
    buildingTypeSchema.optional()
  ),
  facilityManagerId: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.string().uuid().optional()
  ),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'squareFeet']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  includeArchived: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export type CreateFacilityInput = z.infer<typeof createFacilitySchema>;
export type UpdateFacilityInput = z.infer<typeof updateFacilitySchema>;
export type ListFacilitiesQuery = z.infer<typeof listFacilitiesQuerySchema>;
