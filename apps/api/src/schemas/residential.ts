import { z } from 'zod';

export const residentialStrategyKeySchema = z.enum([
  'residential_flat_v1',
  'residential_project_v1',
]);

export const residentialServiceTypeSchema = z.enum([
  'recurring_standard',
  'one_time_standard',
  'deep_clean',
  'move_in_out',
  'turnover',
  'post_construction',
]);

export const residentialFrequencySchema = z.enum([
  'weekly',
  'biweekly',
  'every_4_weeks',
  'one_time',
]);

export const residentialHomeTypeSchema = z.enum([
  'apartment',
  'condo',
  'townhouse',
  'single_family',
]);

export const residentialConditionSchema = z.enum([
  'light',
  'standard',
  'heavy',
]);

export const residentialOccupiedStatusSchema = z.enum([
  'occupied',
  'vacant',
  'move_in',
  'move_out',
]);

export const residentialQuoteStatusSchema = z.enum([
  'draft',
  'quoted',
  'sent',
  'viewed',
  'accepted',
  'declined',
  'expired',
  'converted',
]);

const percentageSchema = z.number().min(0).max(1);

const addressSchema = z.object({
  street: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
});

const numericRecordSchema = z.record(z.string(), z.number().min(0));

const addOnDefinitionSchema = z.object({
  pricingType: z.enum(['flat', 'per_unit']).default('flat'),
  unitPrice: z.number().min(0),
  estimatedMinutes: z.number().int().min(0).default(0),
  unitLabel: z.string().max(50).optional(),
  description: z.string().max(255).optional(),
  requiresManualReview: z.boolean().optional().default(false),
});

