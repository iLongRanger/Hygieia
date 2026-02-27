export type ContractStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'pending_signature'
  | 'active'
  | 'expired'
  | 'terminated';

export type ServiceFrequency =
  | '1x_week'
  | '2x_week'
  | '3x_week'
  | '4x_week'
  | '5x_week'
  | '7x_week'
  | 'daily'
  | 'weekly'
  | 'bi_weekly'
  | 'monthly'
  | 'quarterly'
  | 'custom';

export type BillingCycle =
  | 'monthly'
  | 'quarterly'
  | 'semi_annual'
  | 'annual';

export interface ServiceSchedule {
  days?: (
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday'
    | 'Monday'
    | 'Tuesday'
    | 'Wednesday'
    | 'Thursday'
    | 'Friday'
    | 'Saturday'
    | 'Sunday'
  )[];
  allowedWindowStart?: string;
  allowedWindowEnd?: string;
  windowAnchor?: 'start_day';
  timezoneSource?: 'facility';
  time?: string;
  customDetails?: string;
}

export interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  status: ContractStatus;
  renewalNumber: number;
  startDate: string;
  endDate?: string | null;
  serviceFrequency?: ServiceFrequency | null;
  serviceSchedule?: ServiceSchedule | null;
  autoRenew: boolean;
  renewalNoticeDays?: number | null;
  monthlyValue: number;
  totalValue?: number | null;
  billingCycle: BillingCycle;
  paymentTerms: string;
  subcontractorTier?: string | null;
  subcontractorPayout?: number | null;
  termsAndConditions?: string | null;
  specialInstructions?: string | null;
  sentAt?: string | null;
  viewedAt?: string | null;
  publicToken?: string | null;
  signedDocumentUrl?: string | null;
  signedDate?: string | null;
  signedByName?: string | null;
  signedByEmail?: string | null;
  approvedAt?: string | null;
  terminationReason?: string | null;
  terminatedAt?: string | null;
  includesInitialClean: boolean;
  initialCleanCompleted: boolean;
  initialCleanCompletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  account: {
    id: string;
    name: string;
    type: string;
    contacts?: {
      firstName?: string | null;
      lastName?: string | null;
      name?: string | null;
      email: string | null;
      isPrimary: boolean;
    }[];
  };
  facility?: {
    id: string;
    name: string;
    address: any;
    areas?: {
      id: string;
      name: string | null;
      areaType?: string | null;
      squareFeet?: number;
      floorType?: string | null;
      roomCount?: number;
      unitCount?: number;
    }[];
    tasks?: {
      name: string;
      areaName?: string | null;
      cleaningFrequency?: string | null;
    }[];
  } | null;
  proposal?: {
    id: string;
    proposalNumber: string;
    title: string;
  } | null;
  assignedTeam?: {
    id: string;
    name: string;
    contactName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
  } | null;
  assignedToUser?: {
    id: string;
    fullName: string;
    email: string;
    status?: string;
  } | null;
  approvedByUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  createdByUser: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface CreateContractInput {
  title: string;
  accountId: string;
  facilityId?: string | null;
  proposalId?: string | null;
  startDate: string;
  endDate?: string | null;
  serviceFrequency?: ServiceFrequency | null;
  serviceSchedule?: ServiceSchedule | null;
  autoRenew?: boolean;
  renewalNoticeDays?: number | null;
  monthlyValue: number;
  totalValue?: number | null;
  billingCycle?: BillingCycle;
  paymentTerms?: string;
  termsAndConditions?: string | null;
  specialInstructions?: string | null;
}

export interface CreateContractFromProposalInput {
  proposalId: string;
  title?: string;
  startDate?: string;
  endDate?: string | null;
  serviceFrequency?: ServiceFrequency | null;
  serviceSchedule?: ServiceSchedule | null;
  autoRenew?: boolean;
  renewalNoticeDays?: number | null;
  totalValue?: number | null;
  billingCycle?: BillingCycle;
  paymentTerms?: string;
  termsAndConditions?: string | null;
  specialInstructions?: string | null;
}

export interface UpdateContractInput {
  title?: string;
  accountId?: string;
  facilityId?: string | null;
  startDate?: string;
  endDate?: string | null;
  serviceFrequency?: ServiceFrequency | null;
  serviceSchedule?: ServiceSchedule | null;
  autoRenew?: boolean;
  renewalNoticeDays?: number | null;
  monthlyValue?: number;
  totalValue?: number | null;
  billingCycle?: BillingCycle;
  paymentTerms?: string;
  termsAndConditions?: string | null;
  specialInstructions?: string | null;
}

export interface SignContractInput {
  signedDate: string;
  signedByName: string;
  signedByEmail: string;
  signedDocumentUrl?: string | null;
}

export interface SendContractInput {
  emailTo?: string;
  emailCc?: string[];
  emailSubject?: string;
  emailBody?: string;
}

export interface TerminateContractInput {
  terminationReason: string;
}

export interface ListContractsParams {
  page?: number;
  limit?: number;
  status?: ContractStatus;
  accountId?: string;
  facilityId?: string;
  proposalId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeArchived?: boolean;
}

// Renewal types
export interface RenewContractInput {
  startDate?: string;
  endDate?: string | null;
  monthlyValue?: number;
  serviceFrequency?: ServiceFrequency | null;
  serviceSchedule?: ServiceSchedule | null;
  autoRenew?: boolean;
  renewalNoticeDays?: number | null;
  billingCycle?: BillingCycle;
  paymentTerms?: string;
  termsAndConditions?: string | null;
  specialInstructions?: string | null;
}

// Standalone contract creation (imported/legacy)
export interface CreateStandaloneContractInput {
  title: string;
  accountId: string;
  facilityId?: string | null;
  startDate: string;
  endDate?: string | null;
  serviceFrequency?: ServiceFrequency | null;
  serviceSchedule?: ServiceSchedule | null;
  autoRenew?: boolean;
  renewalNoticeDays?: number | null;
  monthlyValue: number;
  totalValue?: number | null;
  billingCycle?: BillingCycle;
  paymentTerms?: string;
  termsAndConditions?: string | null;
  specialInstructions?: string | null;
}
