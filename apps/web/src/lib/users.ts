import api from './api';
import type {
  User,
  Role,
  CreateUserInput,
  UpdateUserInput,
  PaginatedResponse,
} from '../types/user';

export async function listUsers(params?: {
  page?: number;
  limit?: number;
  status?: string;
  roleKey?: string;
  search?: string;
}): Promise<PaginatedResponse<User>> {
  const response = await api.get('/users', { params });
  return response.data;
}

export async function getUser(id: string): Promise<User> {
  const response = await api.get(`/users/${id}`);
  return response.data.data;
}

export async function createUser(data: CreateUserInput): Promise<User> {
  const response = await api.post('/users', data);
  return response.data.data;
}

export async function updateUser(
  id: string,
  data: UpdateUserInput
): Promise<User> {
  const response = await api.patch(`/users/${id}`, data);
  return response.data.data;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}

export async function assignRole(
  userId: string,
  role: string
): Promise<User> {
  const response = await api.post(`/users/${userId}/roles`, { role });
  return response.data.data;
}

export async function removeRole(
  userId: string,
  roleKey: string
): Promise<User> {
  const response = await api.delete(`/users/${userId}/roles/${roleKey}`);
  return response.data.data;
}

export async function listRoles(): Promise<{ data: Role[] }> {
  const response = await api.get('/users/roles');
  return response.data;
}
