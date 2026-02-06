export type ProposalStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'rejected'
  | 'expired';

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
  serviceName: string;
  serviceType: ServiceType;
  frequency: ServiceFrequency;
  estimatedHours?: number | null;
  hourlyRate?: number | null;
  monthlyPrice: number;
  description?: string | null;
  includedTasks?: string[];
  sortOrder?: number;
}

export interface Proposal {
  id: string;
  proposalNumber: string;
  title: string;
  status: ProposalStatus;
  description?: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  validUntil?: string | null;
  sentAt?: string | null;
  viewedAt?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  notes?: string | null;
  termsAndConditions?: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  // Pricing plan fields
  pricingPlanId?: string | null;
  pricingSnapshot?: any | null;
  pricingLocked?: boolean;
  pricingLockedAt?: string | null;
  account: {
    id: string;
    name: string;
    type: string;
    defaultPricingPlanId?: string | null;
  };
  facility?: {
    id: string;
    name: string;
    address: any;
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
  facilityId?: string | null;
  title: string;
  description?: string | null;
  validUntil?: string | null;
  taxRate?: number;
  notes?: string | null;
  termsAndConditions?: string | null;
  proposalItems?: ProposalItem[];
  proposalServices?: ProposalService[];
  // Pricing plan (optional - will use defaults if not provided)
  pricingPlanId?: string | null;
}

export interface UpdateProposalInput {
  accountId?: string;
  facilityId?: string | null;
  title?: string;
  status?: ProposalStatus;
  description?: string | null;
  validUntil?: string | null;
  taxRate?: number;
  notes?: string | null;
  termsAndConditions?: string | null;
  proposalItems?: ProposalItem[];
  proposalServices?: ProposalService[];
  // Pricing plan
  pricingPlanId?: string | null;
}

export interface ListProposalsParams {
  page?: number;
  limit?: number;
  status?: ProposalStatus;
  accountId?: string;
  facilityId?: string;
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
