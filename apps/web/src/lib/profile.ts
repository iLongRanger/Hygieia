import api from './api';
import type { User } from '../types/user';

export interface UpdateCurrentProfileInput {
  fullName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

export async function getCurrentProfile(): Promise<User> {
  const response = await api.get('/auth/profile');
  return response.data.data;
}

export async function updateCurrentProfile(
  data: UpdateCurrentProfileInput
): Promise<User> {
  const response = await api.patch('/auth/profile', data);
  return response.data.data;
}

export async function changeOwnPassword(
  currentPassword: string,
  newPassword: string,
  challengeId: string,
  code: string
): Promise<{ message: string }> {
  const response = await api.post('/auth/change-password', {
    currentPassword,
    newPassword,
    challengeId,
    code,
  });
  return response.data.data;
}

export async function requestOwnPasswordChangeChallenge(): Promise<{
  challengeId: string;
  maskedPhone: string;
  expiresInSeconds: number;
}> {
  const response = await api.post('/auth/change-password/challenge');
  return response.data.data;
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data.data;
}

export async function resetPassword(token: string, password: string): Promise<{ message: string }> {
  const response = await api.post('/auth/reset-password', { token, password });
  return response.data;
}
