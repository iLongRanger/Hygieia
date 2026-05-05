import { z } from 'zod';
import { passwordSchema } from '../utils/passwordPolicy';

const emailSchema = z.string().email('Invalid email format').max(255);
const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Calendar color must be a hex value');
const payTypeSchema = z.enum(['hourly', 'percentage']).nullable().optional();
const hourlyPayRateSchema = z.coerce
  .number()
  .min(0, 'Hourly pay rate must be positive')
  .max(1000, 'Hourly pay rate is too high')
  .nullable()
  .optional();
const addressSchema = z
  .object({
    street: z.string().max(200).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    state: z.string().max(100).optional().nullable(),
    postalCode: z.string().max(30).optional().nullable(),
    country: z.string().max(100).optional().nullable(),
  })
  .nullable()
  .optional();
const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone format')
  .optional()
  .nullable();

export const userRoleSchema = z.enum(['owner', 'admin', 'manager', 'cleaner', 'subcontractor']);

export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().min(1, 'Full name is required').max(255),
  phone: phoneSchema,
  address: addressSchema,
  avatarUrl: z.string().url().optional().nullable(),
  status: z
    .enum(['active', 'disabled', 'pending'])
    .optional()
    .default('active'),
  role: userRoleSchema.optional().default('cleaner'),
  payType: payTypeSchema,
  hourlyPayRate: hourlyPayRateSchema,
});

export const updateUserSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  phone: phoneSchema,
  address: addressSchema,
  avatarUrl: z.string().url().optional().nullable(),
  status: z.enum(['active', 'disabled', 'pending']).optional(),
  preferences: z.record(z.unknown()).optional(),
  calendarColor: hexColorSchema.nullable().optional(),
  payType: payTypeSchema,
  hourlyPayRate: hourlyPayRateSchema,
});

export const updateCurrentUserProfileSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  phone: phoneSchema,
  avatarUrl: z.string().url().optional().nullable(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.enum(['active', 'disabled', 'pending']).optional(),
  role: userRoleSchema.optional(),
  search: z.string().max(100).optional(),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'email', 'fullName', 'status'])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const assignRoleSchema = z.object({
  role: userRoleSchema,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
