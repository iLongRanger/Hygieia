import logger from '../lib/logger';

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;
let intervalHandle: NodeJS.Timeout | null = null;
let cycleRunning = false;

function shouldStartScheduler(): boolean {
  if (process.env.NODE_ENV === 'test') return false;
  return process.env.REMINDERS_ENABLED === 'true';
}

function getIntervalMs(): number {
  const raw = process.env.REMINDERS_INTERVAL_MS;
  if (!raw) return DEFAULT_INTERVAL_MS;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 60_000) {
    logger.warn(`Invalid REMINDERS_INTERVAL_MS="${raw}", falling back to ${DEFAULT_INTERVAL_MS}ms`);
    return DEFAULT_INTERVAL_MS;
  }

  return parsed;
}

async function runReminderCycle(): Promise<void> {
  if (cycleRunning) {
    logger.warn('Skipping reminder cycle because a previous cycle is still running');
    return;
  }

  cycleRunning = true;
  try {
    const { sendAppointmentReminders, sendContractExpiryReminders } = await import('./reminderService');
    const [appointmentCount, contractCount] = await Promise.all([
      sendAppointmentReminders(),
      sendContractExpiryReminders(),
    ]);

    logger.info(
      `Reminder cycle complete: appointmentReminders=${appointmentCount}, contractExpiryReminders=${contractCount}`
    );
  } catch (error) {
    logger.error('Reminder cycle failed', error);
  } finally {
    cycleRunning = false;
  }
}

export function startReminderScheduler(): void {
  if (!shouldStartScheduler()) {
    logger.info('Reminder scheduler disabled');
    return;
  }

  if (intervalHandle) {
    return;
  }

  const intervalMs = getIntervalMs();
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
