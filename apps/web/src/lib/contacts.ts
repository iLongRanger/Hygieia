import api from './api';
import type {
  Contact,
  CreateContactInput,
  UpdateContactInput,
  PaginatedResponse,
} from '../types/crm';

export async function listContacts(params?: {
  page?: number;
  limit?: number;
  accountId?: string;
  isPrimary?: boolean;
  isBilling?: boolean;
  search?: string;
  includeArchived?: boolean;
}): Promise<PaginatedResponse<Contact>> {
  const response = await api.get('/contacts', { params });
  return response.data;
}

export async function getContact(id: string): Promise<Contact> {
  const response = await api.get(`/contacts/${id}`);
  return response.data.data;
}

export async function createContact(data: CreateContactInput): Promise<Contact> {
  const response = await api.post('/contacts', data);
  return response.data.data;
}

export async function updateContact(
  id: string,
  data: UpdateContactInput
): Promise<Contact> {
  const response = await api.patch(`/contacts/${id}`, data);
  return response.data.data;
}

export async function archiveContact(id: string): Promise<Contact> {
  const response = await api.post(`/contacts/${id}/archive`);
  return response.data.data;
}

export async function restoreContact(id: string): Promise<Contact> {
  const response = await api.post(`/contacts/${id}/restore`);
  return response.data.data;
}

export async function deleteContact(id: string): Promise<void> {
  await api.delete(`/contacts/${id}`);
}
