import api from './api';
import type {
  Account,
  AccountActivity,
  CreateAccountInput,
  CreateAccountActivityInput,
  UpdateAccountInput,
  PaginatedResponse,
} from '../types/crm';

export async function listAccounts(params?: {
  page?: number;
  limit?: number;
  type?: string;
  accountManagerId?: string;
  search?: string;
  includeArchived?: boolean;
}): Promise<PaginatedResponse<Account>> {
  const response = await api.get('/accounts', { params });
  return response.data;
}

export async function getAccount(id: string): Promise<Account> {
  const response = await api.get(`/accounts/${id}`);
  return response.data.data;
}

export async function createAccount(data: CreateAccountInput): Promise<Account> {
  const response = await api.post('/accounts', data);
  return response.data.data;
}

export async function updateAccount(
  id: string,
  data: UpdateAccountInput
): Promise<Account> {
  const response = await api.patch(`/accounts/${id}`, data);
  return response.data.data;
}

export async function archiveAccount(id: string): Promise<Account> {
  const response = await api.post(`/accounts/${id}/archive`);
  return response.data.data;
}

export async function restoreAccount(id: string): Promise<Account> {
  const response = await api.post(`/accounts/${id}/restore`);
  return response.data.data;
}

export async function deleteAccount(id: string): Promise<void> {
  await api.delete(`/accounts/${id}`);
}

export async function listAccountActivities(
  accountId: string,
  params?: { page?: number; limit?: number }
): Promise<PaginatedResponse<AccountActivity>> {
  const response = await api.get(`/accounts/${accountId}/activities`, { params });
  return response.data;
}

export async function createAccountActivity(
  accountId: string,
  data: CreateAccountActivityInput
): Promise<AccountActivity> {
  const response = await api.post(`/accounts/${accountId}/activities`, data);
  return response.data.data;
}
