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

export interface AccountPipelineStageDefinition<TStageId extends string> {
  id: TStageId;
  label: string;
  canonicalStatus: 'lead' | 'walk_through_booked' | 'walk_through_completed' | 'proposal_sent' | 'negotiation' | 'won';
}

export const COMMERCIAL_ACCOUNT_PIPELINE_STAGES: readonly AccountPipelineStageDefinition<CommercialAccountPipelineStageId>[] = [
  { id: 'account_created', label: 'Account Created', canonicalStatus: 'lead' },
  { id: 'facility_added', label: 'Facility Added', canonicalStatus: 'lead' },
  { id: 'walkthrough_booked', label: 'Walkthrough Booked', canonicalStatus: 'walk_through_booked' },
  { id: 'walkthrough_completed', label: 'Walkthrough Completed', canonicalStatus: 'walk_through_completed' },
  { id: 'proposal_draft', label: 'Proposal Draft', canonicalStatus: 'walk_through_completed' },
  { id: 'proposal_sent', label: 'Proposal Sent', canonicalStatus: 'proposal_sent' },
  { id: 'proposal_viewed', label: 'Proposal Viewed', canonicalStatus: 'negotiation' },
  { id: 'contract_ready', label: 'Contract Ready', canonicalStatus: 'negotiation' },
  { id: 'active_contract', label: 'Active Contract', canonicalStatus: 'won' },
  { id: 'scheduled_service', label: 'Scheduled Service', canonicalStatus: 'won' },
] as const;

export const RESIDENTIAL_ACCOUNT_PIPELINE_STAGES: readonly AccountPipelineStageDefinition<ResidentialAccountPipelineStageId>[] = [
  { id: 'account_created', label: 'Account Created', canonicalStatus: 'lead' },
  { id: 'quote_draft', label: 'Quote Draft', canonicalStatus: 'lead' },
  { id: 'review_required', label: 'Review Required', canonicalStatus: 'lead' },
  { id: 'review_approved', label: 'Review Approved', canonicalStatus: 'lead' },
  { id: 'quote_sent', label: 'Quote Sent', canonicalStatus: 'proposal_sent' },
  { id: 'quote_viewed', label: 'Quote Viewed', canonicalStatus: 'negotiation' },
  { id: 'quote_accepted', label: 'Quote Accepted', canonicalStatus: 'negotiation' },
  { id: 'contract_ready', label: 'Contract Ready', canonicalStatus: 'negotiation' },
  { id: 'active_contract', label: 'Active Contract', canonicalStatus: 'won' },
  { id: 'scheduled_service', label: 'Scheduled Service', canonicalStatus: 'won' },
] as const;
