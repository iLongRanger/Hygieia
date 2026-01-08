import api from './api';
import type {
  TaskTemplate,
  CreateTaskTemplateInput,
  UpdateTaskTemplateInput,
  FacilityTask,
  CreateFacilityTaskInput,
  UpdateFacilityTaskInput,
  PaginatedResponse,
} from '../types/task';

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

export async function createTaskTemplate(
  data: CreateTaskTemplateInput
): Promise<TaskTemplate> {
  const response = await api.post('/task-templates', data);
  return response.data.data;
}

export async function updateTaskTemplate(
  id: string,
  data: UpdateTaskTemplateInput
): Promise<TaskTemplate> {
  const response = await api.patch(`/task-templates/${id}`, data);
  return response.data.data;
}

export async function archiveTaskTemplate(id: string): Promise<TaskTemplate> {
  const response = await api.post(`/task-templates/${id}/archive`);
  return response.data.data;
}

export async function restoreTaskTemplate(id: string): Promise<TaskTemplate> {
  const response = await api.post(`/task-templates/${id}/restore`);
  return response.data.data;
}

export async function deleteTaskTemplate(id: string): Promise<void> {
  await api.delete(`/task-templates/${id}`);
}

export async function listFacilityTasks(params?: {
  page?: number;
  limit?: number;
  facilityId?: string;
  areaId?: string;
  taskTemplateId?: string;
  cleaningFrequency?: string;
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

export async function bulkCreateFacilityTasks(
  facilityId: string,
  taskTemplateIds: string[]
): Promise<{ count: number }> {
  const response = await api.post('/facility-tasks/bulk', {
    facilityId,
    taskTemplateIds,
  });
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
