export type TaskTemplateScope = 'residential' | 'commercial' | 'both';

export interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  scope?: TaskTemplateScope;
  cleaningType: string;
  estimatedMinutes: number;
  baseMinutes: string;
  perSqftMinutes: string;
  perUnitMinutes: string;
  perRoomMinutes: string;
  difficultyLevel: number;
  requiredEquipment: string[];
  requiredSupplies: string[];
  instructions: string | null;
  isGlobal: boolean;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  areaType: {
    id: string;
    name: string;
  } | null;
  facility: {
    id: string;
    name: string;
    accountId: string;
  } | null;
  createdByUser: {
    id: string;
    fullName: string;
  };
  fixtureMinutes: {
    id: string;
    minutesPerFixture: string;
    fixtureType: {
      id: string;
      name: string;
    };
  }[];
  _count: {
    facilityTasks: number;
  };
}

export interface CreateTaskTemplateInput {
  name: string;
  description?: string | null;
  scope?: TaskTemplateScope;
  cleaningType: string;
  areaTypeId?: string | null;
  estimatedMinutes: number;
  baseMinutes?: number;
  perSqftMinutes?: number;
  perUnitMinutes?: number;
  perRoomMinutes?: number;
  difficultyLevel?: number;
  requiredEquipment?: string[];
  requiredSupplies?: string[];
  instructions?: string | null;
  isGlobal?: boolean;
  facilityId?: string | null;
  isActive?: boolean;
  fixtureMinutes?: { fixtureTypeId: string; minutesPerFixture: number }[];
}

export interface UpdateTaskTemplateInput {
  name?: string;
  description?: string | null;
  scope?: TaskTemplateScope;
  cleaningType?: string;
  areaTypeId?: string | null;
  estimatedMinutes?: number;
  baseMinutes?: number;
  perSqftMinutes?: number;
  perUnitMinutes?: number;
  perRoomMinutes?: number;
  difficultyLevel?: number;
  requiredEquipment?: string[];
  requiredSupplies?: string[];
  instructions?: string | null;
  isGlobal?: boolean;
  facilityId?: string | null;
  isActive?: boolean;
  fixtureMinutes?: { fixtureTypeId: string; minutesPerFixture: number }[];
}

export type { FacilityTask, CreateFacilityTaskInput, UpdateFacilityTaskInput } from './facility';

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
