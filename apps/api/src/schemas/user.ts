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
const percentagePayRateSchema = z.coerce
  .number()
  .min(0, 'Percentage pay rate must be positive')
  .max(100, 'Percentage pay rate cannot exceed 100')
  .nullable()
  .optional();
const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format')
  .nullable()
  .optional();
const employmentTypeSchema = z
  .enum(['full_time', 'part_time', 'casual', 'contractor', 'temporary'])
  .nullable()
  .optional();
const emergencyContactSchema = z
  .object({
    name: z.string().max(120).optional().nullable(),
    relationship: z.string().max(80).optional().nullable(),
    phone: z.string().max(30).optional().nullable(),
    email: z.string().email().max(255).optional().nullable(),
  })
  .nullable()
  .optional();
const availabilitySchema = z.record(z.unknown()).nullable().optional();
const complianceSchema = z.record(z.unknown()).nullable().optional();
const onboardingSchema = z.record(z.unknown()).nullable().optional();
const skillsSchema = z.array(z.string().min(1).max(80)).max(100).nullable().optional();
const hrNotesSchema = z
  .array(
    z.object({
      id: z.string().max(80).optional(),
      note: z.string().min(1).max(2000),
      createdAt: z.string().optional(),
      createdBy: z.string().max(120).optional().nullable(),
    })
  )
  .max(200)
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
  percentagePayRate: percentagePayRateSchema,
  employeeNumber: z.string().max(50).optional().nullable(),
  jobTitle: z.string().max(120).optional().nullable(),
  department: z.string().max(120).optional().nullable(),
  employmentType: employmentTypeSchema,
  supervisorUserId: z.string().uuid().optional().nullable(),
  startDate: dateOnlySchema,
  terminationDate: dateOnlySchema,
  birthDate: dateOnlySchema,
  emergencyContact: emergencyContactSchema,
  availability: availabilitySchema,
  skills: skillsSchema,
  compliance: complianceSchema,
  onboarding: onboardingSchema,
  hrNotes: hrNotesSchema,
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
  percentagePayRate: percentagePayRateSchema,
  employeeNumber: z.string().max(50).optional().nullable(),
  jobTitle: z.string().max(120).optional().nullable(),
  department: z.string().max(120).optional().nullable(),
  employmentType: employmentTypeSchema,
  supervisorUserId: z.string().uuid().optional().nullable(),
  startDate: dateOnlySchema,
  terminationDate: dateOnlySchema,
  birthDate: dateOnlySchema,
  emergencyContact: emergencyContactSchema,
  availability: availabilitySchema,
  skills: skillsSchema,
  compliance: complianceSchema,
  onboarding: onboardingSchema,
  hrNotes: hrNotesSchema,
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
