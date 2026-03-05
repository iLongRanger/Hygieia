import api from './api';
import type { GlobalSettings, UpdateGlobalSettingsInput } from '../types/globalSettings';
import type {
  BackgroundServiceKey,
  BackgroundServiceRunLogPage,
  BackgroundServiceSetting,
} from '../types/backgroundServiceSettings';

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

export async function getBackgroundServiceSettings(): Promise<BackgroundServiceSetting[]> {
  const response = await api.get('/settings/global/background-services');
  return response.data.data;
}

export async function updateBackgroundServiceSetting(
  serviceKey: BackgroundServiceKey,
  input: { enabled?: boolean; intervalMs?: number }
): Promise<BackgroundServiceSetting> {
  const response = await api.patch(`/settings/global/background-services/${serviceKey}`, input);
  return response.data.data;
}

export async function runBackgroundServiceNow(
  serviceKey: BackgroundServiceKey
): Promise<BackgroundServiceSetting> {
  const response = await api.post(`/settings/global/background-services/${serviceKey}/run-now`);
  return response.data.data;
}

export async function getBackgroundServiceLogs(
  serviceKey: BackgroundServiceKey,
  page = 1,
  limit = 9
): Promise<BackgroundServiceRunLogPage> {
  const response = await api.get('/settings/global/background-services/logs', {
    params: { serviceKey, page, limit },
  });
  return response.data.data;
}

