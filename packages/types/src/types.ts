/**
 * Hygieia Shared Types
 *
 * These are API/UI-facing DTOs. For database entity types, use @hygieia/database.
 * Single-tenant architecture - no tenantId fields.
 */

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  status: 'active' | 'disabled' | 'pending';
}

export interface UserWithRoles extends User {
  roles: Role[];
}

export interface Role {
  id: string;
  key: string;
  label: string;
  permissions: Record<string, boolean>;
}

export interface Lead {
  id: string;
  companyName: string | null;
  contactName: string;
  primaryEmail: string | null;
  primaryPhone: string | null;
  status: LeadStatus;
  estimatedValue: number | null;
  probability: number | null;
  expectedCloseDate: string | null;
  assignedToUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LeadStatus =
  | 'lead'
  | 'walk_through_booked'
  | 'walk_through_completed'
  | 'proposal_sent'
  | 'negotiation'
  | 'won'
  | 'lost'
  | 'reopened';

export const PIPELINE_AUTO_ADVANCE_STATUSES = [
  'lead',
  'walk_through_booked',
  'walk_through_completed',
  'proposal_sent',
  'negotiation',
  'won',
] as const;

export type PipelineAutoAdvanceStatus = typeof PIPELINE_AUTO_ADVANCE_STATUSES[number];

export type AccountType = 'commercial' | 'residential';

export type CommercialAccountPipelineStageId =
  | 'account_created'
  | 'facility_added'
  | 'walkthrough_booked'
  | 'walkthrough_completed'
  | 'proposal_draft'
  | 'proposal_sent'
  | 'proposal_viewed'
  | 'contract_ready'
  | 'active_contract'
  | 'scheduled_service';

export type ResidentialAccountPipelineStageId =
  | 'account_created'
  | 'quote_draft'
  | 'review_required'
  | 'review_approved'
  | 'quote_sent'
  | 'quote_viewed'
  | 'quote_accepted'
  | 'contract_ready'
  | 'active_contract'
  | 'scheduled_service';

export type AccountPipelineStageId = CommercialAccountPipelineStageId | ResidentialAccountPipelineStageId;

export interface AccountPipelineStageDefinition {
  id: AccountPipelineStageId;
  accountType: AccountType;
  label: string;
  canonicalStatus: PipelineAutoAdvanceStatus;
}

export const COMMERCIAL_ACCOUNT_PIPELINE_STAGES: readonly AccountPipelineStageDefinition[] = [
  { id: 'account_created', accountType: 'commercial', label: 'Account Created', canonicalStatus: 'lead' },
  { id: 'facility_added', accountType: 'commercial', label: 'Facility Added', canonicalStatus: 'lead' },
  { id: 'walkthrough_booked', accountType: 'commercial', label: 'Walkthrough Booked', canonicalStatus: 'walk_through_booked' },
  { id: 'walkthrough_completed', accountType: 'commercial', label: 'Walkthrough Completed', canonicalStatus: 'walk_through_completed' },
  { id: 'proposal_draft', accountType: 'commercial', label: 'Proposal Draft', canonicalStatus: 'walk_through_completed' },
  { id: 'proposal_sent', accountType: 'commercial', label: 'Proposal Sent', canonicalStatus: 'proposal_sent' },
  { id: 'proposal_viewed', accountType: 'commercial', label: 'Proposal Viewed', canonicalStatus: 'negotiation' },
  { id: 'contract_ready', accountType: 'commercial', label: 'Contract Ready', canonicalStatus: 'negotiation' },
  { id: 'active_contract', accountType: 'commercial', label: 'Active Contract', canonicalStatus: 'won' },
  { id: 'scheduled_service', accountType: 'commercial', label: 'Scheduled Service', canonicalStatus: 'won' },
] as const;

export const RESIDENTIAL_ACCOUNT_PIPELINE_STAGES: readonly AccountPipelineStageDefinition[] = [
  { id: 'account_created', accountType: 'residential', label: 'Account Created', canonicalStatus: 'lead' },
  { id: 'quote_draft', accountType: 'residential', label: 'Quote Draft', canonicalStatus: 'lead' },
  { id: 'review_required', accountType: 'residential', label: 'Review Required', canonicalStatus: 'lead' },
  { id: 'review_approved', accountType: 'residential', label: 'Review Approved', canonicalStatus: 'lead' },
  { id: 'quote_sent', accountType: 'residential', label: 'Quote Sent', canonicalStatus: 'proposal_sent' },
  { id: 'quote_viewed', accountType: 'residential', label: 'Quote Viewed', canonicalStatus: 'negotiation' },
  { id: 'quote_accepted', accountType: 'residential', label: 'Quote Accepted', canonicalStatus: 'negotiation' },
  { id: 'contract_ready', accountType: 'residential', label: 'Contract Ready', canonicalStatus: 'negotiation' },
  { id: 'active_contract', accountType: 'residential', label: 'Active Contract', canonicalStatus: 'won' },
  { id: 'scheduled_service', accountType: 'residential', label: 'Scheduled Service', canonicalStatus: 'won' },
] as const;

export type AppointmentType = 'walk_through' | 'inspection' | 'visit';
export type AppointmentStatus =
  | 'scheduled'
  | 'completed'
  | 'canceled'
  | 'rescheduled'
  | 'no_show';

export interface Appointment {
  id: string;
  leadId?: string | null;
  accountId?: string | null;
  type: AppointmentType;
  status: AppointmentStatus;
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  location: string | null;
  notes: string | null;
  assignedToUserId: string;
  createdByUserId: string;
  completedAt: string | null;
  rescheduledFromId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'commercial' | 'residential';
  industry: string | null;
  website: string | null;
  billingEmail: string | null;
  billingPhone: string | null;
  paymentTerms: string;
  accountManagerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  accountId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  title: string | null;
  department: string | null;
  isPrimary: boolean;
  isBilling: boolean;
}

export interface Facility {
  id: string;
  accountId: string;
  name: string;
  squareFeet: number | null;
  buildingType: string | null;
  status: 'active' | 'inactive' | 'archived';
  facilityManagerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Area {
  id: string;
  facilityId: string;
  areaTypeId: string;
  name: string | null;
  quantity: number;
  squareFeet: number | null;
  conditionLevel: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface AreaType {
  id: string;
  name: string;
  description: string | null;
  defaultSquareFeet: number | null;
  baseCleaningTimeMinutes: number | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
