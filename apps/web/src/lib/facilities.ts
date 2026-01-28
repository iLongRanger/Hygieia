import api from './api';
import type {
  Facility,
  CreateFacilityInput,
  UpdateFacilityInput,
  AreaType,
  CreateAreaTypeInput,
  UpdateAreaTypeInput,
  Area,
  CreateAreaInput,
  UpdateAreaInput,
  PaginatedResponse,
  Account,
  FacilityTask,
  CreateFacilityTaskInput,
  UpdateFacilityTaskInput,
  TaskTemplate,
  TasksGroupedByArea,
  TasksGroupedByFrequency,
  CleaningFrequency,
  FixtureType,
  AreaTemplate,
  CreateAreaTemplateInput,
  UpdateAreaTemplateInput,
} from '../types/facility';

export async function listFacilities(params?: {
  page?: number;
  limit?: number;
  accountId?: string;
  status?: string;
  buildingType?: string;
  search?: string;
  includeArchived?: boolean;
}): Promise<PaginatedResponse<Facility>> {
  const response = await api.get('/facilities', { params });
  return response.data;
}

export async function getFacility(id: string): Promise<Facility> {
  const response = await api.get(`/facilities/${id}`);
  return response.data.data;
}

export async function createFacility(
  data: CreateFacilityInput
): Promise<Facility> {
  const response = await api.post('/facilities', data);
  return response.data.data;
}

export async function updateFacility(
  id: string,
  data: UpdateFacilityInput
): Promise<Facility> {
  const response = await api.patch(`/facilities/${id}`, data);
  return response.data.data;
}

export async function archiveFacility(id: string): Promise<Facility> {
  const response = await api.post(`/facilities/${id}/archive`);
  return response.data.data;
}

export async function restoreFacility(id: string): Promise<Facility> {
  const response = await api.post(`/facilities/${id}/restore`);
  return response.data.data;
}

export async function deleteFacility(id: string): Promise<void> {
  await api.delete(`/facilities/${id}`);
}

export async function listAreaTypes(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedResponse<AreaType>> {
  const response = await api.get('/area-types', { params });
  return response.data;
}

// Fixture Types
export async function listFixtureTypes(params?: {
  page?: number;
  limit?: number;
  isActive?: boolean;
  search?: string;
}): Promise<PaginatedResponse<FixtureType>> {
  const response = await api.get('/fixture-types', { params });
  return response.data;
}

export async function createFixtureType(data: {
  name: string;
  description?: string | null;
  category?: 'fixture' | 'furniture';
  defaultMinutesPerItem?: number;
  isActive?: boolean;
}): Promise<FixtureType> {
  const response = await api.post('/fixture-types', data);
  return response.data.data;
}

export async function updateFixtureType(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    category?: 'fixture' | 'furniture';
    defaultMinutesPerItem?: number;
    isActive?: boolean;
  }
): Promise<FixtureType> {
  const response = await api.patch(`/fixture-types/${id}`, data);
  return response.data.data;
}

export async function deleteFixtureType(id: string): Promise<void> {
  await api.delete(`/fixture-types/${id}`);
}

// Area Templates
export async function listAreaTemplates(params?: {
  page?: number;
  limit?: number;
  areaTypeId?: string;
  search?: string;
}): Promise<PaginatedResponse<AreaTemplate>> {
  const response = await api.get('/area-templates', { params });
  return response.data;
}

export async function getAreaTemplateByAreaType(areaTypeId: string): Promise<AreaTemplate> {
  const response = await api.get(`/area-templates/area-type/${areaTypeId}`);
  return response.data.data;
}

export async function createAreaTemplate(data: CreateAreaTemplateInput): Promise<AreaTemplate> {
  const response = await api.post('/area-templates', data);
  return response.data.data;
}

export async function updateAreaTemplate(id: string, data: UpdateAreaTemplateInput): Promise<AreaTemplate> {
  const response = await api.patch(`/area-templates/${id}`, data);
  return response.data.data;
}

export async function deleteAreaTemplate(id: string): Promise<void> {
  await api.delete(`/area-templates/${id}`);
}

export async function getAreaType(id: string): Promise<AreaType> {
  const response = await api.get(`/area-types/${id}`);
  return response.data.data;
}

export async function createAreaType(
  data: CreateAreaTypeInput
): Promise<AreaType> {
  const response = await api.post('/area-types', data);
  return response.data.data;
}

