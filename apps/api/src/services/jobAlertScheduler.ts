import logger from '../lib/logger';
import { runJobNearingEndNoCheckInAlertCycle } from './jobService';
import {
  getBackgroundServiceSetting,
  markBackgroundServiceRunFailure,
  markBackgroundServiceRunStart,
  markBackgroundServiceRunSuccess,
} from './backgroundServiceSettingsService';

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;
let intervalHandle: NodeJS.Timeout | null = null;
let cycleRunning = false;
const SERVICE_KEY = 'job_alerts';

async function runJobAlertCycle(): Promise<void> {
  if (cycleRunning) {
    logger.warn('Skipping job alert cycle because a previous cycle is still running');
    return;
  }

  cycleRunning = true;
  await markBackgroundServiceRunStart(SERVICE_KEY);
  try {
    const result = await runJobNearingEndNoCheckInAlertCycle();
    logger.info(
      `Job alert cycle complete: checked=${result.checked}, alerted=${result.alerted}, notifications=${result.notifications}`
    );
    await markBackgroundServiceRunSuccess(SERVICE_KEY);
  } catch (error) {
    logger.error('Job alert cycle failed', error);
    await markBackgroundServiceRunFailure(SERVICE_KEY, error);
  } finally {
    cycleRunning = false;
  }
}

async function configureJobAlertScheduler(): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    logger.info('Job alert scheduler disabled');
    return;
  }

  const config = await getBackgroundServiceSetting(SERVICE_KEY);
  if (!config.enabled) {
    logger.info('Job alert scheduler disabled');
    return;
  }

  const intervalMs = config.intervalMs >= 60_000 ? config.intervalMs : DEFAULT_INTERVAL_MS;
  if (config.intervalMs < 60_000) {
    logger.warn(
      `Invalid job alerts interval "${config.intervalMs}", falling back to ${DEFAULT_INTERVAL_MS}ms`
    );
  }

  logger.info(`Starting job alert scheduler (interval=${intervalMs}ms)`);

  runJobAlertCycle().catch((error) => {
    logger.error('Initial job alert cycle failed', error);
  });

  intervalHandle = setInterval(() => {
    runJobAlertCycle().catch((error) => {
      logger.error('Scheduled job alert cycle failed', error);
    });
  }, intervalMs);
}

export function startJobAlertScheduler(): void {
  if (intervalHandle) {
    return;
  }
  void configureJobAlertScheduler();
}

export async function reloadJobAlertScheduler(): Promise<void> {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  await configureJobAlertScheduler();
}

export async function runJobAlertCycleNow(): Promise<void> {
  await runJobAlertCycle();
}
