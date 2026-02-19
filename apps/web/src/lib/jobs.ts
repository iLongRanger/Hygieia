import api from './api';
import type { Pagination, PaginatedResponse } from '../types/crm';
import type {
  Job,
  JobDetail,
  JobTask,
  JobNote,
  JobActivity,
  CreateJobInput,
  UpdateJobInput,
  GenerateJobsInput,
  CreateJobTaskInput,
  CreateJobNoteInput,
} from '../types/job';

export interface JobListParams {
  contractId?: string;
  facilityId?: string;
  accountId?: string;
  assignedTeamId?: string;
  assignedToUserId?: string;
  jobType?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export async function listJobs(
  params: JobListParams = {}
): Promise<PaginatedResponse<Job>> {
  const response = await api.get('/jobs', { params });
  return response.data;
}

export async function getJob(id: string): Promise<JobDetail> {
  const response = await api.get(`/jobs/${id}`);
  return response.data.data;
}

export async function createJob(input: CreateJobInput): Promise<Job> {
  const response = await api.post('/jobs', input);
  return response.data.data;
}

export async function updateJob(id: string, input: UpdateJobInput): Promise<Job> {
  const response = await api.patch(`/jobs/${id}`, input);
  return response.data.data;
}

export async function startJob(id: string): Promise<Job> {
  const response = await api.post(`/jobs/${id}/start`);
  return response.data.data;
}

export async function completeJob(
  id: string,
  input: { completionNotes?: string | null; actualHours?: number | null } = {}
): Promise<Job> {
  const response = await api.post(`/jobs/${id}/complete`, input);
  return response.data.data;
}

export async function cancelJob(
  id: string,
  reason?: string | null
): Promise<Job> {
  const response = await api.post(`/jobs/${id}/cancel`, { reason });
  return response.data.data;
}

export async function assignJob(
  id: string,
  assignedTeamId?: string | null,
  assignedToUserId?: string | null
): Promise<Job> {
  const response = await api.post(`/jobs/${id}/assign`, {
    assignedTeamId,
    assignedToUserId,
  });
  return response.data.data;
}

export async function generateJobs(
  input: GenerateJobsInput
): Promise<{ created: number; jobs?: { id: string; jobNumber: string; scheduledDate: string }[] }> {
  const response = await api.post('/jobs/generate', input);
  return response.data.data;
}

// Job Tasks
export async function createJobTask(
  jobId: string,
  input: CreateJobTaskInput
): Promise<JobTask> {
  const response = await api.post(`/jobs/${jobId}/tasks`, input);
  return response.data.data;
}

export async function updateJobTask(
  jobId: string,
  taskId: string,
  input: { status?: string; actualMinutes?: number | null; notes?: string | null }
): Promise<JobTask> {
  const response = await api.patch(`/jobs/${jobId}/tasks/${taskId}`, input);
  return response.data.data;
}

export async function deleteJobTask(
  jobId: string,
  taskId: string
): Promise<void> {
  await api.delete(`/jobs/${jobId}/tasks/${taskId}`);
}

// Job Notes
export async function createJobNote(
  jobId: string,
  input: CreateJobNoteInput
): Promise<JobNote> {
  const response = await api.post(`/jobs/${jobId}/notes`, input);
  return response.data.data;
}

export async function deleteJobNote(
  jobId: string,
  noteId: string
): Promise<void> {
  await api.delete(`/jobs/${jobId}/notes/${noteId}`);
}

// Job Activities
export async function listJobActivities(jobId: string): Promise<JobActivity[]> {
  const response = await api.get(`/jobs/${jobId}/activities`);
  return response.data.data;
}
