export interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  cleaningType: string;
  estimatedMinutes: number;
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
  _count: {
    facilityTasks: number;
  };
}

export interface CreateTaskTemplateInput {
  name: string;
  description?: string | null;
  cleaningType: string;
  areaTypeId?: string | null;
  estimatedMinutes: number;
  difficultyLevel?: number;
  requiredEquipment?: string[];
  requiredSupplies?: string[];
  instructions?: string | null;
  isGlobal?: boolean;
  facilityId?: string | null;
  isActive?: boolean;
}

export interface UpdateTaskTemplateInput {
  name?: string;
  description?: string | null;
  cleaningType?: string;
  areaTypeId?: string | null;
  estimatedMinutes?: number;
  difficultyLevel?: number;
  requiredEquipment?: string[];
  requiredSupplies?: string[];
  instructions?: string | null;
  isGlobal?: boolean;
  facilityId?: string | null;
  isActive?: boolean;
}

export interface FacilityTask {
  id: string;
  customName: string | null;
  customInstructions: string | null;
  estimatedMinutes: number | null;
  isRequired: boolean;
  cleaningFrequency: string;
  conditionMultiplier: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  facility: {
    id: string;
    name: string;
    accountId: string;
  };
  area: {
    id: string;
    name: string | null;
    areaType: {
      id: string;
      name: string;
    };
  } | null;
  taskTemplate: {
    id: string;
    name: string;
    cleaningType: string;
    estimatedMinutes: number;
    difficultyLevel: number;
  } | null;
  createdByUser: {
    id: string;
    fullName: string;
  };
}

export interface CreateFacilityTaskInput {
  facilityId: string;
  areaId?: string | null;
  taskTemplateId?: string | null;
  customName?: string | null;
  customInstructions?: string | null;
  estimatedMinutes?: number | null;
  isRequired?: boolean;
  cleaningFrequency?: string;
  conditionMultiplier?: number;
  priority?: number;
}

export interface UpdateFacilityTaskInput {
  areaId?: string | null;
  taskTemplateId?: string | null;
  customName?: string | null;
  customInstructions?: string | null;
  estimatedMinutes?: number | null;
  isRequired?: boolean;
  cleaningFrequency?: string;
  conditionMultiplier?: number;
  priority?: number;
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
