export type BackgroundServiceKey =
  | 'reminders'
  | 'recurring_jobs_autogen'
  | 'job_alerts'
  | 'contract_assignment_overrides'
  | 'contract_amendment_auto_apply';

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

export interface BackgroundServiceRunLog {
  id: string;
  serviceKey: BackgroundServiceKey;
  status: 'success' | 'failed';
  summary: string;
  details: Record<string, unknown>;
  startedAt: string;
  endedAt: string;
  createdAt: string;
}

export interface BackgroundServiceRunLogPage {
  serviceKey: BackgroundServiceKey;
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  items: BackgroundServiceRunLog[];
}
