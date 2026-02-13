import api from './api';
import type { Notification } from '../types/crm';

export async function listNotifications(params?: {
  limit?: number;
  includeRead?: boolean;
}): Promise<Notification[]> {
  const response = await api.get('/notifications', { params });
  return response.data.data || [];
}

export async function markNotificationRead(id: string, read = true): Promise<Notification> {
  const response = await api.patch(`/notifications/${id}/read`, { read });
  return response.data.data;
}
