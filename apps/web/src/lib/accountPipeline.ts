import type { ResidentialPropertySummary } from '../types/crm';
import type { Contract } from '../types/contract';
import type { Job } from '../types/job';
import type { ResidentialQuote } from '../types/residential';

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

export interface ResidentialJourneyState {
  stageId: ResidentialAccountPipelineStageId;
  currentStage: string;
  canonicalStatus: AccountPipelineStageDefinition<ResidentialAccountPipelineStageId>['canonicalStatus'];
  nextStep: string;
}

function getResidentialJourneyStage(
  stageId: ResidentialAccountPipelineStageId,
  nextStep: string
): ResidentialJourneyState {
  const definition = RESIDENTIAL_ACCOUNT_PIPELINE_STAGES.find((stage) => stage.id === stageId);
  return {
    stageId,
    currentStage: definition?.label || stageId,
    canonicalStatus: definition?.canonicalStatus || 'lead',
    nextStep,
  };
}

export function getResidentialJourneyState(input: {
  residentialQuotes: ResidentialQuote[];
  activeContract: Contract | null;
  recentJobs: Job[];
}): ResidentialJourneyState | { currentStage: string; canonicalStatus: 'lost'; nextStep: string } {
  const latestQuote = [...input.residentialQuotes].sort((left, right) => {
    const leftTime = new Date(left.updatedAt || left.createdAt).getTime();
    const rightTime = new Date(right.updatedAt || right.createdAt).getTime();
    return rightTime - leftTime;
  })[0];

  const hasScheduledService = input.recentJobs.length > 0;

  if (hasScheduledService) {
    return getResidentialJourneyStage(
      'scheduled_service',
      'Review the generated jobs and confirm the first visit is assigned correctly.'
    );
  }

  if (input.activeContract) {
    return getResidentialJourneyStage(
      'active_contract',
      'Activate delivery by assigning the first visit or confirming auto-generated work.'
    );
  }

  switch (latestQuote?.status) {
    case 'converted':
      return getResidentialJourneyStage('contract_ready', 'Open the linked contract and activate service.');
    case 'review_required':
      return getResidentialJourneyStage(
        'review_required',
        'Get internal approval before sending the residential quote to the client.'
      );
    case 'review_approved':
      return getResidentialJourneyStage(
        'review_approved',
        'Send the approved residential quote to the client.'
      );
    case 'accepted':
      return getResidentialJourneyStage(
        'quote_accepted',
        'Convert the accepted quote into a residential contract.'
      );
    case 'viewed':
      return getResidentialJourneyStage(
        'quote_viewed',
        'Follow up with the client while the residential quote is actively under review.'
      );
    case 'sent':
      return getResidentialJourneyStage(
        'quote_sent',
        'Follow up with the client or resend the quote if needed.'
      );
    case 'declined':
      return {
        currentStage: 'Quote Declined',
        canonicalStatus: 'lost',
        nextStep: 'Revise the residential quote or close the opportunity.',
      };
    case 'draft':
    case 'quoted':
      return getResidentialJourneyStage(
        'quote_draft',
        'Finish pricing details and send the residential quote to the client.'
      );
    default:
      return getResidentialJourneyStage(
        'account_created',
        'Create the first residential quote for this household.'
      );
  }
}

export function getResidentialPropertyJourneyState(input: {
  property: ResidentialPropertySummary;
  residentialQuotes: ResidentialQuote[];
  contracts: Contract[];
  recentJobs: Job[];
}): ResidentialJourneyState | { currentStage: string; canonicalStatus: 'lost'; nextStep: string } {
  const propertyQuotes = input.residentialQuotes.filter((quote) => quote.propertyId === input.property.id);
  const propertyContracts = input.contracts.filter((contract) => {
    if (contract.residentialPropertyId) {
      return contract.residentialPropertyId === input.property.id;
    }
    return contract.facility?.name === input.property.name;
  });
  const propertyContractIds = new Set(propertyContracts.map((contract) => contract.id));
  const propertyFacilityIds = new Set(
    propertyContracts
      .map((contract) => contract.facility?.id)
      .filter((value): value is string => Boolean(value))
  );
  const propertyJobs = input.recentJobs.filter((job) => {
    return (
      (job.contract?.id ? propertyContractIds.has(job.contract.id) : false)
      || (job.facility?.id ? propertyFacilityIds.has(job.facility.id) : false)
    );
  });
  const activeContract =
    propertyContracts.find((contract) => contract.status === 'active')
    ?? propertyContracts.find((contract) => contract.status !== 'terminated')
    ?? null;

  return getResidentialJourneyState({
    residentialQuotes: propertyQuotes,
    activeContract,
    recentJobs: propertyJobs,
  });
}
