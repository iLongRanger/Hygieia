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

export type FloorType = 'vct' | 'carpet' | 'hardwood' | 'tile' | 'concrete' | 'epoxy';
export type ConditionLevel = 'standard' | 'medium' | 'hard';
export type TrafficLevel = 'low' | 'medium' | 'high';

export interface FixtureType {
  id: string;
  name: string;
  description: string | null;
  category: 'fixture' | 'furniture';
  defaultMinutesPerItem: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AreaFixture {
  id: string;
  count: number;
  minutesPerItem: string;
  fixtureType: {
    id: string;
    name: string;
    category: 'fixture' | 'furniture';
  };
}

export interface Area {
  id: string;
  name: string | null;
  quantity: number;
  squareFeet: string | null;
  floorType: FloorType;
  conditionLevel: ConditionLevel;
  roomCount: number;
  unitCount: number;
  trafficLevel: TrafficLevel;
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
  fixtures: AreaFixture[];
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
  floorType?: FloorType;
  conditionLevel?: ConditionLevel;
  roomCount?: number;
  unitCount?: number;
  trafficLevel?: TrafficLevel;
  notes?: string | null;
  fixtures?: { fixtureTypeId: string; count: number; minutesPerItem?: number }[];
  // Template auto-apply options
  applyTemplate?: boolean;
  excludeTaskTemplateIds?: string[];
}

export interface UpdateAreaInput {
  areaTypeId?: string;
  name?: string | null;
  quantity?: number;
  squareFeet?: number | null;
  floorType?: FloorType;
  conditionLevel?: ConditionLevel;
  roomCount?: number;
  unitCount?: number;
  trafficLevel?: TrafficLevel;
  notes?: string | null;
  fixtures?: { fixtureTypeId: string; count: number; minutesPerItem?: number }[];
}

export interface AreaTemplate {
  id: string;
  name: string | null;
  defaultSquareFeet: string | null;
  createdAt: string;
  updatedAt: string;
  areaType: {
    id: string;
    name: string;
    defaultSquareFeet: string | null;
  };
  items: {
    id: string;
    defaultCount: number;
    minutesPerItem: string;
    sortOrder: number;
    fixtureType: FixtureType;
  }[];
  tasks: {
    id: string;
    sortOrder: number;
    name: string | null;
    baseMinutes: string | null;
    perSqftMinutes: string | null;
    perUnitMinutes: string | null;
    perRoomMinutes: string | null;
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
  }[];
  createdByUser: {
    id: string;
    fullName: string;
  };
}

export interface CreateAreaTemplateInput {
  areaTypeId: string;
  name?: string | null;
  defaultSquareFeet?: number | null;
  items?: { fixtureTypeId: string; defaultCount: number; minutesPerItem: number; sortOrder?: number }[];
  taskTemplateIds?: string[];
  taskTemplates?: { id: string; sortOrder?: number }[];
}

export interface UpdateAreaTemplateInput {
  areaTypeId?: string;
  name?: string | null;
  defaultSquareFeet?: number | null;
  items?: { fixtureTypeId: string; defaultCount: number; minutesPerItem: number; sortOrder?: number }[];
  taskTemplateIds?: string[];
  taskTemplates?: { id: string; sortOrder?: number }[];
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

// Task-related types
export type CleaningFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual' | 'as_needed';

export interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  cleaningType: string;
  estimatedMinutes: number | null;
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
  cleaningFrequency: CleaningFrequency;
  conditionMultiplier: number;
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
    estimatedMinutes: number | null;
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
  cleaningFrequency?: CleaningFrequency;
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
  cleaningFrequency?: CleaningFrequency;
  conditionMultiplier?: number;
  priority?: number;
  fixtureMinutes?: { fixtureTypeId: string; minutesPerFixture: number }[];
}

export interface TasksGroupedByArea {
  [areaId: string]: {
    areaName: string;
    tasks: { name: string; frequency: string }[];
  };
}

export interface TasksGroupedByFrequency {
  [frequency: string]: { name: string; areaName: string }[];
}
