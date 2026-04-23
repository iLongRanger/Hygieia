import type { PricingSettingsSnapshot } from '../lib/pricing';

export type ProposalStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'rejected'
  | 'expired';

export type ProposalType =
  | 'recurring'
  | 'one_time'
  | 'specialized';

export type ProposalItemType =
  | 'labor'
  | 'materials'
  | 'equipment'
  | 'supplies'
  | 'other';

export type ServiceType =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'one_time';

export type ServiceFrequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'annually';

export type ProposalScheduleFrequency =
  | '1x_week'
  | '2x_week'
  | '3x_week'
  | '4x_week'
  | '5x_week'
  | '7x_week'
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly';

export type ServiceScheduleDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface ProposalServiceSchedule {
  days: ServiceScheduleDay[];
  allowedWindowStart: string;
  allowedWindowEnd: string;
  windowAnchor: 'start_day';
  timezoneSource: 'facility';
}

export interface ProposalItem {
  id?: string;
  itemType: ProposalItemType;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sortOrder?: number;
}

export interface ProposalService {
  id?: string;
  catalogItemId?: string | null;
  serviceName: string;
  serviceType: ServiceType;
  frequency: ServiceFrequency;
  estimatedHours?: number | null;
  hourlyRate?: number | null;
  monthlyPrice: number;
  description?: string | null;
  includedTasks?: string[];
  pricingMeta?: Record<string, unknown>;
  sortOrder?: number;
}

export interface Proposal {
  id: string;
  proposalNumber: string;
  title: string;
  status: ProposalStatus;
  proposalType?: ProposalType;
  description?: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  validUntil?: string | null;
  scheduledDate?: string | null;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  sentAt?: string | null;
  viewedAt?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  notes?: string | null;
  termsAndConditions?: string | null;
  serviceFrequency?: ProposalScheduleFrequency;
  serviceSchedule?: ProposalServiceSchedule | null;
  pricingApprovalStatus?: 'not_required' | 'pending' | 'approved' | 'rejected';
  pricingApprovalReason?: string | null;
  pricingApprovalRequestedAt?: string | null;
  pricingApprovedAt?: string | null;
  pricingApprovalRejectedAt?: string | null;

  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  pricingStrategyKey?: string | null;
  pricingStrategyVersion?: string | null;
  // Pricing plan fields
  pricingPlanId?: string | null;
  pricingSnapshot?: PricingSettingsSnapshot | null;
  pricingLocked?: boolean;
  pricingLockedAt?: string | null;
  // Public access fields
  publicToken?: string | null;
  publicTokenExpiresAt?: string | null;
  signatureName?: string | null;
  signatureDate?: string | null;
  signatureIp?: string | null;
  account: {
    id: string;
    name: string;
    type: string;
    defaultPricingPlanId?: string | null;
    contacts?: { name: string; email: string | null; isPrimary: boolean }[];
  };
  facility?: {
    id: string;
    name: string;
    address: Record<string, unknown>;
    defaultPricingPlanId?: string | null;
  } | null;
  createdByUser: {
    id: string;
    fullName: string;
    email: string;
  };
  proposalItems: ProposalItem[];
  proposalServices: ProposalService[];
}

export interface CreateProposalInput {
  accountId: string;
  facilityId: string;
  proposalType?: ProposalType;
  title: string;
  description?: string | null;
  validUntil?: string | null;
  scheduledDate?: string | null;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  taxRate?: number;
  notes?: string | null;
  serviceFrequency?: ProposalScheduleFrequency;
  serviceSchedule?: ProposalServiceSchedule | null;

  proposalItems?: ProposalItem[];
  proposalServices?: ProposalService[];
  // Pricing plan (optional - will use defaults if not provided)
  pricingPlanId?: string | null;
  pricingSnapshot?: PricingSettingsSnapshot | null;
}

export interface UpdateProposalInput {
  accountId?: string;
  facilityId?: string | null;
  proposalType?: ProposalType;
  title?: string;
  status?: ProposalStatus;
  description?: string | null;
  validUntil?: string | null;
  scheduledDate?: string | null;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  taxRate?: number;
  notes?: string | null;
  serviceFrequency?: ProposalScheduleFrequency;
  serviceSchedule?: ProposalServiceSchedule | null;

  proposalItems?: ProposalItem[];
  proposalServices?: ProposalService[];
  // Pricing plan
  pricingPlanId?: string | null;
  pricingSnapshot?: PricingSettingsSnapshot | null;
}

export interface ListProposalsParams {
  page?: number;
  limit?: number;
  status?: ProposalStatus;
  accountId?: string;
  facilityId?: string;
  proposalType?: ProposalType;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeArchived?: boolean;
}

export interface SendProposalInput {
  emailTo?: string;
  emailCc?: string[];
  emailSubject?: string;
  emailBody?: string;
}

export interface RejectProposalInput {
  rejectionReason: string;
}

export interface ProposalVersion {
  id: string;
  versionNumber: number;
  snapshot: {
    status?: string;
    totalAmount?: string | number;
    proposalServices?: unknown[];
    proposalItems?: unknown[];
  };
  changeReason: string | null;
  createdAt: string;
  changedByUser: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface ProposalVersionSummary {
  id: string;
  versionNumber: number;
  changeReason: string | null;
  createdAt: string;
  changedByUser: {
    id: string;
    fullName: string;
    email: string;
  };
}
