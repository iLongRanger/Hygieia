import api from './api';
import type {
  ProposalTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
} from '../types/proposalTemplate';

export async function listTemplates(includeArchived = false): Promise<ProposalTemplate[]> {
  const response = await api.get('/proposal-templates', {
    params: includeArchived ? { includeArchived: 'true' } : {},
  });
  return response.data.data;
}

export async function getTemplate(id: string): Promise<ProposalTemplate> {
  const response = await api.get(`/proposal-templates/${id}`);
  return response.data.data;
}

export async function getDefaultTemplate(): Promise<ProposalTemplate | null> {
  const response = await api.get('/proposal-templates/default');
  return response.data.data;
}

export async function createTemplate(data: CreateTemplateInput): Promise<ProposalTemplate> {
  const response = await api.post('/proposal-templates', data);
  return response.data.data;
}

export async function updateTemplate(
  id: string,
  data: UpdateTemplateInput
): Promise<ProposalTemplate> {
  const response = await api.patch(`/proposal-templates/${id}`, data);
  return response.data.data;
}

export async function archiveTemplate(id: string): Promise<ProposalTemplate> {
  const response = await api.post(`/proposal-templates/${id}/archive`);
  return response.data.data;
}

export async function restoreTemplate(id: string): Promise<ProposalTemplate> {
  const response = await api.post(`/proposal-templates/${id}/restore`);
  return response.data.data;
}

export async function deleteTemplate(id: string): Promise<void> {
  await api.delete(`/proposal-templates/${id}`);
}
