export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface Facility {
  id: string;
  name: string;
  address: Address;
  squareFeet: string | null;
  buildingType: string | null;
  accessInstructions: string | null;
  parkingInfo: string | null;
  specialRequirements: string | null;
  status: 'active' | 'inactive' | 'pending';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  account: {
    id: string;
    name: string;
    type: string;
  };
  facilityManager: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  createdByUser: {
    id: string;
    fullName: string;
  };
  _count: {
    areas: number;
    facilityTasks: number;
  };
}

export interface CreateFacilityInput {
  accountId: string;
  name: string;
  address: Address;
  squareFeet?: number | null;
  buildingType?: string | null;
  accessInstructions?: string | null;
  parkingInfo?: string | null;
  specialRequirements?: string | null;
  status?: 'active' | 'inactive' | 'pending';
  notes?: string | null;
}

export interface UpdateFacilityInput {
  name?: string;
  address?: Address;
  squareFeet?: number | null;
  buildingType?: string | null;
  accessInstructions?: string | null;
  parkingInfo?: string | null;
  specialRequirements?: string | null;
  status?: 'active' | 'inactive' | 'pending';
  notes?: string | null;
}

export interface AreaType {
  id: string;
  name: string;
  description: string | null;
  defaultSquareFeet: string | null;
  baseCleaningTimeMinutes: number | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    areas: number;
    taskTemplates: number;
    pricingRules: number;
  };
}

export interface CreateAreaTypeInput {
  name: string;
  description?: string | null;
  defaultSquareFeet?: number | null;
  baseCleaningTimeMinutes?: number | null;
}

export interface UpdateAreaTypeInput {
  name?: string;
  description?: string | null;
  defaultSquareFeet?: number | null;
  baseCleaningTimeMinutes?: number | null;
}

export interface Area {
  id: string;
  name: string | null;
  quantity: number;
  squareFeet: string | null;
  conditionLevel: 'excellent' | 'good' | 'fair' | 'poor';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  facility: {
    id: string;
    name: string;
    accountId: string;
  };
  areaType: {
    id: string;
    name: string;
    defaultSquareFeet: string | null;
    baseCleaningTimeMinutes: number | null;
  };
  createdByUser: {
    id: string;
    fullName: string;
  };
  _count: {
    facilityTasks: number;
  };
}

export interface CreateAreaInput {
  facilityId: string;
  areaTypeId: string;
  name?: string | null;
  quantity?: number;
  squareFeet?: number | null;
  conditionLevel?: 'excellent' | 'good' | 'fair' | 'poor';
  notes?: string | null;
}

export interface UpdateAreaInput {
  areaTypeId?: string;
  name?: string | null;
  quantity?: number;
  squareFeet?: number | null;
  conditionLevel?: 'excellent' | 'good' | 'fair' | 'poor';
  notes?: string | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface Account {
  id: string;
  name: string;
  type: string;
}
