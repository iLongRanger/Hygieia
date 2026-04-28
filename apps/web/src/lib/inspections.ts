import api from './api';
import type { PaginatedResponse } from '../types/crm';
import type {
  Inspection,
  InspectionDetail,
  InspectionItem,
  InspectionTemplate,
  InspectionTemplateDetail,
  CreateInspectionInput,
  UpdateInspectionInput,
  CompleteInspectionInput,
  AddInspectionItemInput,
  UpdateInspectionItemInput,
  CreateInspectionCorrectiveActionInput,
  UpdateInspectionCorrectiveActionInput,
  CreateInspectionSignoffInput,
  CreateReinspectionInput,
  CreateInspectionTemplateInput,
  UpdateInspectionTemplateInput,
  InspectionActivity,
  InspectionCorrectiveAction,
  InspectionItemFeedback,
  InspectionSignoff,
} from '../types/inspection';

// ==================== Area Guidance ====================

export async function getAreaGuidance(
  areaNames: string[]
): Promise<Record<string, string[]>> {
  const response = await api.get('/area-types/guidance', {
    params: { names: areaNames.join(',') },
  });
  return response.data.data;
}

// ==================== Templates ====================

export interface InspectionTemplateListParams {
  facilityTypeFilter?: string;
  includeArchived?: boolean;
  page?: number;
  limit?: number;
}

export async function listInspectionTemplates(
  params: InspectionTemplateListParams = {}
): Promise<PaginatedResponse<InspectionTemplate>> {
  const response = await api.get('/inspection-templates', { params });
  return response.data;
}

export async function getInspectionTemplate(id: string): Promise<InspectionTemplateDetail> {
  const response = await api.get(`/inspection-templates/${id}`);
  return response.data.data;
}

export async function createInspectionTemplate(
  input: CreateInspectionTemplateInput
): Promise<InspectionTemplateDetail> {
  const response = await api.post('/inspection-templates', input);
  return response.data.data;
}

export async function updateInspectionTemplate(
  id: string,
  input: UpdateInspectionTemplateInput
): Promise<InspectionTemplateDetail> {
  const response = await api.patch(`/inspection-templates/${id}`, input);
  return response.data.data;
}

export async function archiveInspectionTemplate(id: string): Promise<void> {
  await api.post(`/inspection-templates/${id}/archive`);
}

export async function restoreInspectionTemplate(id: string): Promise<void> {
  await api.post(`/inspection-templates/${id}/restore`);
}

export async function getTemplateForContract(
  contractId: string
): Promise<{ id: string; name: string } | null> {
  const response = await api.get(`/inspection-templates/by-contract/${contractId}`);
  return response.data.data;
}

// ==================== Inspections ====================

export interface InspectionListParams {
  facilityId?: string;
  accountId?: string;
  contractId?: string;
  jobId?: string;
  inspectorUserId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  minScore?: number;
  maxScore?: number;
  page?: number;
  limit?: number;
}

export async function listInspections(
  params: InspectionListParams = {}
): Promise<PaginatedResponse<Inspection>> {
  const response = await api.get('/inspections', { params });
  return response.data;
}

export async function getInspection(id: string): Promise<InspectionDetail> {
  const response = await api.get(`/inspections/${id}`);
  return response.data.data;
}

export async function createInspection(
  input: CreateInspectionInput
): Promise<InspectionDetail> {
  const response = await api.post('/inspections', input);
  return response.data.data;
}

export async function updateInspection(
  id: string,
  input: UpdateInspectionInput
): Promise<InspectionDetail> {
  const response = await api.patch(`/inspections/${id}`, input);
  return response.data.data;
}

export async function startInspection(id: string): Promise<InspectionDetail> {
  const response = await api.post(`/inspections/${id}/start`);
  return response.data.data;
}

export async function completeInspection(
  id: string,
  input: CompleteInspectionInput
): Promise<InspectionDetail> {
  const response = await api.post(`/inspections/${id}/complete`, input);
  return response.data.data;
}

export async function cancelInspection(
  id: string,
  reason?: string
): Promise<InspectionDetail> {
  const response = await api.post(`/inspections/${id}/cancel`, { reason });
  return response.data.data;
}

export async function listInspectionActivities(
  inspectionId: string
): Promise<InspectionActivity[]> {
  const response = await api.get(`/inspections/${inspectionId}/activities`);
  return response.data.data;
}

export async function listInspectionCorrectiveActions(
  inspectionId: string
): Promise<InspectionCorrectiveAction[]> {
  const response = await api.get(`/inspections/${inspectionId}/actions`);
  return response.data.data;
}

export async function createInspectionCorrectiveAction(
  inspectionId: string,
  input: CreateInspectionCorrectiveActionInput
): Promise<InspectionCorrectiveAction> {
  const response = await api.post(`/inspections/${inspectionId}/actions`, input);
  return response.data.data;
}

export async function updateInspectionCorrectiveAction(
  inspectionId: string,
  actionId: string,
  input: UpdateInspectionCorrectiveActionInput
): Promise<InspectionCorrectiveAction> {
  const response = await api.patch(`/inspections/${inspectionId}/actions/${actionId}`, input);
  return response.data.data;
}

export async function verifyInspectionCorrectiveAction(
  inspectionId: string,
  actionId: string,
  notes?: string | null
): Promise<InspectionCorrectiveAction> {
  const response = await api.post(`/inspections/${inspectionId}/actions/${actionId}/verify`, { notes });
  return response.data.data;
}

export async function listInspectionSignoffs(
  inspectionId: string
): Promise<InspectionSignoff[]> {
  const response = await api.get(`/inspections/${inspectionId}/signoffs`);
  return response.data.data;
}

export async function createInspectionSignoff(
  inspectionId: string,
  input: CreateInspectionSignoffInput
): Promise<InspectionSignoff> {
  const response = await api.post(`/inspections/${inspectionId}/signoffs`, input);
  return response.data.data;
}

// ==================== Inspection Items ====================

export async function addInspectionItem(
  inspectionId: string,
  input: AddInspectionItemInput
): Promise<InspectionItem> {
  const response = await api.post(`/inspections/${inspectionId}/items`, input);
  return response.data.data;
}

export async function updateInspectionItem(
  inspectionId: string,
  itemId: string,
  input: UpdateInspectionItemInput
): Promise<InspectionItem> {
  const response = await api.patch(`/inspections/${inspectionId}/items/${itemId}`, input);
  return response.data.data;
}

export async function deleteInspectionItem(
  inspectionId: string,
  itemId: string
): Promise<void> {
  await api.delete(`/inspections/${inspectionId}/items/${itemId}`);
}

// ==================== Reinspection ====================

export async function createReinspection(
  inspectionId: string,
  input: CreateReinspectionInput = {}
): Promise<InspectionDetail> {
  const response = await api.post(`/inspections/${inspectionId}/reinspect`, input);
  return response.data.data;
}

// ==================== Item feedback ====================

export async function listInspectionItemFeedback(
  inspectionId: string,
  itemId: string
): Promise<InspectionItemFeedback[]> {
  const response = await api.get<{ data: InspectionItemFeedback[] }>(
    `/inspections/${inspectionId}/items/${itemId}/feedback`
  );
  return response.data.data;
}

export async function createInspectionItemFeedback(
  inspectionId: string,
  itemId: string,
  body: string
): Promise<InspectionItemFeedback> {
  const response = await api.post<{ data: InspectionItemFeedback }>(
    `/inspections/${inspectionId}/items/${itemId}/feedback`,
    { body }
  );
  return response.data.data;
}
