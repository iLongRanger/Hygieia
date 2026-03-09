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

const DEFAULT_TIME_OF_DAY_MS = 8 * 60 * 60 * 1000;
let timeoutHandle: NodeJS.Timeout | null = null;
let cycleRunning = false;
const SERVICE_KEY = 'reminders';

async function runReminderCycle(): Promise<void> {
  if (cycleRunning) {
    logger.warn('Skipping reminder cycle because a previous cycle is still running');
    return;
  }

  cycleRunning = true;
  const startedAt = new Date();
  await markBackgroundServiceRunStart(SERVICE_KEY);
  try {
    const {
      sendAppointmentReminders,
      sendContractExpiryReminders,
      sendProposalFollowUpReminders,
      sendContractFollowUpReminders,
    } = await import('./reminderService');
    const [
      appointmentCount,
      contractExpiryCount,
      proposalFollowUpCount,
      contractFollowUpCount,
    ] = await Promise.all([
      sendAppointmentReminders(),
      sendContractExpiryReminders(),
      sendProposalFollowUpReminders(),
      sendContractFollowUpReminders(),
    ]);

    logger.info(
      `Reminder cycle complete: appointmentReminders=${appointmentCount}, contractExpiryReminders=${contractExpiryCount}, proposalFollowUpReminders=${proposalFollowUpCount}, contractFollowUpReminders=${contractFollowUpCount}`
    );
    await createBackgroundServiceRunLog(SERVICE_KEY, {
      status: 'success',
      summary: `Sent reminders - appointments: ${appointmentCount}, contract expiry: ${contractExpiryCount}, proposal follow-up: ${proposalFollowUpCount}, contract follow-up: ${contractFollowUpCount}`,
      details: {
        appointmentReminders: appointmentCount,
        contractExpiryReminders: contractExpiryCount,
        proposalFollowUpReminders: proposalFollowUpCount,
        contractFollowUpReminders: contractFollowUpCount,
      },
      startedAt,
      endedAt: new Date(),
    });
    await markBackgroundServiceRunSuccess(SERVICE_KEY);
  } catch (error) {
    logger.error('Reminder cycle failed', error);
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

async function configureReminderScheduler(): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    logger.info('Reminder scheduler disabled');
    return;
  }

  const config = await getBackgroundServiceSetting(SERVICE_KEY);
  if (!config.enabled) {
    logger.info('Reminder scheduler disabled');
    return;
  }

  const timeOfDayMs = sanitizeTimeOfDayMs(config.intervalMs, DEFAULT_TIME_OF_DAY_MS);
  let companyTimezone = 'UTC';
  try {
    companyTimezone = await getGlobalSettingsTimezone();
  } catch (error) {
    logger.warn('Failed to load company timezone for reminders scheduler, defaulting to UTC', error);
  }
  if (timeOfDayMs !== config.intervalMs) {
    logger.warn(
      `Invalid reminders schedule time "${config.intervalMs}", falling back to ${DEFAULT_TIME_OF_DAY_MS}ms`
    );
  }
  const nextRunAt = getNextRunAt(timeOfDayMs, companyTimezone);
  const delayMs = getDelayUntilNextRunMs(timeOfDayMs, companyTimezone);
  logger.info(
    `Starting reminder scheduler (dailyAt=${formatTimeOfDay(timeOfDayMs, companyTimezone)}, nextRunAt=${nextRunAt.toISOString()})`
  );

  timeoutHandle = setTimeout(() => {
    runReminderCycle().catch((error) => {
      logger.error('Scheduled reminder cycle failed', error);
    }).finally(() => {
      timeoutHandle = null;
      void configureReminderScheduler();
    });
  }, delayMs);
}

export function startReminderScheduler(): void {
  if (timeoutHandle) {
    return;
  }
  void configureReminderScheduler();
}

export async function reloadReminderScheduler(): Promise<void> {
  if (timeoutHandle) {
    clearTimeout(timeoutHandle);
    timeoutHandle = null;
  }
  await configureReminderScheduler();
}

export async function runReminderCycleNow(): Promise<void> {
  await runReminderCycle();
}
