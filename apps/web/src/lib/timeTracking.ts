import api from './api';
import type { PaginatedResponse } from '../types/crm';
import type {
  TimeEntry,
  Timesheet,
  TimesheetDetail,
  TimeSummary,
  ClockInInput,
  ManualEntryInput,
  EditTimeEntryInput,
  GenerateTimesheetInput,
} from '../types/timeTracking';

// ==================== Time Entries ====================

export interface TimeEntryListParams {
  userId?: string;
  jobId?: string;
  contractId?: string;
  facilityId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export async function listTimeEntries(
  params: TimeEntryListParams = {}
): Promise<PaginatedResponse<TimeEntry>> {
  const response = await api.get('/time-tracking/entries', { params });
  return response.data;
}

export async function getTimeEntry(id: string): Promise<TimeEntry> {
  const response = await api.get(`/time-tracking/entries/${id}`);
  return response.data.data;
}

export async function getActiveEntry(): Promise<TimeEntry | null> {
  const response = await api.get('/time-tracking/active');
  return response.data.data;
}

export async function clockIn(input: ClockInInput = {}): Promise<TimeEntry> {
  const response = await api.post('/time-tracking/clock-in', input);
  return response.data.data;
}

export async function clockOut(notes?: string): Promise<TimeEntry> {
  const response = await api.post('/time-tracking/clock-out', { notes });
  return response.data.data;
}

export async function startBreak(): Promise<TimeEntry> {
  const response = await api.post('/time-tracking/break/start');
  return response.data.data;
}

export async function endBreak(): Promise<TimeEntry> {
  const response = await api.post('/time-tracking/break/end');
  return response.data.data;
}

export async function createManualEntry(input: ManualEntryInput): Promise<TimeEntry> {
  const response = await api.post('/time-tracking/entries/manual', input);
  return response.data.data;
}

export async function editTimeEntry(id: string, input: EditTimeEntryInput): Promise<TimeEntry> {
  const response = await api.patch(`/time-tracking/entries/${id}`, input);
  return response.data.data;
}

export async function approveTimeEntry(id: string): Promise<TimeEntry> {
  const response = await api.post(`/time-tracking/entries/${id}/approve`);
  return response.data.data;
}

export async function deleteTimeEntry(id: string): Promise<void> {
  await api.delete(`/time-tracking/entries/${id}`);
}

export async function getUserTimeSummary(
  userId: string,
  dateFrom: string,
  dateTo: string
): Promise<TimeSummary> {
  const response = await api.get(`/time-tracking/summary/${userId}`, {
    params: { dateFrom, dateTo },
  });
  return response.data.data;
}

// ==================== Timesheets ====================

export interface TimesheetListParams {
  userId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export async function listTimesheets(
  params: TimesheetListParams = {}
): Promise<PaginatedResponse<Timesheet>> {
  const response = await api.get('/time-tracking/timesheets', { params });
  return response.data;
}

export async function getTimesheet(id: string): Promise<TimesheetDetail> {
  const response = await api.get(`/time-tracking/timesheets/${id}`);
  return response.data.data;
}

export async function generateTimesheet(input: GenerateTimesheetInput): Promise<TimesheetDetail> {
  const response = await api.post('/time-tracking/timesheets/generate', input);
  return response.data.data;
}

export async function submitTimesheet(id: string): Promise<TimesheetDetail> {
  const response = await api.post(`/time-tracking/timesheets/${id}/submit`);
  return response.data.data;
}

export async function approveTimesheet(id: string): Promise<TimesheetDetail> {
  const response = await api.post(`/time-tracking/timesheets/${id}/approve`);
  return response.data.data;
}

export async function rejectTimesheet(id: string, notes?: string): Promise<TimesheetDetail> {
  const response = await api.post(`/time-tracking/timesheets/${id}/reject`, { notes });
  return response.data.data;
}

export async function deleteTimesheet(id: string): Promise<void> {
  await api.delete(`/time-tracking/timesheets/${id}`);
}
