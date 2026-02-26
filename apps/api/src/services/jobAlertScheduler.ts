import logger from '../lib/logger';
import { runJobNearingEndNoCheckInAlertCycle } from './jobService';

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;
let intervalHandle: NodeJS.Timeout | null = null;
let cycleRunning = false;

function shouldStartScheduler(): boolean {
  if (process.env.NODE_ENV === 'test') return false;
  return process.env.JOB_ALERTS_ENABLED !== 'false';
}

function getIntervalMs(): number {
  const raw = process.env.JOB_ALERTS_INTERVAL_MS;
  if (!raw) return DEFAULT_INTERVAL_MS;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 60_000) {
    logger.warn(`Invalid JOB_ALERTS_INTERVAL_MS="${raw}", falling back to ${DEFAULT_INTERVAL_MS}ms`);
    return DEFAULT_INTERVAL_MS;
  }

  return parsed;
}

async function runJobAlertCycle(): Promise<void> {
  if (cycleRunning) {
    logger.warn('Skipping job alert cycle because a previous cycle is still running');
    return;
  }

  cycleRunning = true;
  try {
    const result = await runJobNearingEndNoCheckInAlertCycle();
    logger.info(
      `Job alert cycle complete: checked=${result.checked}, alerted=${result.alerted}, notifications=${result.notifications}`
    );
  } catch (error) {
    logger.error('Job alert cycle failed', error);
  } finally {
    cycleRunning = false;
  }
}

export function startJobAlertScheduler(): void {
  if (!shouldStartScheduler()) {
    logger.info('Job alert scheduler disabled');
    return;
  }

  if (intervalHandle) {
    return;
  }

  const intervalMs = getIntervalMs();
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
