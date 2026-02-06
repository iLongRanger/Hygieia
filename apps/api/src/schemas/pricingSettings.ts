import { z } from 'zod';

export const pricingTypeSchema = z.enum(['square_foot', 'hourly']).default('square_foot');

// Floor type multipliers schema
export const floorTypeMultipliersSchema = z.object({
  vct: z.number().min(0).max(5).default(1.0),
  carpet: z.number().min(0).max(5).default(1.15),
  tile: z.number().min(0).max(5).default(1.1),
  hardwood: z.number().min(0).max(5).default(1.2),
  concrete: z.number().min(0).max(5).default(0.9),
  other: z.number().min(0).max(5).default(1.0),
}).default({
  vct: 1.0,
  carpet: 1.15,
  tile: 1.1,
  hardwood: 1.2,
  concrete: 0.9,
  other: 1.0,
});

// Frequency multipliers schema (monthly factor for X times per week)
export const frequencyMultipliersSchema = z.object({
  '1x_week': z.number().min(0).max(10).default(1.0),
  '2x_week': z.number().min(0).max(10).default(1.8),
  '3x_week': z.number().min(0).max(10).default(2.5),
  '4x_week': z.number().min(0).max(10).default(3.2),
  '5x_week': z.number().min(0).max(10).default(4.0),
  daily: z.number().min(0).max(10).default(4.33),
  weekly: z.number().min(0).max(10).default(1.0),
  biweekly: z.number().min(0).max(10).default(0.5),
  monthly: z.number().min(0).max(10).default(0.25),
  quarterly: z.number().min(0).max(10).default(0.083),
}).default({
  '1x_week': 1.0,
  '2x_week': 1.8,
  '3x_week': 2.5,
  '4x_week': 3.2,
  '5x_week': 4.0,
  daily: 4.33,
  weekly: 1.0,
  biweekly: 0.5,
  monthly: 0.25,
  quarterly: 0.083,
});

// Condition multipliers schema
export const conditionMultipliersSchema = z.object({
  standard: z.number().min(0).max(5).default(1.0),
  medium: z.number().min(0).max(5).default(1.25),
  hard: z.number().min(0).max(5).default(1.33),
}).default({
  standard: 1.0,
  medium: 1.25,
  hard: 1.33,
});

// Building type multipliers schema
export const buildingTypeMultipliersSchema = z.object({
  office: z.number().min(0).max(5).default(1.0),
  medical: z.number().min(0).max(5).default(1.3),
  industrial: z.number().min(0).max(5).default(1.15),
  retail: z.number().min(0).max(5).default(1.05),
  educational: z.number().min(0).max(5).default(1.1),
  warehouse: z.number().min(0).max(5).default(0.9),
  residential: z.number().min(0).max(5).default(1.0),
  mixed: z.number().min(0).max(5).default(1.05),
  other: z.number().min(0).max(5).default(1.0),
}).default({
  office: 1.0,
  medical: 1.3,
  industrial: 1.15,
  retail: 1.05,
  educational: 1.1,
  warehouse: 0.9,
  residential: 1.0,
  mixed: 1.05,
  other: 1.0,
});

// Traffic multipliers schema
export const trafficMultipliersSchema = z.object({
  low: z.number().min(0).max(5).default(0.9),
  medium: z.number().min(0).max(5).default(1.0),
  high: z.number().min(0).max(5).default(1.15),
}).default({
  low: 0.9,
  medium: 1.0,
  high: 1.15,
});

// Task complexity add-ons schema (percentage add-ons)
export const taskComplexityAddOnsSchema = z.object({
  standard: z.number().min(0).max(2).default(0),
  sanitization: z.number().min(0).max(2).default(0.15),
  biohazard: z.number().min(0).max(2).default(0.5),
  high_security: z.number().min(0).max(2).default(0.2),
}).default({
  standard: 0,
  sanitization: 0.15,
  biohazard: 0.5,
  high_security: 0.2,
});

