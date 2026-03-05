import logger from '../lib/logger';
import { runRecurringJobsAutoRegenerationCycle } from './jobService';
import {
  createBackgroundServiceRunLog,
  getBackgroundServiceSetting,
  markBackgroundServiceRunFailure,
  markBackgroundServiceRunStart,
  markBackgroundServiceRunSuccess,
} from './backgroundServiceSettingsService';
import {
  formatTimeOfDay,
  getDelayUntilNextRunMs,
  getNextRunAt,
  sanitizeTimeOfDayMs,
} from './backgroundSchedulerUtils';
import { getGlobalSettingsTimezone } from './globalSettingsService';

const DEFAULT_TIME_OF_DAY_MS = 1 * 60 * 60 * 1000;
let timeoutHandle: NodeJS.Timeout | null = null;
let cycleRunning = false;
const SERVICE_KEY = 'recurring_jobs_autogen';

async function runRecurringJobCycle(): Promise<void> {
  if (cycleRunning) {
    logger.warn('Skipping recurring jobs cycle because a previous cycle is still running');
    return;
  }

  cycleRunning = true;
  const startedAt = new Date();
  await markBackgroundServiceRunStart(SERVICE_KEY);
  try {
    const result = await runRecurringJobsAutoRegenerationCycle();
    logger.info(
      `Recurring jobs cycle complete: checked=${result.checked}, generatedFor=${result.generatedFor}, created=${result.created}`
    );
    await createBackgroundServiceRunLog(SERVICE_KEY, {
      status: 'success',
      summary: `Checked ${result.checked} contracts, generated for ${result.generatedFor}, created ${result.created} recurring jobs`,
      details: result as unknown as Record<string, unknown>,
      startedAt,
      endedAt: new Date(),
    });
    await markBackgroundServiceRunSuccess(SERVICE_KEY);
  } catch (error) {
    logger.error('Recurring jobs cycle failed', error);
    await createBackgroundServiceRunLog(SERVICE_KEY, {
      status: 'failed',
      summary: error instanceof Error ? error.message : String(error),
      startedAt,
      endedAt: new Date(),
    });
    await markBackgroundServiceRunFailure(SERVICE_KEY, error);
  } finally {
    cycleRunning = false;
  }
}

async function configureRecurringJobScheduler(): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    logger.info('Recurring jobs scheduler disabled');
    return;
  }

  const config = await getBackgroundServiceSetting(SERVICE_KEY);
  if (!config.enabled) {
    logger.info('Recurring jobs scheduler disabled');
    return;
  }

  const timeOfDayMs = sanitizeTimeOfDayMs(config.intervalMs, DEFAULT_TIME_OF_DAY_MS);
  const companyTimezone = await getGlobalSettingsTimezone();
  if (timeOfDayMs !== config.intervalMs) {
    logger.warn(
      `Invalid recurring jobs schedule time "${config.intervalMs}", falling back to ${DEFAULT_TIME_OF_DAY_MS}ms`
    );
  }
  const nextRunAt = getNextRunAt(timeOfDayMs, companyTimezone);
  const delayMs = getDelayUntilNextRunMs(timeOfDayMs, companyTimezone);
  logger.info(
    `Starting recurring jobs scheduler (dailyAt=${formatTimeOfDay(timeOfDayMs, companyTimezone)}, nextRunAt=${nextRunAt.toISOString()})`
  );

  timeoutHandle = setTimeout(() => {
    runRecurringJobCycle().catch((error) => {
      logger.error('Scheduled recurring jobs cycle failed', error);
    }).finally(() => {
      timeoutHandle = null;
      void configureRecurringJobScheduler();
    });
  }, delayMs);
}

export function startRecurringJobScheduler(): void {
  if (timeoutHandle) {
    return;
  }
  void configureRecurringJobScheduler();
}

export async function reloadRecurringJobScheduler(): Promise<void> {
  if (timeoutHandle) {
    clearTimeout(timeoutHandle);
    timeoutHandle = null;
  }
  await configureRecurringJobScheduler();
}

export async function runRecurringJobCycleNow(): Promise<void> {
  await runRecurringJobCycle();
}
