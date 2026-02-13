import api from './api';
import type { Notification, PaginatedResponse } from '../types/crm';

export interface NotificationListParams {
  page?: number;
  limit?: number;
  includeRead?: boolean;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function listNotifications(params?: NotificationListParams): Promise<PaginatedResponse<Notification>> {
  const response = await api.get('/notifications', { params });
  return response.data;
}

export async function getUnreadCount(): Promise<number> {
  const response = await api.get('/notifications/unread-count');
  return response.data.data.count;
}

export async function markNotificationRead(id: string, read = true): Promise<Notification> {
  const response = await api.patch(`/notifications/${id}/read`, { read });
  return response.data.data;
}

export async function markAllNotificationsRead(): Promise<number> {
  const response = await api.post('/notifications/mark-all-read');
  return response.data.data.markedCount;
}