export async function updateAreaType(
  id: string,
  data: UpdateAreaTypeInput
): Promise<AreaType> {
  const response = await api.patch(`/area-types/${id}`, data);
  return response.data.data;
}

export async function deleteAreaType(id: string): Promise<void> {
  await api.delete(`/area-types/${id}`);
}

export async function listAreas(params?: {
  page?: number;
  limit?: number;
  facilityId?: string;
  areaTypeId?: string;
  conditionLevel?: string;
  search?: string;
  includeArchived?: boolean;
}): Promise<PaginatedResponse<Area>> {
  const response = await api.get('/areas', { params });
  return response.data;
}

export async function getArea(id: string): Promise<Area> {
  const response = await api.get(`/areas/${id}`);
  return response.data.data;
}

export async function createArea(data: CreateAreaInput): Promise<Area> {
  const response = await api.post('/areas', data);
  return response.data.data;
}

export async function updateArea(
  id: string,
  data: UpdateAreaInput
): Promise<Area> {
  const response = await api.patch(`/areas/${id}`, data);
  return response.data.data;
}

export async function archiveArea(id: string): Promise<Area> {
  const response = await api.post(`/areas/${id}/archive`);
  return response.data.data;
}

export async function restoreArea(id: string): Promise<Area> {
  const response = await api.post(`/areas/${id}/restore`);
  return response.data.data;
}

export async function deleteArea(id: string): Promise<void> {
  await api.delete(`/areas/${id}`);
}

export async function listAccounts(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedResponse<Account>> {
  const response = await api.get('/accounts', { params });
  return response.data;
}

// Facility Tasks
export async function listFacilityTasks(params?: {
  page?: number;
  limit?: number;
  facilityId?: string;
  areaId?: string;
  taskTemplateId?: string;
  cleaningFrequency?: CleaningFrequency;
  isRequired?: boolean;
  priority?: number;
  search?: string;
  includeArchived?: boolean;
}): Promise<PaginatedResponse<FacilityTask>> {
  const response = await api.get('/facility-tasks', { params });
  return response.data;
}

export async function getFacilityTask(id: string): Promise<FacilityTask> {
  const response = await api.get(`/facility-tasks/${id}`);
  return response.data.data;
}

export async function createFacilityTask(
  data: CreateFacilityTaskInput
): Promise<FacilityTask> {
  const response = await api.post('/facility-tasks', data);
  return response.data.data;
}

export async function updateFacilityTask(
  id: string,
  data: UpdateFacilityTaskInput
): Promise<FacilityTask> {
  const response = await api.patch(`/facility-tasks/${id}`, data);
  return response.data.data;
}

export async function archiveFacilityTask(id: string): Promise<FacilityTask> {
  const response = await api.post(`/facility-tasks/${id}/archive`);
  return response.data.data;
}

export async function restoreFacilityTask(id: string): Promise<FacilityTask> {
  const response = await api.post(`/facility-tasks/${id}/restore`);
  return response.data.data;
}

export async function deleteFacilityTask(id: string): Promise<void> {
  await api.delete(`/facility-tasks/${id}`);
}

export async function bulkCreateFacilityTasks(
  facilityId: string,
  taskTemplateIds: string[],
  areaId?: string | null,
  cleaningFrequency?: string
): Promise<{ count: number }> {
  const response = await api.post('/facility-tasks/bulk', {
    facilityId,
    taskTemplateIds,
    areaId,
    cleaningFrequency,
  });
  return response.data.data;
}

// Get tasks grouped by area and frequency for a facility
export async function getFacilityTasksGrouped(facilityId: string): Promise<{
  byArea: TasksGroupedByArea;
  byFrequency: TasksGroupedByFrequency;
}> {
  const response = await api.get(`/facilities/${facilityId}/tasks-grouped`);
  return response.data.data;
}

// Task Templates
export async function listTaskTemplates(params?: {
  page?: number;
  limit?: number;
  cleaningType?: string;
  areaTypeId?: string;
  facilityId?: string;
  isGlobal?: boolean;
  isActive?: boolean;
  search?: string;
  includeArchived?: boolean;
}): Promise<PaginatedResponse<TaskTemplate>> {
  const response = await api.get('/task-templates', { params });
  return response.data;
}

export async function getTaskTemplate(id: string): Promise<TaskTemplate> {
  const response = await api.get(`/task-templates/${id}`);
  return response.data.data;
}
