import logger from '../lib/logger';
import { runContractAssignmentOverrideCycle } from './contractAssignmentOverrideService';
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

const DEFAULT_TIME_OF_DAY_MS = 0;
const SERVICE_KEY = 'contract_assignment_overrides';
let timeoutHandle: NodeJS.Timeout | null = null;
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

  const timeOfDayMs = sanitizeTimeOfDayMs(config.intervalMs, DEFAULT_TIME_OF_DAY_MS);
  let companyTimezone = 'UTC';
  try {
    companyTimezone = await getGlobalSettingsTimezone();
  } catch (error) {
    logger.warn(
      'Failed to load company timezone for contract assignment override scheduler, defaulting to UTC',
      error
    );
  }
  if (timeOfDayMs !== config.intervalMs) {
    logger.warn(
      `Invalid contract assignment override schedule time "${config.intervalMs}", falling back to ${DEFAULT_TIME_OF_DAY_MS}ms`
    );
  }
  const nextRunAt = getNextRunAt(timeOfDayMs, companyTimezone);
  const delayMs = getDelayUntilNextRunMs(timeOfDayMs, companyTimezone);
  logger.info(
    `Starting contract assignment override scheduler (dailyAt=${formatTimeOfDay(timeOfDayMs, companyTimezone)}, nextRunAt=${nextRunAt.toISOString()})`
  );

  timeoutHandle = setTimeout(() => {
    runContractAssignmentOverrideSchedulerCycle().catch((error) => {
      logger.error('Scheduled contract assignment override cycle failed', error);
    }).finally(() => {
      timeoutHandle = null;
      void configureContractAssignmentOverrideScheduler();
    });
  }, delayMs);
}

export function startContractAssignmentOverrideScheduler(): void {
  if (timeoutHandle) {
    return;
  }
  void configureContractAssignmentOverrideScheduler();
}

export async function reloadContractAssignmentOverrideScheduler(): Promise<void> {
  if (timeoutHandle) {
    clearTimeout(timeoutHandle);
    timeoutHandle = null;
  }
  await configureContractAssignmentOverrideScheduler();
}

export async function runContractAssignmentOverrideCycleNow(): Promise<void> {
  await runContractAssignmentOverrideSchedulerCycle();
}
