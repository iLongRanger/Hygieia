import { Router, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { sensitiveRateLimiter } from '../middleware/rateLimiter';
import { ValidationError } from '../middleware/errorHandler';
import {
  getGlobalSettings,
  updateGlobalSettings,
  clearGlobalLogo,
} from '../services/globalSettingsService';
import { updateGlobalSettingsSchema, updateLogoSchema } from '../schemas/globalSettings';
import {
  backgroundServiceKeySchema,
  updateBackgroundServiceSettingsSchema,
} from '../schemas/backgroundServiceSettings';
import {
  getBackgroundServiceSetting,
  getBackgroundServiceSettings,
  updateBackgroundServiceSetting,
} from '../services/backgroundServiceSettingsService';
import { reloadReminderScheduler, runReminderCycleNow } from '../services/reminderScheduler';
import {
  reloadRecurringJobScheduler,
  runRecurringJobCycleNow,
} from '../services/recurringJobScheduler';
import { reloadJobAlertScheduler, runJobAlertCycleNow } from '../services/jobAlertScheduler';
import { PERMISSIONS } from '../types';

const router: Router = Router();

async function reloadSchedulerForService(serviceKey: string): Promise<void> {
  if (serviceKey === 'reminders') {
    await reloadReminderScheduler();
    return;
  }
  if (serviceKey === 'recurring_jobs_autogen') {
    await reloadRecurringJobScheduler();
    return;
  }
  if (serviceKey === 'job_alerts') {
    await reloadJobAlertScheduler();
  }
}

async function runServiceNow(serviceKey: string): Promise<void> {
  if (serviceKey === 'reminders') {
    await runReminderCycleNow();
    return;
  }
  if (serviceKey === 'recurring_jobs_autogen') {
    await runRecurringJobCycleNow();
    return;
  }
  if (serviceKey === 'job_alerts') {
    await runJobAlertCycleNow();
  }
}

function handleZodError(error: ZodError): ValidationError {
  const firstError = error.errors[0];
  return new ValidationError(firstError.message, {
    field: firstError.path.join('.'),
    errors: error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    })),
  });
}

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.SETTINGS_READ),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await getGlobalSettings();
      res.json({ data: settings });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.SETTINGS_WRITE),
  sensitiveRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateGlobalSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const settings = await updateGlobalSettings(parsed.data);
      res.json({ data: settings, message: 'Global settings updated successfully' });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/logo',
  authenticate,
  requirePermission(PERMISSIONS.SETTINGS_WRITE),
  sensitiveRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateLogoSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const settings = await updateGlobalSettings({ logoDataUrl: parsed.data.logoDataUrl });
      res.json({ data: settings, message: 'Logo updated successfully' });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/logo',
  authenticate,
  requirePermission(PERMISSIONS.SETTINGS_WRITE),
  sensitiveRateLimiter,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await clearGlobalLogo();
      res.json({ data: settings, message: 'Logo removed successfully' });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/background-services',
  authenticate,
  requirePermission(PERMISSIONS.SETTINGS_READ),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await getBackgroundServiceSettings();
      res.json({ data: settings });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/background-services/:serviceKey',
  authenticate,
  requirePermission(PERMISSIONS.SETTINGS_WRITE),
  sensitiveRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedServiceKey = backgroundServiceKeySchema.safeParse(req.params.serviceKey);
      if (!parsedServiceKey.success) {
        throw handleZodError(parsedServiceKey.error);
      }

      const parsedBody = updateBackgroundServiceSettingsSchema.safeParse(req.body);
      if (!parsedBody.success) {
        throw handleZodError(parsedBody.error);
      }

      const setting = await updateBackgroundServiceSetting(
        parsedServiceKey.data,
        parsedBody.data,
        req.user?.id ?? null
      );
      await reloadSchedulerForService(parsedServiceKey.data);

      res.json({ data: setting, message: 'Background service setting updated successfully' });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/background-services/:serviceKey/run-now',
  authenticate,
  requirePermission(PERMISSIONS.SETTINGS_WRITE),
  sensitiveRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedServiceKey = backgroundServiceKeySchema.safeParse(req.params.serviceKey);
      if (!parsedServiceKey.success) {
        throw handleZodError(parsedServiceKey.error);
      }

      await runServiceNow(parsedServiceKey.data);
      const setting = await getBackgroundServiceSetting(parsedServiceKey.data);
      res.json({ data: setting, message: 'Background service run triggered' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
