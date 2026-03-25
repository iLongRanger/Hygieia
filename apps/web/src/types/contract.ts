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

export type ResidentialContractServiceType =
  | 'recurring_standard'
  | 'one_time_standard'
  | 'deep_clean'
  | 'move_in_out'
  | 'turnover'
  | 'post_construction';

export type ResidentialContractFrequency =
  | 'weekly'
  | 'biweekly'
  | 'every_4_weeks'
  | 'one_time';

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
  residentialPropertyId?: string | null;
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
  residentialServiceType?: ResidentialContractServiceType | null;
  residentialFrequency?: ResidentialContractFrequency | null;
  paymentTerms: string;
  subcontractorTier?: string | null;
  subcontractorPayout?: number | null;
  pendingAssignedTeamId?: string | null;
  pendingAssignedToUserId?: string | null;
  pendingSubcontractorTier?: string | null;
  assignmentOverrideEffectiveDate?: string | null;
  assignmentOverrideSetAt?: string | null;
  termsAndConditions?: string | null;
  termsDocumentName?: string | null;
  termsDocumentMimeType?: string | null;
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
    buildingType?: string | null;
    accessInstructions?: string | null;
    parkingInfo?: string | null;
    specialRequirements?: string | null;
    notes?: string | null;
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
    proposalServices?: {
      id: string;
      serviceName: string;
      frequency?: string | null;
      description?: string | null;
      monthlyPrice?: number | null;
      estimatedHours?: number | null;
      hourlyRate?: number | null;
      includedTasks?: string[];
    }[];
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
  pendingAssignedTeam?: {
    id: string;
    name: string;
    contactName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
  } | null;
  pendingAssignedToUser?: {
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

export type ContractAmendmentStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'sent'
  | 'viewed'
  | 'rejected'
  | 'signed'
  | 'applied'
  | 'canceled';

export type ContractAmendmentType =
  | 'scope_change'
  | 'pricing_change'
  | 'schedule_change'
  | 'terms_change'
  | 'mixed';

export interface ContractAmendmentScopeSnapshot {
  id: string;
  snapshotType: 'before' | 'working' | 'after' | string;
  scopeJson: Record<string, any>;
  createdAt: string;
}

export interface ContractAmendmentDraftArea {
  id?: string;
  tempId?: string;
  areaTypeId?: string | null;
  areaType?: {
    id?: string;
    name?: string | null;
  } | null;
  name?: string | null;
  quantity?: number;
  squareFeet?: number | null;
  floorType?: string | null;
  conditionLevel?: string | null;
  trafficLevel?: string | null;
  roomCount?: number | null;
  unitCount?: number | null;
  notes?: string | null;
}

export interface ContractAmendmentDraftTask {
  id?: string;
  tempId?: string;
  areaId?: string | null;
  taskTemplateId?: string | null;
  taskTemplate?: {
    id?: string;
    name?: string | null;
  } | null;
  customName?: string | null;
  cleaningFrequency?: string | null;
  estimatedMinutes?: number | null;
  baseMinutesOverride?: number | null;
  perSqftMinutesOverride?: number | null;
  perUnitMinutesOverride?: number | null;
  perRoomMinutesOverride?: number | null;
}

export interface ContractAmendmentWorkingScope {
  contract?: {
    serviceFrequency?: ServiceFrequency | null;
    serviceSchedule?: ServiceSchedule | null;
  } | null;
  facility?: {
    id?: string;
    name?: string;
    buildingType?: string | null;
  } | null;
  areas: ContractAmendmentDraftArea[];
  tasks: ContractAmendmentDraftTask[];
}

export interface ContractAmendmentActivity {
  id: string;
  action: string;
  metadata: Record<string, any>;
  createdAt: string;
  performedByUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export interface ContractAmendment {
  id: string;
  contractId: string;
  amendmentNumber: number;
  status: ContractAmendmentStatus;
  amendmentType: ContractAmendmentType;
  title: string;
  summary?: string | null;
  reason?: string | null;
  effectiveDate: string;
  pricingPlanId?: string | null;
  oldMonthlyValue: number;
  newMonthlyValue?: number | null;
  monthlyDelta?: number | null;
  oldServiceFrequency?: ServiceFrequency | null;
  newServiceFrequency?: ServiceFrequency | null;
  oldServiceSchedule?: ServiceSchedule | null;
  newServiceSchedule?: ServiceSchedule | null;
  pricingSnapshot?: Record<string, any> | null;
  approvedAt?: string | null;
  sentAt?: string | null;
  viewedAt?: string | null;
  signedDate?: string | null;
  signedByName?: string | null;
  signedByEmail?: string | null;
  publicToken?: string | null;
  appliedAt?: string | null;
  canceledAt?: string | null;
  rejectedAt?: string | null;
  rejectedReason?: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUser: {
    id: string;
    fullName: string;
    email: string;
  };
  approvedByUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  appliedByUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  snapshots?: ContractAmendmentScopeSnapshot[];
  activities?: ContractAmendmentActivity[];
}

export interface CreateContractInput {
  title: string;
  accountId: string;
  facilityId: string;
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
  termsDocumentName?: string | null;
  termsDocumentMimeType?: string | null;
  termsDocumentDataUrl?: string | null;
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
  termsDocumentName?: string | null;
  termsDocumentMimeType?: string | null;
  termsDocumentDataUrl?: string | null;
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
  termsDocumentName?: string | null;
  termsDocumentMimeType?: string | null;
  termsDocumentDataUrl?: string | null;
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
  needsAttention?: boolean;
  unassignedOnly?: boolean;
  nearingRenewalOnly?: boolean;
  renewalWindowDays?: number;
  accountId?: string;
  facilityId?: string;
  proposalId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeArchived?: boolean;
}

export interface RecalculateContractAmendmentInput {
  pricingPlanId?: string | null;
  newServiceFrequency?: ServiceFrequency | null;
  newServiceSchedule?: ServiceSchedule | null;
  workingScope?: ContractAmendmentWorkingScope | null;
}

export interface ContractSummary {
  total: number;
  byStatus: {
    draft: number;
    sent: number;
    viewed: number;
    pendingSignature: number;
    active: number;
  };
  unassigned: number;
  nearingRenewal: number;
  renewalWindowDays: number;
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
  termsDocumentName?: string | null;
  termsDocumentMimeType?: string | null;
  termsDocumentDataUrl?: string | null;
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
  termsDocumentName?: string | null;
  termsDocumentMimeType?: string | null;
  termsDocumentDataUrl?: string | null;
  specialInstructions?: string | null;
}

export interface CreateContractAmendmentInput {
  title?: string;
  summary?: string | null;
  reason?: string | null;
  effectiveDate: string;
  pricingPlanId?: string | null;
  amendmentType?: ContractAmendmentType;
  newMonthlyValue?: number | null;
  newServiceFrequency?: ServiceFrequency | null;
  newServiceSchedule?: ServiceSchedule | null;
  pricingSnapshot?: Record<string, any> | null;
  workingScope?: ContractAmendmentWorkingScope | null;
}

export interface UpdateContractAmendmentInput {
  title?: string;
  summary?: string | null;
  reason?: string | null;
  effectiveDate?: string;
  pricingPlanId?: string | null;
  amendmentType?: ContractAmendmentType;
  newMonthlyValue?: number | null;
  newServiceFrequency?: ServiceFrequency | null;
  newServiceSchedule?: ServiceSchedule | null;
  pricingSnapshot?: Record<string, any> | null;
  workingScope?: ContractAmendmentWorkingScope | null;
  status?: Extract<ContractAmendmentStatus, 'draft' | 'submitted' | 'canceled'>;
}
