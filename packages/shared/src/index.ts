export const APP_NAME = 'Hygieia';
export const API_VERSION = 'v1';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const LEAD_STATUSES = [
  'lead',
  'walk_through_booked',
  'walk_through_completed',
  'proposal_sent',
  'negotiation',
  'won',
  'lost',
  'reopened',
] as const;

export const ACCOUNT_TYPES = ['commercial', 'residential'] as const;

export const CONDITION_LEVELS = ['excellent', 'good', 'fair', 'poor'] as const;

export const USER_STATUSES = ['active', 'disabled', 'pending'] as const;

export const FACILITY_STATUSES = ['active', 'inactive', 'archived'] as const;

export const CLEANING_FREQUENCIES = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
] as const;
