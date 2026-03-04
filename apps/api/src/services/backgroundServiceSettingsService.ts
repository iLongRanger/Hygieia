import { prisma } from '../lib/prisma';
import logger from '../lib/logger';
import type {
  BackgroundServiceKey,
  UpdateBackgroundServiceSettingsInput,
} from '../schemas/backgroundServiceSettings';

export interface BackgroundServiceSettingView {
  serviceKey: BackgroundServiceKey;
  enabled: boolean;
  intervalMs: number;
  lastRunAt: Date | null;
  lastSuccessAt: Date | null;
  lastError: string | null;
  lastErrorAt: Date | null;
  updatedByUserId: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface BackgroundServiceRunLogView {
  id: string;
  serviceKey: BackgroundServiceKey;
  status: 'success' | 'failed';
  summary: string;
  details: Record<string, unknown>;
  startedAt: Date;
  endedAt: Date;
  createdAt: Date;
}

const DEFAULT_INTERVALS_MS: Record<BackgroundServiceKey, number> = {
  reminders: 15 * 60 * 1000,
  recurring_jobs_autogen: 6 * 60 * 60 * 1000,
  job_alerts: 15 * 60 * 1000,
  contract_assignment_overrides: 15 * 60 * 1000,
};

function parseIntervalMs(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 60_000) {
    return fallback;
  }
  return parsed;
}

function getDefaultEnabled(serviceKey: BackgroundServiceKey): boolean {
  if (serviceKey === 'reminders') {
    return process.env.REMINDERS_ENABLED === 'true';
  }
  if (serviceKey === 'recurring_jobs_autogen') {
    return process.env.RECURRING_JOBS_AUTOGEN_ENABLED !== 'false';
  }
  if (serviceKey === 'contract_assignment_overrides') {
    return process.env.CONTRACT_ASSIGNMENT_OVERRIDES_ENABLED !== 'false';
  }
  return process.env.JOB_ALERTS_ENABLED !== 'false';
}

function getDefaultIntervalMs(serviceKey: BackgroundServiceKey): number {
  if (serviceKey === 'reminders') {
    return parseIntervalMs(process.env.REMINDERS_INTERVAL_MS, DEFAULT_INTERVALS_MS.reminders);
  }
  if (serviceKey === 'recurring_jobs_autogen') {
    return parseIntervalMs(
      process.env.RECURRING_JOBS_AUTOGEN_INTERVAL_MS,
      DEFAULT_INTERVALS_MS.recurring_jobs_autogen
    );
  }
  if (serviceKey === 'contract_assignment_overrides') {
    return parseIntervalMs(
      process.env.CONTRACT_ASSIGNMENT_OVERRIDES_INTERVAL_MS,
      DEFAULT_INTERVALS_MS.contract_assignment_overrides
    );
  }
  return parseIntervalMs(process.env.JOB_ALERTS_INTERVAL_MS, DEFAULT_INTERVALS_MS.job_alerts);
}

export function getDefaultServiceConfig(serviceKey: BackgroundServiceKey): BackgroundServiceSettingView {
  return {
    serviceKey,
    enabled: getDefaultEnabled(serviceKey),
    intervalMs: getDefaultIntervalMs(serviceKey),
    lastRunAt: null,
    lastSuccessAt: null,
    lastError: null,
    lastErrorAt: null,
    updatedByUserId: null,
    createdAt: null,
    updatedAt: null,
  };
}

