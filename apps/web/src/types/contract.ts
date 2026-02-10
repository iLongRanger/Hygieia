export type ContractStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'pending_signature'
  | 'active'
  | 'expired'
  | 'terminated'
  | 'renewed';

export type ContractSource = 'proposal' | 'imported' | 'legacy' | 'renewal';

export type ServiceFrequency =
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
  days?: string[];
  time?: string;
  customDetails?: string;
}

export interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  status: ContractStatus;
  contractSource: ContractSource;
  renewedFromContractId?: string | null;
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
  renewedFromContract?: {
    id: string;
    contractNumber: string;
    title: string;
  } | null;
  renewedToContract?: {
    id: string;
    contractNumber: string;
    title: string;
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
  contractSource?: ContractSource;
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
  startDate: string;
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

export interface CanRenewContractResult {
  canRenew: boolean;
  reason?: string;
}

// Standalone contract creation (imported/legacy)
export interface CreateStandaloneContractInput {
  title: string;
  contractSource: 'imported' | 'legacy';
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
