import api from './api';
import type { Appointment, AppointmentType, AppointmentStatus } from '../types/crm';

export interface ListAppointmentsParams {
  leadId?: string;
  assignedToUserId?: string;
  type?: AppointmentType;
  status?: AppointmentStatus;
  dateFrom?: string;
  dateTo?: string;
  includePast?: boolean;
}

export interface CreateAppointmentInput {
  leadId: string;
  assignedToUserId: string;
  type?: AppointmentType;
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  location?: string | null;
  notes?: string | null;
}

export interface UpdateAppointmentInput {
  assignedToUserId?: string;
  status?: AppointmentStatus;
  scheduledStart?: string;
  scheduledEnd?: string;
  timezone?: string;
  location?: string | null;
  notes?: string | null;
}

export interface RescheduleAppointmentInput {
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  location?: string | null;
  notes?: string | null;
}

export interface CompleteAppointmentInput {
  facilityId: string;
  notes?: string | null;
}

export async function listAppointments(params?: ListAppointmentsParams): Promise<Appointment[]> {
  const response = await api.get('/appointments', { params });
  return response.data.data || [];
}

export async function getAppointment(id: string): Promise<Appointment> {
  const response = await api.get(`/appointments/${id}`);
  return response.data.data;
}

export async function createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
  const response = await api.post('/appointments', input);
  return response.data.data;
}

export async function updateAppointment(id: string, input: UpdateAppointmentInput): Promise<Appointment> {
  const response = await api.patch(`/appointments/${id}`, input);
  return response.data.data;
}

export async function deleteAppointment(id: string): Promise<void> {
  await api.delete(`/appointments/${id}`);
}

export async function rescheduleAppointment(id: string, input: RescheduleAppointmentInput): Promise<Appointment> {
  const response = await api.post(`/appointments/${id}/reschedule`, input);
  return response.data.data;
}

export async function completeAppointment(id: string, input: CompleteAppointmentInput): Promise<Appointment> {
  const response = await api.post(`/appointments/${id}/complete`, input);
  return response.data.data;
}
