import logger from '../lib/logger';
import { runInvoiceAutoGenerationCycle } from './invoiceService';
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

const DEFAULT_TIME_OF_DAY_MS = 2 * 60 * 60 * 1000; // 02:00 local
let timeoutHandle: NodeJS.Timeout | null = null;
let cycleRunning = false;
const SERVICE_KEY = 'invoice_autogen';

async function runInvoiceCycle(): Promise<void> {
  if (cycleRunning) {
    logger.warn('Skipping invoice auto-generation cycle because a previous cycle is still running');
    return;
  }

  cycleRunning = true;
  const startedAt = new Date();
  await markBackgroundServiceRunStart(SERVICE_KEY);
  try {
    const result = await runInvoiceAutoGenerationCycle();
    logger.info(
      `Invoice auto-generation cycle complete: checked=${result.checked}, generated=${result.generated}, skipped=${result.skipped}, errors=${result.errors}`
    );
    await createBackgroundServiceRunLog(SERVICE_KEY, {
      status: 'success',
      summary: `Checked ${result.checked} contracts, generated ${result.generated} invoices, skipped ${result.skipped}, ${result.errors} errors`,
      details: result as unknown as Record<string, unknown>,
      startedAt,
      endedAt: new Date(),
    });
    await markBackgroundServiceRunSuccess(SERVICE_KEY);
  } catch (error) {
    logger.error('Invoice auto-generation cycle failed', error);
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

async function configureInvoiceScheduler(): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    logger.info('Invoice auto-generation scheduler disabled (test env)');
    return;
  }

  const config = await getBackgroundServiceSetting(SERVICE_KEY);
  if (!config.enabled) {
    logger.info('Invoice auto-generation scheduler disabled');
    return;
  }

  const timeOfDayMs = sanitizeTimeOfDayMs(config.intervalMs, DEFAULT_TIME_OF_DAY_MS);
  let companyTimezone = 'UTC';
  try {
    companyTimezone = await getGlobalSettingsTimezone();
  } catch (error) {
    logger.warn('Failed to load company timezone for invoice scheduler, defaulting to UTC', error);
  }
  if (timeOfDayMs !== config.intervalMs) {
    logger.warn(
      `Invalid invoice scheduler time "${config.intervalMs}", falling back to ${DEFAULT_TIME_OF_DAY_MS}ms`
    );
  }
  const nextRunAt = getNextRunAt(timeOfDayMs, companyTimezone);
  const delayMs = getDelayUntilNextRunMs(timeOfDayMs, companyTimezone);
  logger.info(
    `Starting invoice auto-generation scheduler (dailyAt=${formatTimeOfDay(timeOfDayMs, companyTimezone)}, nextRunAt=${nextRunAt.toISOString()})`
  );

  timeoutHandle = setTimeout(() => {
    runInvoiceCycle()
      .catch((error) => {
        logger.error('Scheduled invoice auto-generation cycle failed', error);
      })
      .finally(() => {
        timeoutHandle = null;
        void configureInvoiceScheduler();
      });
  }, delayMs);
}

export function startInvoiceScheduler(): void {
  if (timeoutHandle) {
    return;
  }
  void configureInvoiceScheduler();
}

export async function reloadInvoiceScheduler(): Promise<void> {
  if (timeoutHandle) {
    clearTimeout(timeoutHandle);
    timeoutHandle = null;
  }
  await configureInvoiceScheduler();
}

export async function runInvoiceCycleNow(): Promise<void> {
  await runInvoiceCycle();
}