export const residentialPricingPlanSettingsSchema = z.object({
  strategyKey: residentialStrategyKeySchema.default('residential_flat_v1'),
  homeTypeBasePrices: z.object({
    apartment: z.number().min(0).default(140),
    condo: z.number().min(0).default(160),
    townhouse: z.number().min(0).default(175),
    single_family: z.number().min(0).default(190),
  }).default({
    apartment: 140,
    condo: 160,
    townhouse: 175,
    single_family: 190,
  }),
  sqftBrackets: z.array(
    z.object({
      upTo: z.number().int().positive().nullable(),
      adjustment: z.number(),
    })
  ).default([
    { upTo: 1000, adjustment: 0 },
    { upTo: 1500, adjustment: 30 },
    { upTo: 2000, adjustment: 60 },
    { upTo: 3000, adjustment: 120 },
    { upTo: null, adjustment: 220 },
  ]),
  bedroomAdjustments: numericRecordSchema.default({
    '0': 0,
    '1': 0,
    '2': 20,
    '3': 35,
    '4': 50,
    '5': 70,
    '6': 90,
  }),
  bathroomAdjustments: z.object({
    fullBath: z.number().min(0).default(28),
    halfBath: z.number().min(0).default(16),
  }).default({
    fullBath: 28,
    halfBath: 16,
  }),
  levelAdjustments: numericRecordSchema.default({
    '1': 0,
    '2': 20,
    '3': 40,
    '4': 60,
  }),
  conditionMultipliers: z.object({
    light: z.number().min(0.5).max(3).default(0.92),
    standard: z.number().min(0.5).max(3).default(1),
    heavy: z.number().min(0.5).max(3).default(1.28),
  }).default({
    light: 0.92,
    standard: 1,
    heavy: 1.28,
  }),
  serviceTypeMultipliers: z.object({
    recurring_standard: z.number().min(0.5).max(5).default(1),
    one_time_standard: z.number().min(0.5).max(5).default(1.12),
    deep_clean: z.number().min(0.5).max(5).default(1.38),
    move_in_out: z.number().min(0.5).max(5).default(1.48),
    turnover: z.number().min(0.5).max(5).default(1.16),
    post_construction: z.number().min(0.5).max(5).default(1.75),
  }).default({
    recurring_standard: 1,
    one_time_standard: 1.12,
    deep_clean: 1.38,
    move_in_out: 1.48,
    turnover: 1.16,
    post_construction: 1.75,
  }),
  frequencyDiscounts: z.object({
    weekly: percentageSchema.default(0.12),
    biweekly: percentageSchema.default(0.08),
    every_4_weeks: percentageSchema.default(0.03),
    one_time: percentageSchema.default(0),
  }).default({
    weekly: 0.12,
    biweekly: 0.08,
    every_4_weeks: 0.03,
    one_time: 0,
  }),
  firstCleanSurcharge: z.object({
    enabled: z.boolean().default(true),
    type: z.enum(['flat', 'percent']).default('percent'),
    value: z.number().min(0).default(0.15),
    appliesTo: z.array(residentialServiceTypeSchema).default([
      'recurring_standard',
      'deep_clean',
    ]),
  }).default({
    enabled: true,
    type: 'percent',
    value: 0.15,
    appliesTo: ['recurring_standard', 'deep_clean'],
  }),
  addOnPrices: z.record(z.string(), addOnDefinitionSchema).default({
    inside_fridge: { pricingType: 'flat', unitPrice: 25, estimatedMinutes: 20, description: 'Clean inside fridge' },
    inside_oven: { pricingType: 'flat', unitPrice: 30, estimatedMinutes: 25, description: 'Clean inside oven' },
    inside_cabinets: { pricingType: 'flat', unitPrice: 45, estimatedMinutes: 40, description: 'Clean inside cabinets' },
    interior_windows: { pricingType: 'per_unit', unitPrice: 6, estimatedMinutes: 6, unitLabel: 'window', description: 'Interior windows' },
    blinds: { pricingType: 'per_unit', unitPrice: 8, estimatedMinutes: 8, unitLabel: 'room', description: 'Dust and wipe blinds' },
    baseboards: { pricingType: 'flat', unitPrice: 35, estimatedMinutes: 25, description: 'Detail baseboards' },
    laundry: { pricingType: 'flat', unitPrice: 20, estimatedMinutes: 25, description: 'Laundry service' },
    dishes: { pricingType: 'flat', unitPrice: 18, estimatedMinutes: 15, description: 'Dishwashing' },
    linen_change: { pricingType: 'per_unit', unitPrice: 12, estimatedMinutes: 10, unitLabel: 'bed', description: 'Change linens' },
    pet_hair_heavy: { pricingType: 'flat', unitPrice: 20, estimatedMinutes: 20, description: 'Heavy pet hair cleanup' },
    balcony_patio: { pricingType: 'flat', unitPrice: 25, estimatedMinutes: 20, description: 'Balcony or patio' },
    garage: { pricingType: 'flat', unitPrice: 35, estimatedMinutes: 30, description: 'Garage cleanup' },
  }),
  minimumPrice: z.number().min(0).default(160),
  estimatedHours: z.object({
    baseHoursByHomeType: z.object({
      apartment: z.number().min(0).default(1.6),
      condo: z.number().min(0).default(1.9),
      townhouse: z.number().min(0).default(2.2),
      single_family: z.number().min(0).default(2.5),
    }).default({
      apartment: 1.6,
      condo: 1.9,
      townhouse: 2.2,
      single_family: 2.5,
    }),
    minutesPerBedroom: z.number().min(0).default(12),
    minutesPerFullBath: z.number().min(0).default(18),
    minutesPerHalfBath: z.number().min(0).default(10),
    minutesPer1000SqFt: z.number().min(0).default(42),
    conditionMultipliers: z.object({
      light: z.number().min(0.5).max(3).default(0.9),
      standard: z.number().min(0.5).max(3).default(1),
      heavy: z.number().min(0.5).max(3).default(1.35),
    }).default({
      light: 0.9,
      standard: 1,
      heavy: 1.35,
    }),
    serviceTypeMultipliers: z.object({
      recurring_standard: z.number().min(0.5).max(5).default(1),
      one_time_standard: z.number().min(0.5).max(5).default(1.1),
      deep_clean: z.number().min(0.5).max(5).default(1.45),
      move_in_out: z.number().min(0.5).max(5).default(1.55),
      turnover: z.number().min(0.5).max(5).default(1.12),
      post_construction: z.number().min(0.5).max(5).default(1.8),
    }).default({
      recurring_standard: 1,
      one_time_standard: 1.1,
      deep_clean: 1.45,
      move_in_out: 1.55,
      turnover: 1.12,
      post_construction: 1.8,
    }),
    addOnMinutes: numericRecordSchema.default({
      inside_fridge: 20,
      inside_oven: 25,
      inside_cabinets: 40,
      interior_windows: 6,
      blinds: 8,
      baseboards: 25,
      laundry: 25,
      dishes: 15,
      linen_change: 10,
      pet_hair_heavy: 20,
      balcony_patio: 20,
      garage: 30,
    }),
  }).default({
    baseHoursByHomeType: {
      apartment: 1.6,
      condo: 1.9,
      townhouse: 2.2,
      single_family: 2.5,
    },
    minutesPerBedroom: 12,
    minutesPerFullBath: 18,
    minutesPerHalfBath: 10,
    minutesPer1000SqFt: 42,
    conditionMultipliers: {
      light: 0.9,
      standard: 1,
      heavy: 1.35,
    },
    serviceTypeMultipliers: {
      recurring_standard: 1,
      one_time_standard: 1.1,
      deep_clean: 1.45,
      move_in_out: 1.55,
      turnover: 1.12,
      post_construction: 1.8,
    },
    addOnMinutes: {
      inside_fridge: 20,
      inside_oven: 25,
      inside_cabinets: 40,
      interior_windows: 6,
      blinds: 8,
      baseboards: 25,
      laundry: 25,
      dishes: 15,
      linen_change: 10,
      pet_hair_heavy: 20,
      balcony_patio: 20,
      garage: 30,
    },
  }),
  manualReviewRules: z.object({
    maxAutoSqft: z.number().int().positive().default(3500),
    heavyConditionRequiresReview: z.boolean().default(true),
    postConstructionRequiresReview: z.boolean().default(true),
    maxAddOnsBeforeReview: z.number().int().min(0).default(5),
  }).default({
    maxAutoSqft: 3500,
    heavyConditionRequiresReview: true,
    postConstructionRequiresReview: true,
    maxAddOnsBeforeReview: 5,
  }),
});

