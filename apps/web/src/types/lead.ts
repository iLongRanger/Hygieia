export interface LeadSource {
  id: string;
  name: string;
  description: string | null;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  status: string;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
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

export interface Lead {
  id: string;
  leadSourceId: string | null;
  status: LeadStatus;
  companyName: string | null;
  contactName: string;
  primaryEmail: string | null;
  primaryPhone: string | null;
  secondaryEmail: string | null;
  secondaryPhone: string | null;
  address: Address | null;
  estimatedValue: string | null;
  probability: number;
  expectedCloseDate: string | null;
  notes: string | null;
  lostReason: string | null;
  assignedToUserId: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  leadSource: LeadSource | null;
  assignedToUser: User | null;
  createdByUser: User;
}

export interface CreateLeadInput {
  leadSourceId?: string | null;
  companyName?: string | null;
  contactName: string;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  secondaryEmail?: string | null;
  secondaryPhone?: string | null;
  address?: Address | null;
  estimatedValue?: number | null;
  probability?: number;
  expectedCloseDate?: string | null;
  notes?: string | null;
  assignedToUserId?: string | null;
}

export interface UpdateLeadInput {
  leadSourceId?: string | null;
  status?: LeadStatus;
  companyName?: string | null;
  contactName?: string;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  secondaryEmail?: string | null;
  secondaryPhone?: string | null;
  address?: Address | null;
  estimatedValue?: number | null;
  probability?: number;
  expectedCloseDate?: string | null;
  notes?: string | null;
  lostReason?: string | null;
  assignedToUserId?: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
