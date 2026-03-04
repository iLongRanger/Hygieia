import logger from '../lib/logger';
import { runContractAssignmentOverrideCycle } from './contractAssignmentOverrideService';
import {
  createBackgroundServiceRunLog,
  getBackgroundServiceSetting,
  markBackgroundServiceRunFailure,
  markBackgroundServiceRunStart,
  markBackgroundServiceRunSuccess,
} from './backgroundServiceSettingsService';

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;
const SERVICE_KEY = 'contract_assignment_overrides';
let intervalHandle: NodeJS.Timeout | null = null;
let cycleRunning = false;

async function runContractAssignmentOverrideSchedulerCycle(): Promise<void> {
  if (cycleRunning) {
    logger.warn('Skipping contract assignment override cycle because a previous cycle is still running');
    return;
  }

  cycleRunning = true;
  const startedAt = new Date();
  await markBackgroundServiceRunStart(SERVICE_KEY);
  try {
    const result = await runContractAssignmentOverrideCycle();
    logger.info(
      `Contract assignment override cycle complete: checked=${result.checked}, applied=${result.applied}, reassignedJobs=${result.reassignedJobs}, notifications=${result.notifications}`
    );
    await createBackgroundServiceRunLog(SERVICE_KEY, {
      status: 'success',
      summary:
        `Checked ${result.checked} contracts, applied ${result.applied} overrides, ` +
        `reassigned ${result.reassignedJobs} scheduled jobs, sent ${result.notifications} notifications`,
      details: result as unknown as Record<string, unknown>,
      startedAt,
      endedAt: new Date(),
    });
    await markBackgroundServiceRunSuccess(SERVICE_KEY);
  } catch (error) {
    logger.error('Contract assignment override cycle failed', error);
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

async function configureContractAssignmentOverrideScheduler(): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    logger.info('Contract assignment override scheduler disabled');
    return;
  }

  const config = await getBackgroundServiceSetting(SERVICE_KEY);
  if (!config.enabled) {
    logger.info('Contract assignment override scheduler disabled');
    return;
  }

  const intervalMs = config.intervalMs >= 60_000 ? config.intervalMs : DEFAULT_INTERVAL_MS;
  if (config.intervalMs < 60_000) {
    logger.warn(
      `Invalid contract assignment override interval "${config.intervalMs}", falling back to ${DEFAULT_INTERVAL_MS}ms`
    );
  }

  logger.info(`Starting contract assignment override scheduler (interval=${intervalMs}ms)`);

  runContractAssignmentOverrideSchedulerCycle().catch((error) => {
    logger.error('Initial contract assignment override cycle failed', error);
  });

  intervalHandle = setInterval(() => {
    runContractAssignmentOverrideSchedulerCycle().catch((error) => {
      logger.error('Scheduled contract assignment override cycle failed', error);
    });
  }, intervalMs);
}

export function startContractAssignmentOverrideScheduler(): void {
  if (intervalHandle) {
    return;
  }
  void configureContractAssignmentOverrideScheduler();
}

export async function reloadContractAssignmentOverrideScheduler(): Promise<void> {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  await configureContractAssignmentOverrideScheduler();
}

export async function runContractAssignmentOverrideCycleNow(): Promise<void> {
  await runContractAssignmentOverrideSchedulerCycle();
}