function toView(
  value: {
    serviceKey: string;
    enabled: boolean;
    intervalMs: number;
    lastRunAt: Date | null;
    lastSuccessAt: Date | null;
    lastError: string | null;
    lastErrorAt: Date | null;
    updatedByUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null,
  serviceKey: BackgroundServiceKey
): BackgroundServiceSettingView {
  const fallback = getDefaultServiceConfig(serviceKey);
  if (!value) return fallback;
  return {
    serviceKey,
    enabled: value.enabled,
    intervalMs: value.intervalMs,
    lastRunAt: value.lastRunAt,
    lastSuccessAt: value.lastSuccessAt,
    lastError: value.lastError,
    lastErrorAt: value.lastErrorAt,
    updatedByUserId: value.updatedByUserId,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

const BACKGROUND_SERVICE_KEYS: BackgroundServiceKey[] = [
  'reminders',
  'recurring_jobs_autogen',
  'job_alerts',
  'contract_assignment_overrides',
];

function hasBackgroundServiceDelegate(): boolean {
  return Boolean((prisma as unknown as { backgroundServiceSetting?: unknown }).backgroundServiceSetting);
}

function hasBackgroundServiceLogDelegate(): boolean {
  return Boolean((prisma as unknown as { backgroundServiceRunLog?: unknown }).backgroundServiceRunLog);
}

function shouldSkipDbReads(): boolean {
  return process.env.NODE_ENV === 'test' || Boolean(process.env.JEST_WORKER_ID);
}

export async function getBackgroundServiceSettings(): Promise<BackgroundServiceSettingView[]> {
  if (shouldSkipDbReads() || !hasBackgroundServiceDelegate()) {
    return BACKGROUND_SERVICE_KEYS.map((serviceKey) => getDefaultServiceConfig(serviceKey));
  }

  try {
    const rows = await prisma.backgroundServiceSetting.findMany({
      where: { serviceKey: { in: BACKGROUND_SERVICE_KEYS } },
      orderBy: { serviceKey: 'asc' },
    });
    const byKey = new Map(rows.map((row) => [row.serviceKey, row]));
    return BACKGROUND_SERVICE_KEYS.map((serviceKey) => toView(byKey.get(serviceKey) ?? null, serviceKey));
  } catch (error) {
    logger.warn('Failed to load background service settings from database, using defaults', error);
    return BACKGROUND_SERVICE_KEYS.map((serviceKey) => getDefaultServiceConfig(serviceKey));
  }
}

export async function getBackgroundServiceSetting(
  serviceKey: BackgroundServiceKey
): Promise<BackgroundServiceSettingView> {
  if (shouldSkipDbReads() || !hasBackgroundServiceDelegate()) {
    return getDefaultServiceConfig(serviceKey);
  }

  try {
    const row = await prisma.backgroundServiceSetting.findUnique({
      where: { serviceKey },
    });
    return toView(row, serviceKey);
  } catch (error) {
    logger.warn(
      `Failed to load background service setting for "${serviceKey}", using defaults`,
      error
    );
    return getDefaultServiceConfig(serviceKey);
  }
}

export async function updateBackgroundServiceSetting(
  serviceKey: BackgroundServiceKey,
  input: UpdateBackgroundServiceSettingsInput,
  updatedByUserId: string | null
): Promise<BackgroundServiceSettingView> {
  if (!hasBackgroundServiceDelegate()) {
    throw new Error(
      'Background services settings are unavailable. Run database migration and Prisma generate.'
    );
  }

  const defaults = getDefaultServiceConfig(serviceKey);
  const row = await prisma.backgroundServiceSetting.upsert({
    where: { serviceKey },
    create: {
      serviceKey,
      enabled: input.enabled ?? defaults.enabled,
      intervalMs: input.intervalMs ?? defaults.intervalMs,
      updatedByUserId: updatedByUserId ?? null,
    },
    update: {
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.intervalMs !== undefined ? { intervalMs: input.intervalMs } : {}),
      updatedByUserId: updatedByUserId ?? null,
    },
  });

  return toView(row, serviceKey);
}

async function patchRunMetadata(
  serviceKey: BackgroundServiceKey,
  data: {
    lastRunAt?: Date;
    lastSuccessAt?: Date;
    lastError?: string | null;
    lastErrorAt?: Date | null;
  }
): Promise<void> {
  if (!hasBackgroundServiceDelegate()) {
    return;
  }

  try {
    await prisma.backgroundServiceSetting.upsert({
      where: { serviceKey },
      create: {
        serviceKey,
        enabled: getDefaultEnabled(serviceKey),
        intervalMs: getDefaultIntervalMs(serviceKey),
        ...data,
      },
      update: data,
    });
  } catch (error) {
    logger.warn(`Failed to update run metadata for background service "${serviceKey}"`, error);
  }
}

export async function markBackgroundServiceRunStart(serviceKey: BackgroundServiceKey): Promise<void> {
  await patchRunMetadata(serviceKey, { lastRunAt: new Date() });
}

export async function markBackgroundServiceRunSuccess(
  serviceKey: BackgroundServiceKey
): Promise<void> {
  await patchRunMetadata(serviceKey, {
    lastSuccessAt: new Date(),
    lastError: null,
    lastErrorAt: null,
  });
}

export async function markBackgroundServiceRunFailure(
  serviceKey: BackgroundServiceKey,
  error: unknown
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  await patchRunMetadata(serviceKey, {
    lastError: message.slice(0, 2000),
    lastErrorAt: new Date(),
  });
}

export async function createBackgroundServiceRunLog(
  serviceKey: BackgroundServiceKey,
  input: {
    status: 'success' | 'failed';
    summary: string;
    details?: Record<string, unknown>;
    startedAt: Date;
    endedAt: Date;
  }
): Promise<void> {
  if (!hasBackgroundServiceLogDelegate()) {
    return;
  }

  try {
    await prisma.backgroundServiceRunLog.create({
      data: {
        serviceKey,
        status: input.status,
        summary: input.summary,
        details: input.details ?? {},
        startedAt: input.startedAt,
        endedAt: input.endedAt,
      },
    });
  } catch (error) {
    logger.warn(`Failed to create background service run log for "${serviceKey}"`, error);
  }
}

export async function getBackgroundServiceRunLogs(limitPerService = 20): Promise<
  Record<BackgroundServiceKey, BackgroundServiceRunLogView[]>
> {
  const empty: Record<BackgroundServiceKey, BackgroundServiceRunLogView[]> = {
    reminders: [],
    recurring_jobs_autogen: [],
    job_alerts: [],
    contract_assignment_overrides: [],
  };

  if (!hasBackgroundServiceLogDelegate()) {
    return empty;
  }

  try {
    const logs = await prisma.backgroundServiceRunLog.findMany({
      where: { serviceKey: { in: BACKGROUND_SERVICE_KEYS } },
      orderBy: { createdAt: 'desc' },
      take: Math.max(1, limitPerService) * BACKGROUND_SERVICE_KEYS.length,
    });

    for (const log of logs) {
      const key = log.serviceKey as BackgroundServiceKey;
      if (!empty[key]) continue;
      if (empty[key].length >= limitPerService) continue;
      empty[key].push({
        id: log.id,
        serviceKey: key,
        status: log.status === 'failed' ? 'failed' : 'success',
        summary: log.summary,
        details:
          log.details && typeof log.details === 'object' && !Array.isArray(log.details)
            ? (log.details as Record<string, unknown>)
            : {},
        startedAt: log.startedAt,
        endedAt: log.endedAt,
        createdAt: log.createdAt,
      });
    }
  } catch (error) {
    logger.warn('Failed to load background service run logs', error);
  }

  return empty;
}