export const createResidentialPricingPlanSchema = z.object({
  name: z.string().min(1).max(100),
  strategyKey: residentialStrategyKeySchema.optional(),
  settings: residentialPricingPlanSettingsSchema,
  isActive: z.boolean().optional().default(true),
  isDefault: z.boolean().optional().default(false),
});

export const updateResidentialPricingPlanSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  strategyKey: residentialStrategyKeySchema.optional(),
  settings: residentialPricingPlanSettingsSchema.optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export const listResidentialPricingPlansQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  isActive: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  isDefault: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  includeArchived: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  search: z.string().max(100).optional(),
});

export const residentialQuoteAddOnInputSchema = z.object({
  code: z.string().min(1).max(50),
  quantity: z.coerce.number().int().min(1).default(1),
  label: z.string().max(100).optional(),
});

export const residentialHomeProfileSchema = z.object({
  homeType: residentialHomeTypeSchema,
  squareFeet: z.coerce.number().int().positive(),
  bedrooms: z.coerce.number().int().min(0).default(0),
  fullBathrooms: z.coerce.number().int().min(0).default(1),
  halfBathrooms: z.coerce.number().int().min(0).default(0),
  levels: z.coerce.number().int().min(1).default(1),
  occupiedStatus: residentialOccupiedStatusSchema.default('occupied'),
  condition: residentialConditionSchema.default('standard'),
  hasPets: z.boolean().optional().default(false),
  lastProfessionalCleaning: z.string().max(100).optional().nullable(),
  parkingAccess: z.string().max(255).optional().nullable(),
  entryNotes: z.string().max(1000).optional().nullable(),
  specialInstructions: z.string().max(2000).optional().nullable(),
  isFirstVisit: z.boolean().optional().default(false),
});