// Create pricing settings schema
export const createPricingSettingsSchema = z.object({
  name: z.string().min(1, 'Pricing settings name is required').max(100),
  pricingType: pricingTypeSchema.optional(),
  baseRatePerSqFt: z.coerce.number().min(0, 'Base rate must be non-negative').default(0.10),
  minimumMonthlyCharge: z.coerce.number().min(0, 'Minimum charge must be non-negative').default(250),
  hourlyRate: z.coerce.number().min(0).default(35.00),

  // Labor Cost Settings
  laborCostPerHour: z.coerce.number().min(0).default(18.00), // Average hourly wage
  laborBurdenPercentage: z.coerce.number().min(0).max(1).default(0.25), // Payroll taxes, benefits (25%)
  sqftPerLaborHour: z.coerce.number().min(100).default(2500), // Productivity rate

  // Overhead Cost Settings
  insurancePercentage: z.coerce.number().min(0).max(1).default(0.08), // Liability + workers comp
  adminOverheadPercentage: z.coerce.number().min(0).max(1).default(0.12), // Admin costs
  travelCostPerVisit: z.coerce.number().min(0).default(15.00), // Flat travel cost per visit
  equipmentPercentage: z.coerce.number().min(0).max(1).default(0.05), // Equipment depreciation

  // Supply Cost Settings
  supplyCostPercentage: z.coerce.number().min(0).max(1).default(0.04), // Supplies as % of labor+overhead
  supplyCostPerSqFt: z.coerce.number().min(0).optional().nullable(), // Alternative: flat rate per sq ft

  // Profit Settings
  targetProfitMargin: z.coerce.number().min(0).max(1).default(0.25), // Target profit margin

  floorTypeMultipliers: floorTypeMultipliersSchema.optional(),
  frequencyMultipliers: frequencyMultipliersSchema.optional(),
  conditionMultipliers: conditionMultipliersSchema.optional(),
  trafficMultipliers: trafficMultipliersSchema.optional(),
  buildingTypeMultipliers: buildingTypeMultipliersSchema.optional(),
  taskComplexityAddOns: taskComplexityAddOnsSchema.optional(),
  isActive: z.boolean().optional().default(true),
  isDefault: z.boolean().optional().default(false),
});

// Update pricing settings schema
export const updatePricingSettingsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  pricingType: pricingTypeSchema.optional(),
  baseRatePerSqFt: z.coerce.number().min(0).optional(),
  minimumMonthlyCharge: z.coerce.number().min(0).optional(),
  hourlyRate: z.coerce.number().min(0).optional(),

  // Labor Cost Settings
  laborCostPerHour: z.coerce.number().min(0).optional(),
  laborBurdenPercentage: z.coerce.number().min(0).max(1).optional(),
  sqftPerLaborHour: z.coerce.number().min(100).optional(),

  // Overhead Cost Settings
  insurancePercentage: z.coerce.number().min(0).max(1).optional(),
  adminOverheadPercentage: z.coerce.number().min(0).max(1).optional(),
  travelCostPerVisit: z.coerce.number().min(0).optional(),
  equipmentPercentage: z.coerce.number().min(0).max(1).optional(),

  // Supply Cost Settings
  supplyCostPercentage: z.coerce.number().min(0).max(1).optional(),
  supplyCostPerSqFt: z.coerce.number().min(0).optional().nullable(),

  // Profit Settings
  targetProfitMargin: z.coerce.number().min(0).max(1).optional(),

  floorTypeMultipliers: floorTypeMultipliersSchema.optional(),
  frequencyMultipliers: frequencyMultipliersSchema.optional(),
  conditionMultipliers: conditionMultipliersSchema.optional(),
  trafficMultipliers: trafficMultipliersSchema.optional(),
  buildingTypeMultipliers: buildingTypeMultipliersSchema.optional(),
  taskComplexityAddOns: taskComplexityAddOnsSchema.optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

// List pricing settings query schema
export const listPricingSettingsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  pricingType: pricingTypeSchema.optional(),
  isDefault: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  search: z.string().max(100).optional(),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'name'])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  includeArchived: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export type CreatePricingSettingsInput = z.infer<typeof createPricingSettingsSchema>;
export type UpdatePricingSettingsInput = z.infer<typeof updatePricingSettingsSchema>;
export type ListPricingSettingsQuery = z.infer<typeof listPricingSettingsQuerySchema>;

// Type exports for multipliers
export type FloorTypeMultipliers = z.infer<typeof floorTypeMultipliersSchema>;
export type FrequencyMultipliers = z.infer<typeof frequencyMultipliersSchema>;
export type ConditionMultipliers = z.infer<typeof conditionMultipliersSchema>;
export type BuildingTypeMultipliers = z.infer<typeof buildingTypeMultipliersSchema>;
export type TrafficMultipliers = z.infer<typeof trafficMultipliersSchema>;
export type TaskComplexityAddOns = z.infer<typeof taskComplexityAddOnsSchema>;
