export type BackgroundServiceKey = 'reminders' | 'recurring_jobs_autogen' | 'job_alerts';

export interface BackgroundServiceSetting {
  serviceKey: BackgroundServiceKey;
  enabled: boolean;
  intervalMs: number;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  updatedByUserId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
