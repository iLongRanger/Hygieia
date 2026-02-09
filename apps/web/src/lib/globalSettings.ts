import api from './api';
import type { GlobalSettings, UpdateGlobalSettingsInput } from '../types/globalSettings';

export async function getGlobalSettings(): Promise<GlobalSettings> {
  const response = await api.get('/settings/global');
  return response.data.data;
}

export async function updateGlobalSettings(input: UpdateGlobalSettingsInput): Promise<GlobalSettings> {
  const response = await api.put('/settings/global', input);
  return response.data.data;
}

export async function uploadCompanyLogo(logoDataUrl: string): Promise<GlobalSettings> {
  const response = await api.post('/settings/global/logo', { logoDataUrl });
  return response.data.data;
}

export async function removeCompanyLogo(): Promise<GlobalSettings> {
  const response = await api.delete('/settings/global/logo');
  return response.data.data;
}

