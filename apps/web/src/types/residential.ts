export type ResidentialStrategyKey = 'residential_flat_v1' | 'residential_project_v1';
export type ResidentialServiceType =
  | 'recurring_standard'
  | 'one_time_standard'
  | 'deep_clean'
  | 'move_in_out'
  | 'turnover'
  | 'post_construction';
export type ResidentialFrequency = 'weekly' | 'biweekly' | 'every_4_weeks' | 'one_time';
export type ResidentialHomeType = 'apartment' | 'condo' | 'townhouse' | 'single_family';
export type ResidentialCondition = 'light' | 'standard' | 'heavy';
export type ResidentialOccupiedStatus = 'occupied' | 'vacant' | 'move_in' | 'move_out';
export type ResidentialQuoteStatus =
  | 'draft'
  | 'quoted'
  | 'review_required'
  | 'review_approved'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'converted';

export type ResidentialPropertyStatus = 'active' | 'archived';

export interface ResidentialAddress {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

export interface ResidentialAddOnDefinition {
  pricingType: 'flat' | 'per_unit';
  unitPrice: number;
  estimatedMinutes: number;
  unitLabel?: string;
  description?: string;
  requiresManualReview?: boolean;
}

export interface ResidentialPricingPlanSettings {
  strategyKey: ResidentialStrategyKey;
  homeTypeBasePrices: Record<ResidentialHomeType, number>;
  sqftBrackets: Array<{
    upTo: number | null;
    adjustment: number;
  }>;
  bedroomAdjustments: Record<string, number>;
  bathroomAdjustments: {
    fullBath: number;
    halfBath: number;
  };
  levelAdjustments: Record<string, number>;
  conditionMultipliers: Record<ResidentialCondition, number>;
  serviceTypeMultipliers: Record<ResidentialServiceType, number>;
  frequencyDiscounts: Record<ResidentialFrequency, number>;
  firstCleanSurcharge: {
    enabled: boolean;
    type: 'flat' | 'percent';
    value: number;
    appliesTo: ResidentialServiceType[];
  };
  addOnPrices: Record<string, ResidentialAddOnDefinition>;
  minimumPrice: number;
  estimatedHours: {
    baseHoursByHomeType: Record<ResidentialHomeType, number>;
    minutesPerBedroom: number;
    minutesPerFullBath: number;
    minutesPerHalfBath: number;
    minutesPer1000SqFt: number;
    conditionMultipliers: Record<ResidentialCondition, number>;
    serviceTypeMultipliers: Record<ResidentialServiceType, number>;
    addOnMinutes: Record<string, number>;
  };
  manualReviewRules: {
    maxAutoSqft: number;
    heavyConditionRequiresReview: boolean;
    postConstructionRequiresReview: boolean;
    maxAddOnsBeforeReview: number;
  };
}

export interface ResidentialPricingPlan {
  id: string;
  name: string;
  strategyKey: ResidentialStrategyKey;
  settings: ResidentialPricingPlanSettings;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  createdByUser: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface ResidentialQuoteAddOnInput {
  code: string;
  quantity: number;
  label?: string;
}

export interface ResidentialHomeProfile {
  homeType: ResidentialHomeType;
  squareFeet: number;
  bedrooms: number;
  fullBathrooms: number;
  halfBathrooms: number;
  levels: number;
  occupiedStatus: ResidentialOccupiedStatus;
  condition: ResidentialCondition;
  hasPets?: boolean;
  lastProfessionalCleaning?: string | null;
  parkingAccess?: string | null;
  entryNotes?: string | null;
  specialInstructions?: string | null;
  isFirstVisit?: boolean;
}

export interface ResidentialQuoteFormInput {
  accountId: string;
  propertyId: string;
  title: string;
  serviceType: ResidentialServiceType;
  frequency: ResidentialFrequency;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  homeAddress?: ResidentialAddress | null;
  homeProfile: ResidentialHomeProfile;
  pricingPlanId?: string | null;
  addOns?: ResidentialQuoteAddOnInput[];
  preferredStartDate?: string | null;
  notes?: string | null;
}

export interface ResidentialQuotePreview {
  pricingPlan: {
    id: string;
    name: string;
    strategyKey: ResidentialStrategyKey;
  };
  breakdown: {
    baseHomePrice: number;
    sqftAdjustment: number;
    bedroomAdjustment: number;
    bathroomAdjustment: number;
    levelAdjustment: number;
    baseSubtotal: number;
    conditionMultiplier: number;
    serviceMultiplier: number;
    serviceSubtotal: number;
    recurringDiscount: number;
    firstCleanSurcharge: number;
    addOnTotal: number;
    minimumApplied: boolean;
    minimumPrice: number;
    totalBeforeMinimum: number;
    finalTotal: number;
    estimatedHours: number;
    confidenceLevel: 'high' | 'medium' | 'low';
    manualReviewRequired: boolean;
    manualReviewReasons: string[];
    addOns: Array<{
      code: string;
      label: string;
      pricingType: 'flat' | 'per_unit';
      quantity: number;
      unitLabel?: string | null;
      unitPrice: number;
      estimatedMinutes: number;
      lineTotal: number;
    }>;
    guidance: string[];
  };
  settingsSnapshot: ResidentialPricingPlanSettings;
}

export interface ResidentialQuote {
  id: string;
  quoteNumber: string;
  title: string;
  status: ResidentialQuoteStatus;
  accountId: string;
  propertyId: string;
  serviceType: ResidentialServiceType;
  frequency: ResidentialFrequency;
  customerName: string;
  customerEmail: string | null;
  customerPhone?: string | null;
  homeAddress?: ResidentialAddress | null;
  homeProfile?: ResidentialHomeProfile;
  settingsSnapshot?: ResidentialPricingPlanSettings | null;
  priceBreakdown?: ResidentialQuotePreview['breakdown'] | null;
  subtotal: string;
  addOnTotal: string;
  recurringDiscount: string;
  firstCleanSurcharge: string;
  totalAmount: string;
  estimatedHours: string | null;
  confidenceLevel: 'high' | 'medium' | 'low';
  manualReviewRequired: boolean;
  manualReviewReasons?: string[];
  preferredStartDate?: string | null;
  notes?: string | null;
  publicToken?: string | null;
  publicTokenExpiresAt?: string | null;
  sentAt?: string | null;
  viewedAt?: string | null;
  acceptedAt?: string | null;
  signatureName?: string | null;
  signatureDate?: string | null;
  declinedAt?: string | null;
  declineReason?: string | null;
  convertedAt?: string | null;
  convertedContractId?: string | null;
  createdAt: string;
  updatedAt?: string;
  archivedAt: string | null;
  pricingPlan?: {
    id: string;
    name: string;
    strategyKey?: ResidentialStrategyKey;
    settings?: ResidentialPricingPlanSettings;
  } | null;
  account?: {
    id: string;
    name: string;
    type?: 'commercial' | 'residential';
    billingEmail?: string | null;
    billingPhone?: string | null;
    billingAddress?: ResidentialAddress | null;
    serviceAddress?: ResidentialAddress | null;
    residentialProfile?: ResidentialHomeProfile | null;
  } | null;
  property?: {
    id: string;
    name: string;
    serviceAddress: ResidentialAddress | null;
    homeProfile: ResidentialHomeProfile;
    accessNotes?: string | null;
    parkingAccess?: string | null;
    entryNotes?: string | null;
    pets?: boolean | null;
    isPrimary: boolean;
    status: ResidentialPropertyStatus;
  } | null;
  addOns?: Array<{
    id: string;
    code: string;
    label: string;
    description: string | null;
    quantity: number;
    pricingType: 'flat' | 'per_unit';
    unitLabel: string | null;
    unitPrice: string;
    estimatedMinutes: number;
    lineTotal: string;
    sortOrder: number;
  }>;
}

export interface PublicResidentialQuote extends ResidentialQuote {
  createdByUser?: {
    fullName: string;
    email: string;
  };
}

export interface ResidentialProperty {
  id: string;
  accountId: string;
  name: string;
  serviceAddress: ResidentialAddress;
  homeProfile: ResidentialHomeProfile;
  accessNotes?: string | null;
  parkingAccess?: string | null;
  entryNotes?: string | null;
  pets?: boolean | null;
  isPrimary: boolean;
  status: ResidentialPropertyStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  account?: {
    id: string;
    name: string;
    type?: 'commercial' | 'residential';
  } | null;
}
