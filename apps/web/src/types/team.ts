export interface Team {
  id: string;
  name: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  createdByUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export interface ListTeamsParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  includeArchived?: boolean;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'isActive';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateTeamInput {
  name: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export interface UpdateTeamInput {
  name?: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  isActive?: boolean;
}
