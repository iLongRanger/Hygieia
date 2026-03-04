import logger from '../lib/logger';
import {
  getBackgroundServiceSetting,
  markBackgroundServiceRunFailure,
  markBackgroundServiceRunStart,
  markBackgroundServiceRunSuccess,
} from './backgroundServiceSettingsService';

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;
let intervalHandle: NodeJS.Timeout | null = null;
let cycleRunning = false;
const SERVICE_KEY = 'reminders';

async function runReminderCycle(): Promise<void> {
  if (cycleRunning) {
    logger.warn('Skipping reminder cycle because a previous cycle is still running');
    return;
  }

  cycleRunning = true;
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
    await markBackgroundServiceRunSuccess(SERVICE_KEY);
  } catch (error) {
    logger.error('Reminder cycle failed', error);
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

  const intervalMs = config.intervalMs >= 60_000 ? config.intervalMs : DEFAULT_INTERVAL_MS;
  if (config.intervalMs < 60_000) {
    logger.warn(
      `Invalid reminders interval "${config.intervalMs}", falling back to ${DEFAULT_INTERVAL_MS}ms`
    );
  }

  logger.info(`Starting reminder scheduler (interval=${intervalMs}ms)`);

  runReminderCycle().catch((error) => {
    logger.error('Initial reminder cycle failed', error);
  });

  intervalHandle = setInterval(() => {
    runReminderCycle().catch((error) => {
      logger.error('Scheduled reminder cycle failed', error);
    });
  }, intervalMs);
}

export function startReminderScheduler(): void {
  if (intervalHandle) {
    return;
  }
  void configureReminderScheduler();
}

export async function reloadReminderScheduler(): Promise<void> {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  await configureReminderScheduler();
}

export async function runReminderCycleNow(): Promise<void> {
  await runReminderCycle();
}
