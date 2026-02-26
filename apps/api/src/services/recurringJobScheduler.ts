import logger from '../lib/logger';
import { runRecurringJobsAutoRegenerationCycle } from './jobService';

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000;
let intervalHandle: NodeJS.Timeout | null = null;
let cycleRunning = false;

function shouldStartScheduler(): boolean {
  if (process.env.NODE_ENV === 'test') return false;
  return process.env.RECURRING_JOBS_AUTOGEN_ENABLED !== 'false';
}

function getIntervalMs(): number {
  const raw = process.env.RECURRING_JOBS_AUTOGEN_INTERVAL_MS;
  if (!raw) return DEFAULT_INTERVAL_MS;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 60_000) {
    logger.warn(
      `Invalid RECURRING_JOBS_AUTOGEN_INTERVAL_MS="${raw}", falling back to ${DEFAULT_INTERVAL_MS}ms`
    );
    return DEFAULT_INTERVAL_MS;
  }

  return parsed;
}

async function runRecurringJobCycle(): Promise<void> {
  if (cycleRunning) {
    logger.warn('Skipping recurring jobs cycle because a previous cycle is still running');
    return;
  }

  cycleRunning = true;
  try {
    const result = await runRecurringJobsAutoRegenerationCycle();
    logger.info(
      `Recurring jobs cycle complete: checked=${result.checked}, generatedFor=${result.generatedFor}, created=${result.created}`
    );
  } catch (error) {
    logger.error('Recurring jobs cycle failed', error);
  } finally {
    cycleRunning = false;
  }
}

export function startRecurringJobScheduler(): void {
  if (!shouldStartScheduler()) {
    logger.info('Recurring jobs scheduler disabled');
    return;
  }

  if (intervalHandle) {
    return;
  }

  const intervalMs = getIntervalMs();
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
