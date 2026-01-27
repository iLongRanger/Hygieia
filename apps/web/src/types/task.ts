export interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
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

export interface FacilityTask {
  id: string;
  customName: string | null;
  customInstructions: string | null;
  estimatedMinutes: number | null;
  baseMinutesOverride: string | null;
  perSqftMinutesOverride: string | null;
  perUnitMinutesOverride: string | null;
  perRoomMinutesOverride: string | null;
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
    baseMinutes: string;
    perSqftMinutes: string;
    perUnitMinutes: string;
    perRoomMinutes: string;
    difficultyLevel: number;
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
}

export interface CreateFacilityTaskInput {
  facilityId: string;
  areaId?: string | null;
  taskTemplateId?: string | null;
  customName?: string | null;
  customInstructions?: string | null;
  estimatedMinutes?: number | null;
  baseMinutesOverride?: number | null;
  perSqftMinutesOverride?: number | null;
  perUnitMinutesOverride?: number | null;
  perRoomMinutesOverride?: number | null;
  isRequired?: boolean;
  cleaningFrequency?: string;
  conditionMultiplier?: number;
  priority?: number;
  fixtureMinutes?: { fixtureTypeId: string; minutesPerFixture: number }[];
}

export interface UpdateFacilityTaskInput {
  areaId?: string | null;
  taskTemplateId?: string | null;
  customName?: string | null;
  customInstructions?: string | null;
  estimatedMinutes?: number | null;
  baseMinutesOverride?: number | null;
  perSqftMinutesOverride?: number | null;
  perUnitMinutesOverride?: number | null;
  perRoomMinutesOverride?: number | null;
  isRequired?: boolean;
  cleaningFrequency?: string;
  conditionMultiplier?: number;
  priority?: number;
  fixtureMinutes?: { fixtureTypeId: string; minutesPerFixture: number }[];
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
