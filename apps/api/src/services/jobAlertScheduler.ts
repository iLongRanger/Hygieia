import logger from '../lib/logger';
import { runJobNearingEndNoCheckInAlertCycle } from './jobService';
import {
  createBackgroundServiceRunLog,
  getBackgroundServiceSetting,
  markBackgroundServiceRunFailure,
  markBackgroundServiceRunStart,
  markBackgroundServiceRunSuccess,
} from './backgroundServiceSettingsService';

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;
const MIN_INTERVAL_MS = 5 * 60 * 1000;
let timeoutHandle: NodeJS.Timeout | null = null;
let cycleRunning = false;
const SERVICE_KEY = 'job_alerts';

async function runJobAlertCycle(): Promise<void> {
  if (cycleRunning) {
    logger.warn('Skipping job alert cycle because a previous cycle is still running');
    return;
  }

  cycleRunning = true;
  const startedAt = new Date();
  await markBackgroundServiceRunStart(SERVICE_KEY);
  try {
    const result = await runJobNearingEndNoCheckInAlertCycle();
    logger.info(
      `Job alert cycle complete: checked=${result.checked}, alerted=${result.alerted}, notifications=${result.notifications}, settlementReviewsTriggered=${result.settlementReviewsTriggered}`
    );
    await createBackgroundServiceRunLog(SERVICE_KEY, {
      status: 'success',
      summary: `Checked ${result.checked} jobs, alerted ${result.alerted}, created ${result.notifications} notifications, triggered ${result.settlementReviewsTriggered} settlement reviews`,
      details: result as unknown as Record<string, unknown>,
      startedAt,
      endedAt: new Date(),
    });
    await markBackgroundServiceRunSuccess(SERVICE_KEY);
  } catch (error) {
    logger.error('Job alert cycle failed', error);
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

  const intervalMs =
    Number.isFinite(config.intervalMs) && config.intervalMs >= MIN_INTERVAL_MS
      ? Math.floor(config.intervalMs)
      : DEFAULT_INTERVAL_MS;
  if (intervalMs !== config.intervalMs) {
    logger.warn(
      `Invalid job alerts interval "${config.intervalMs}", falling back to ${DEFAULT_INTERVAL_MS}ms`
    );
  }
  const nextRunAt = new Date(Date.now() + intervalMs);
  logger.info(
    `Starting job alert scheduler (every=${intervalMs}ms, nextRunAt=${nextRunAt.toISOString()})`
  );

  timeoutHandle = setTimeout(() => {
    runJobAlertCycle().catch((error) => {
      logger.error('Scheduled job alert cycle failed', error);
    }).finally(() => {
      timeoutHandle = null;
      void configureJobAlertScheduler();
    });
  }, intervalMs);
}

export function startJobAlertScheduler(): void {
  if (timeoutHandle) {
    return;
  }
  void configureJobAlertScheduler();
}

export async function reloadJobAlertScheduler(): Promise<void> {
  if (timeoutHandle) {
    clearTimeout(timeoutHandle);
    timeoutHandle = null;
  }
  await configureJobAlertScheduler();
}

export async function runJobAlertCycleNow(): Promise<void> {
  await runJobAlertCycle();
}
