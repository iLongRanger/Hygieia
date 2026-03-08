import logger from '../lib/logger';
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
import { runContractAmendmentAutoApplyCycle } from './contractAmendmentWorkflowService';

const DEFAULT_TIME_OF_DAY_MS = 2 * 60 * 60 * 1000;
const SERVICE_KEY = 'contract_amendment_auto_apply';
let timeoutHandle: NodeJS.Timeout | null = null;
let cycleRunning = false;

async function runContractAmendmentAutoApplySchedulerCycle(): Promise<void> {
  if (cycleRunning) {
    logger.warn('Skipping contract amendment auto-apply cycle because a previous cycle is still running');
    return;
  }

  cycleRunning = true;
  const startedAt = new Date();
  await markBackgroundServiceRunStart(SERVICE_KEY);
  try {
    const result = await runContractAmendmentAutoApplyCycle();
    logger.info(
      `Contract amendment auto-apply cycle complete: checked=${result.checked}, due=${result.due}, applied=${result.applied}, failed=${result.failed}, jobsCreated=${result.jobsCreated}, jobsCanceled=${result.jobsCanceled}`
    );
    await createBackgroundServiceRunLog(SERVICE_KEY, {
      status: 'success',
      summary:
        `Checked ${result.checked} approved amendments, auto-applied ${result.applied}, ` +
        `failed ${result.failed}, created ${result.jobsCreated} jobs, canceled ${result.jobsCanceled} jobs`,
      details: result as unknown as Record<string, unknown>,
      startedAt,
      endedAt: new Date(),
    });
    await markBackgroundServiceRunSuccess(SERVICE_KEY);
  } catch (error) {
    logger.error('Contract amendment auto-apply cycle failed', error);
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

async function configureContractAmendmentAutoApplyScheduler(): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    logger.info('Contract amendment auto-apply scheduler disabled');
    return;
  }

  const config = await getBackgroundServiceSetting(SERVICE_KEY);
  if (!config.enabled) {
    logger.info('Contract amendment auto-apply scheduler disabled');
    return;
  }

  const timeOfDayMs = sanitizeTimeOfDayMs(config.intervalMs, DEFAULT_TIME_OF_DAY_MS);
  let companyTimezone = 'UTC';
  try {
    companyTimezone = await getGlobalSettingsTimezone();
  } catch (error) {
    logger.warn(
      'Failed to load company timezone for contract amendment auto-apply scheduler, defaulting to UTC',
      error
    );
  }
  if (timeOfDayMs !== config.intervalMs) {
    logger.warn(
      `Invalid contract amendment auto-apply schedule time "${config.intervalMs}", falling back to ${DEFAULT_TIME_OF_DAY_MS}ms`
    );
  }
  const nextRunAt = getNextRunAt(timeOfDayMs, companyTimezone);
  const delayMs = getDelayUntilNextRunMs(timeOfDayMs, companyTimezone);
  logger.info(
    `Starting contract amendment auto-apply scheduler (dailyAt=${formatTimeOfDay(timeOfDayMs, companyTimezone)}, nextRunAt=${nextRunAt.toISOString()})`
  );

  timeoutHandle = setTimeout(() => {
    runContractAmendmentAutoApplySchedulerCycle()
      .catch((error) => {
        logger.error('Scheduled contract amendment auto-apply cycle failed', error);
      })
      .finally(() => {
        timeoutHandle = null;
        void configureContractAmendmentAutoApplyScheduler();
      });
  }, delayMs);
}

export function startContractAmendmentAutoApplyScheduler(): void {
  if (timeoutHandle) {
    return;
  }
  void configureContractAmendmentAutoApplyScheduler();
}

export async function reloadContractAmendmentAutoApplyScheduler(): Promise<void> {
  if (timeoutHandle) {
    clearTimeout(timeoutHandle);
    timeoutHandle = null;
  }
  await configureContractAmendmentAutoApplyScheduler();
}

export async function runContractAmendmentAutoApplyCycleNow(): Promise<void> {
  await runContractAmendmentAutoApplySchedulerCycle();
}
