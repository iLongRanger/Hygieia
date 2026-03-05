import api from './api';
import type { PaginatedResponse } from '../types/crm';
import type { Expense, ExpenseDetail, ExpenseCategory, CreateExpenseInput, UpdateExpenseInput } from '../types/expense';

export interface ExpenseListParams {
  categoryId?: string;
  jobId?: string;
  contractId?: string;
  facilityId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export async function listExpenses(params: ExpenseListParams = {}): Promise<PaginatedResponse<Expense>> {
  const response = await api.get('/expenses', { params });
  return response.data;
}

export async function getExpense(id: string): Promise<ExpenseDetail> {
  const response = await api.get(`/expenses/${id}`);
  return response.data.data;
}

export async function createExpense(input: CreateExpenseInput): Promise<ExpenseDetail> {
  const response = await api.post('/expenses', input);
  return response.data.data;
}

export async function updateExpense(id: string, input: UpdateExpenseInput): Promise<ExpenseDetail> {
  const response = await api.patch(`/expenses/${id}`, input);
  return response.data.data;
}

export async function deleteExpense(id: string): Promise<void> {
  await api.delete(`/expenses/${id}`);
}

export async function approveExpense(id: string): Promise<ExpenseDetail> {
  const response = await api.post(`/expenses/${id}/approve`);
  return response.data.data;
}

export async function rejectExpense(id: string, notes?: string): Promise<ExpenseDetail> {
  const response = await api.post(`/expenses/${id}/reject`, { notes });
  return response.data.data;
}

export async function listExpenseCategories(includeInactive = false): Promise<ExpenseCategory[]> {
  const params = includeInactive ? { includeInactive: 'true' } : {};
  const response = await api.get('/expenses/categories', { params });
  return response.data.data;
}

export async function createExpenseCategory(input: { name: string; description?: string | null; sortOrder?: number }): Promise<ExpenseCategory> {
  const response = await api.post('/expenses/categories', input);
  return response.data.data;
}

export async function updateExpenseCategory(id: string, input: { name?: string; description?: string | null; isActive?: boolean; sortOrder?: number }): Promise<ExpenseCategory> {
  const response = await api.patch(`/expenses/categories/${id}`, input);
  return response.data.data;
}
