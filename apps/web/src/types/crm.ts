export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface LeadSource {
  id: string;
  name: string;
  description: string | null;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    leads: number;
  };
}

export interface Lead {
  id: string;
  status: string;
  companyName: string | null;
  contactName: string;
  primaryEmail: string | null;
  primaryPhone: string | null;
  secondaryEmail: string | null;
  secondaryPhone: string | null;
  address: Address | null;
  estimatedValue: string | null;
  probability: number | null;
  expectedCloseDate: string | null;
  notes: string | null;
  lostReason: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  leadSource: {
    id: string;
    name: string;
    color: string;
  } | null;
  assignedToUser: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  createdByUser: {
    id: string;
    fullName: string;
  };
  // Lead conversion tracking
  convertedToAccountId: string | null;
  convertedAt: string | null;
  convertedToAccount: {
    id: string;
    name: string;
  } | null;
  convertedByUser: {
    id: string;
    fullName: string;
  } | null;
}

export type AppointmentType = 'walk_through' | 'inspection' | 'visit';
export type AppointmentStatus =
  | 'scheduled'
  | 'completed'
  | 'canceled'
  | 'rescheduled'
  | 'no_show';

export interface Appointment {
  id: string;
  type: AppointmentType;
  status: AppointmentStatus;
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  location: string | null;
  notes: string | null;
  completedAt: string | null;
  rescheduledFromId: string | null;
  lead: {
    id: string;
    contactName: string;
    companyName: string | null;
    status: string;
  } | null;
  account: {
    id: string;
    name: string;
    type: string;
  } | null;
  assignedToUser: {
    id: string;
    fullName: string;
    email: string;
  };
  createdByUser: {
    id: string;
    fullName: string;
  };
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface CreateLeadInput {
  leadSourceId?: string | null;
  status?: string;
  companyName?: string | null;
  contactName: string;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  secondaryEmail?: string | null;
  secondaryPhone?: string | null;
  address?: Address | null;
  estimatedValue?: number | null;
  probability?: number | null;
  expectedCloseDate?: string | null;
  notes?: string | null;
  assignedToUserId?: string | null;
}

export interface UpdateLeadInput {
  leadSourceId?: string | null;
  status?: string;
  companyName?: string | null;
  contactName?: string;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  secondaryEmail?: string | null;
  secondaryPhone?: string | null;
  address?: Address | null;
  estimatedValue?: number | null;
  probability?: number | null;
  expectedCloseDate?: string | null;
  notes?: string | null;
  lostReason?: string | null;
  assignedToUserId?: string | null;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  industry: string | null;
  website: string | null;
  billingEmail: string | null;
  billingPhone: string | null;
  billingAddress: Address | null;
  qboCustomerId: string | null;
  taxId: string | null;
  paymentTerms: string;
  creditLimit: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  accountManager: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  createdByUser: {
    id: string;
    fullName: string;
  };
  _count: {
    contacts: number;
    facilities: number;
  };
}

export interface CreateAccountInput {
  name: string;
  type: string;
  industry?: string | null;
  website?: string | null;
  billingEmail?: string | null;
  billingPhone?: string | null;
  billingAddress?: Address | null;
  qboCustomerId?: string | null;
  taxId?: string | null;
  paymentTerms?: string;
  creditLimit?: number | null;
  accountManagerId?: string | null;
  notes?: string | null;
}

export interface UpdateAccountInput {
  name?: string;
  type?: string;
  industry?: string | null;
  website?: string | null;
  billingEmail?: string | null;
  billingPhone?: string | null;
  billingAddress?: Address | null;
  qboCustomerId?: string | null;
  taxId?: string | null;
  paymentTerms?: string;
  creditLimit?: number | null;
  accountManagerId?: string | null;
  notes?: string | null;
}

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  title: string | null;
  department: string | null;
  isPrimary: boolean;
  isBilling: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  account: {
    id: string;
    name: string;
    type: string;
  } | null;
  createdByUser: {
    id: string;
    fullName: string;
  };
}

export interface CreateContactInput {
  accountId?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  title?: string | null;
  department?: string | null;
  isPrimary?: boolean;
  isBilling?: boolean;
  notes?: string | null;
}

export interface UpdateContactInput {
  accountId?: string | null;
  name?: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  title?: string | null;
  department?: string | null;
  isPrimary?: boolean;
  isBilling?: boolean;
  notes?: string | null;
}

export interface ConditionMultipliers {
  excellent: number;
  good: number;
  fair: number;
  poor: number;
}

export interface PricingRule {
  id: string;
  name: string;
  description: string | null;
  pricingType: string;
  baseRate: string;
  minimumCharge: string | null;
  squareFootRate: string | null;
  difficultyMultiplier: string;
  conditionMultipliers: ConditionMultipliers;
  cleaningType: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  areaType: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  createdByUser: {
    id: string;
    fullName: string;
  };
  _count: {
    pricingOverrides: number;
  };
}

export interface CreatePricingRuleInput {
  name: string;
  description?: string | null;
  pricingType: string;
  baseRate: number;
  minimumCharge?: number | null;
  squareFootRate?: number | null;
  difficultyMultiplier?: number;
  conditionMultipliers?: ConditionMultipliers;
  cleaningType?: string | null;
  areaTypeId?: string | null;
  isActive?: boolean;
}

export interface UpdatePricingRuleInput {
  name?: string;
  description?: string | null;
  pricingType?: string;
  baseRate?: number;
  minimumCharge?: number | null;
  squareFootRate?: number | null;
  difficultyMultiplier?: number;
  conditionMultipliers?: ConditionMultipliers;
  cleaningType?: string | null;
  areaTypeId?: string | null;
  isActive?: boolean;
}

export interface PricingOverride {
  id: string;
  overrideRate: string;
  overrideReason: string;
  effectiveDate: string;
  expiryDate: string | null;
  createdAt: string;
  updatedAt: string;
  facility: {
    id: string;
    name: string;
    account: {
      id: string;
      name: string;
    };
  };
  pricingRule: {
    id: string;
    name: string;
    pricingType: string;
    baseRate: string;
  };
  approvedByUser: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  createdByUser: {
    id: string;
    fullName: string;
  };
}

export interface CreatePricingOverrideInput {
  facilityId: string;
  pricingRuleId: string;
  overrideRate: number;
  overrideReason: string;
  effectiveDate?: string;
  expiryDate?: string | null;
}

export interface UpdatePricingOverrideInput {
  overrideRate?: number;
  overrideReason?: string;
  effectiveDate?: string;
  expiryDate?: string | null;
  approvedByUserId?: string | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}
