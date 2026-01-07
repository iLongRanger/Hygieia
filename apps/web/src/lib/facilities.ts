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
