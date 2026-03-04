import logger from '../lib/logger';
import { runRecurringJobsAutoRegenerationCycle } from './jobService';
import {
  getBackgroundServiceSetting,
  markBackgroundServiceRunFailure,
  markBackgroundServiceRunStart,
  markBackgroundServiceRunSuccess,
} from './backgroundServiceSettingsService';

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000;
let intervalHandle: NodeJS.Timeout | null = null;
let cycleRunning = false;
const SERVICE_KEY = 'recurring_jobs_autogen';

async function runRecurringJobCycle(): Promise<void> {
  if (cycleRunning) {
    logger.warn('Skipping recurring jobs cycle because a previous cycle is still running');
    return;
  }

  cycleRunning = true;
  await markBackgroundServiceRunStart(SERVICE_KEY);
  try {
    const result = await runRecurringJobsAutoRegenerationCycle();
    logger.info(
      `Recurring jobs cycle complete: checked=${result.checked}, generatedFor=${result.generatedFor}, created=${result.created}`
    );
    await markBackgroundServiceRunSuccess(SERVICE_KEY);
  } catch (error) {
    logger.error('Recurring jobs cycle failed', error);
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

  const intervalMs = config.intervalMs >= 60_000 ? config.intervalMs : DEFAULT_INTERVAL_MS;
  if (config.intervalMs < 60_000) {
    logger.warn(
      `Invalid recurring jobs interval "${config.intervalMs}", falling back to ${DEFAULT_INTERVAL_MS}ms`
    );
  }

  logger.info(`Starting recurring jobs scheduler (interval=${intervalMs}ms)`);

  runRecurringJobCycle().catch((error) => {
    logger.error('Initial recurring jobs cycle failed', error);
  });

  intervalHandle = setInterval(() => {
    runRecurringJobCycle().catch((error) => {
      logger.error('Scheduled recurring jobs cycle failed', error);
    });
  }, intervalMs);
}

export function startRecurringJobScheduler(): void {
  if (intervalHandle) {
    return;
  }
  void configureRecurringJobScheduler();
}

export async function reloadRecurringJobScheduler(): Promise<void> {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  await configureRecurringJobScheduler();
}

export async function runRecurringJobCycleNow(): Promise<void> {
  await runRecurringJobCycle();
}
