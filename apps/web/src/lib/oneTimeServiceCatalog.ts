import api from './api';
import type {
  CreateOneTimeServiceCatalogItemInput,
  OneTimeServiceCatalogItem,
  UpdateOneTimeServiceCatalogItemInput,
} from '../types/oneTimeServiceCatalog';

export async function listOneTimeServiceCatalog(params?: {
  includeInactive?: boolean;
  serviceType?: 'window_cleaning' | 'carpet_cleaning' | 'custom';
}): Promise<OneTimeServiceCatalogItem[]> {
  const response = await api.get('/one-time-service-catalog', { params });
  return response.data.data;
}

export async function createOneTimeServiceCatalogItem(
  data: CreateOneTimeServiceCatalogItemInput
): Promise<OneTimeServiceCatalogItem> {
  const response = await api.post('/one-time-service-catalog', data);
  return response.data.data;
}

export async function updateOneTimeServiceCatalogItem(
  id: string,
  data: UpdateOneTimeServiceCatalogItemInput
): Promise<OneTimeServiceCatalogItem> {
  const response = await api.put(`/one-time-service-catalog/${id}`, data);
  return response.data.data;
}

export async function deleteOneTimeServiceCatalogItem(id: string): Promise<void> {
  await api.delete(`/one-time-service-catalog/${id}`);
}