export const createResidentialQuoteSchema = z.object({
  accountId: z.string().uuid(),
  title: z.string().min(1).max(255),
  serviceType: residentialServiceTypeSchema,
  frequency: residentialFrequencySchema,
  customerName: z.string().min(1).max(255),
  customerEmail: z.string().email().optional().nullable(),
  customerPhone: z.string().max(20).optional().nullable(),
  homeAddress: addressSchema.optional().nullable(),
  homeProfile: residentialHomeProfileSchema,
  pricingPlanId: z.string().uuid().optional().nullable(),
  addOns: z.array(residentialQuoteAddOnInputSchema).optional().default([]),
  preferredStartDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export const updateResidentialQuoteSchema = createResidentialQuoteSchema.partial().extend({
  status: residentialQuoteStatusSchema.optional(),
});

export const residentialQuotePreviewSchema = createResidentialQuoteSchema.omit({
  accountId: true,
  title: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  notes: true,
  preferredStartDate: true,
}).extend({
  serviceType: residentialServiceTypeSchema,
  frequency: residentialFrequencySchema,
  homeProfile: residentialHomeProfileSchema,
});

export const listResidentialQuotesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  accountId: z.string().uuid().optional(),
  status: residentialQuoteStatusSchema.optional(),
  includeArchived: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  search: z.string().max(100).optional(),
});

export const convertResidentialQuoteSchema = z.object({
  startDate: z.coerce.date().optional(),
  title: z.string().min(1).max(255).optional(),
  paymentTerms: z.string().max(50).optional().default('Net 30'),
});

export const declineResidentialQuoteSchema = z.object({
  reason: z.string().min(1).max(2000).optional(),
});

export const sendResidentialQuoteSchema = z.object({
  emailTo: z.string().email().optional().nullable(),
});

export const publicAcceptResidentialQuoteSchema = z.object({
  signatureName: z.string().min(1).max(255),
});

export const publicDeclineResidentialQuoteSchema = z.object({
  reason: z.string().min(1).max(2000),
});

export type ResidentialPricingPlanSettings = z.infer<typeof residentialPricingPlanSettingsSchema>;
export type CreateResidentialPricingPlanInput = z.infer<typeof createResidentialPricingPlanSchema>;
export type UpdateResidentialPricingPlanInput = z.infer<typeof updateResidentialPricingPlanSchema>;
export type ListResidentialPricingPlansQuery = z.infer<typeof listResidentialPricingPlansQuerySchema>;
export type ResidentialQuoteAddOnInput = z.infer<typeof residentialQuoteAddOnInputSchema>;
export type ResidentialHomeProfileInput = z.infer<typeof residentialHomeProfileSchema>;
export type CreateResidentialQuoteInput = z.infer<typeof createResidentialQuoteSchema>;
export type UpdateResidentialQuoteInput = z.infer<typeof updateResidentialQuoteSchema>;
export type ResidentialQuotePreviewInput = z.infer<typeof residentialQuotePreviewSchema>;
export type ListResidentialQuotesQuery = z.infer<typeof listResidentialQuotesQuerySchema>;
export type ConvertResidentialQuoteInput = z.infer<typeof convertResidentialQuoteSchema>;
export type DeclineResidentialQuoteInput = z.infer<typeof declineResidentialQuoteSchema>;
export type SendResidentialQuoteInput = z.infer<typeof sendResidentialQuoteSchema>;
