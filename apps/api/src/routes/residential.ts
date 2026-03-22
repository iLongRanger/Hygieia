import { Router, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import { ensureOwnershipAccess } from '../middleware/ownership';
import { PERMISSIONS } from '../types';
import { isEmailConfigured } from '../config/email';
import { requireFrontendBaseUrl } from '../lib/appUrl';
import logger from '../lib/logger';
import { sendNotificationEmail } from '../services/emailService';
import { getDefaultBranding, getGlobalSettings } from '../services/globalSettingsService';
import {
  archiveResidentialPricingPlan,
  archiveResidentialQuote,
  acceptResidentialQuote,
  convertResidentialQuoteToContract,
  createResidentialPricingPlan,
  createResidentialQuote,
  declineResidentialQuote,
  getDefaultResidentialPricingPlan,
  getResidentialPricingPlanById,
  getResidentialQuoteById,
  generateResidentialQuotePublicToken,
  listResidentialPricingPlans,
  listResidentialQuotes,
  previewResidentialQuote,
  restoreResidentialPricingPlan,
  restoreResidentialQuote,
  sendResidentialQuote,
  setDefaultResidentialPricingPlan,
  updateResidentialPricingPlan,
  updateResidentialQuote,
} from '../services/residentialService';
import {
  convertResidentialQuoteSchema,
  createResidentialPricingPlanSchema,
  createResidentialQuoteSchema,
  declineResidentialQuoteSchema,
  listResidentialPricingPlansQuerySchema,
  listResidentialQuotesQuerySchema,
  sendResidentialQuoteSchema,
  residentialQuotePreviewSchema,
  updateResidentialPricingPlanSchema,
  updateResidentialQuoteSchema,
} from '../schemas/residential';
import {
  buildResidentialQuoteEmailHtmlWithBranding,
  buildResidentialQuoteEmailSubject,
} from '../templates/residentialQuoteEmail';

const router: Router = Router();

function handleZodError(error: ZodError): ValidationError {
  const firstError = error.errors[0];
  return new ValidationError(firstError.message, {
    field: firstError.path.join('.'),
    errors: error.errors.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  });
}

async function getBrandingSafe() {
  try {
    return await getGlobalSettings();
  } catch {
    return getDefaultBranding();
  }
}

router.get(
  '/pricing-plans',
  authenticate,
  requirePermission(PERMISSIONS.PRICING_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listResidentialPricingPlansQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const result = await listResidentialPricingPlans(parsed.data);
      res.json({ data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/pricing-plans/default',
  authenticate,
  requirePermission(PERMISSIONS.PRICING_READ),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const plan = await getDefaultResidentialPricingPlan();
      if (!plan) {
        throw new NotFoundError('No residential pricing plan found');
      }
      res.json({ data: plan });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/pricing-plans/:id',
  authenticate,
  requirePermission(PERMISSIONS.PRICING_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const plan = await getResidentialPricingPlanById(req.params.id);
      if (!plan) {
        throw new NotFoundError('Residential pricing plan not found');
      }
      res.json({ data: plan });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/pricing-plans',
  authenticate,
  requirePermission(PERMISSIONS.PRICING_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createResidentialPricingPlanSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }
      const plan = await createResidentialPricingPlan(parsed.data, req.user!.id);
      res.status(201).json({ data: plan });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/pricing-plans/:id',
  authenticate,
  requirePermission(PERMISSIONS.PRICING_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getResidentialPricingPlanById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Residential pricing plan not found');
      }
      const parsed = updateResidentialPricingPlanSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }
      const plan = await updateResidentialPricingPlan(req.params.id, parsed.data);
      res.json({ data: plan });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/pricing-plans/:id/set-default',
  authenticate,
  requirePermission(PERMISSIONS.PRICING_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const plan = await setDefaultResidentialPricingPlan(req.params.id);
      res.json({ data: plan });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/pricing-plans/:id/archive',
  authenticate,
  requirePermission(PERMISSIONS.PRICING_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const plan = await archiveResidentialPricingPlan(req.params.id);
      res.json({ data: plan });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/pricing-plans/:id/restore',
  authenticate,
  requirePermission(PERMISSIONS.PRICING_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const plan = await restoreResidentialPricingPlan(req.params.id);
      res.json({ data: plan });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/quotes',
  authenticate,
  requirePermission(PERMISSIONS.QUOTATIONS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listResidentialQuotesQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }
      const result = await listResidentialQuotes(parsed.data, {
        userRole: req.user?.role,
        userId: req.user?.id,
      });
      res.json({ data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/quotes/preview',
  authenticate,
  requirePermission(PERMISSIONS.QUOTATIONS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = residentialQuotePreviewSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }
      const preview = await previewResidentialQuote(parsed.data);
      res.json({ data: preview });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/quotes/:id',
  authenticate,
  requirePermission(PERMISSIONS.QUOTATIONS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quote = await getResidentialQuoteById(req.params.id, {
        userRole: req.user?.role,
        userId: req.user?.id,
      });
      if (!quote) {
        throw new NotFoundError('Residential quote not found');
      }
      res.json({ data: quote });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/quotes',
  authenticate,
  requirePermission(PERMISSIONS.QUOTATIONS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createResidentialQuoteSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }
      await ensureOwnershipAccess(req.user, {
        resourceType: 'account',
        resourceId: parsed.data.accountId,
        path: req.path,
        method: req.method,
      });
      const quote = await createResidentialQuote(parsed.data, req.user!.id);
      res.status(201).json({ data: quote });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/quotes/:id',
  authenticate,
  requirePermission(PERMISSIONS.QUOTATIONS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getResidentialQuoteById(req.params.id, {
        userRole: req.user?.role,
        userId: req.user?.id,
      });
      if (!existing) {
        throw new NotFoundError('Residential quote not found');
      }
      const parsed = updateResidentialQuoteSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }
      if (parsed.data.accountId) {
        await ensureOwnershipAccess(req.user, {
          resourceType: 'account',
          resourceId: parsed.data.accountId,
          path: req.path,
          method: req.method,
        });
      }
      const quote = await updateResidentialQuote(req.params.id, parsed.data);
      res.json({ data: quote });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/quotes/:id/send',
  authenticate,
  requirePermission(PERMISSIONS.QUOTATIONS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = sendResidentialQuoteSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }
      const frontendBaseUrl = requireFrontendBaseUrl();
      const existing = await getResidentialQuoteById(req.params.id, {
        userRole: req.user?.role,
        userId: req.user?.id,
      });
      if (!existing) {
        throw new NotFoundError('Residential quote not found');
      }
      const quote = await sendResidentialQuote(req.params.id);
      const token = await generateResidentialQuotePublicToken(quote.id);
      const publicUrl = `${frontendBaseUrl}/rq/${token}`;
      const emailTo = parsed.data.emailTo ?? quote.customerEmail ?? quote.account?.billingEmail ?? null;

      if (emailTo && isEmailConfigured()) {
        try {
          const branding = await getBrandingSafe();
          const html = buildResidentialQuoteEmailHtmlWithBranding(
            {
              quoteNumber: quote.quoteNumber,
              title: quote.title,
              customerName: quote.customerName,
              totalAmount: new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(Number(quote.totalAmount)),
              preferredStartDate: quote.preferredStartDate
                ? new Date(quote.preferredStartDate).toLocaleDateString()
                : null,
              publicViewUrl: publicUrl,
            },
            branding
          );
          const subject = buildResidentialQuoteEmailSubject(quote.quoteNumber, quote.title);
          await sendNotificationEmail(emailTo, subject, html);
        } catch (emailError) {
          logger.error('Failed to send residential quote email:', emailError);
        }
      }

      const updated = await getResidentialQuoteById(quote.id);
      res.json({ data: updated, publicUrl, emailTo });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/quotes/:id/accept',
  authenticate,
  requirePermission(PERMISSIONS.QUOTATIONS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getResidentialQuoteById(req.params.id, {
        userRole: req.user?.role,
        userId: req.user?.id,
      });
      if (!existing) {
        throw new NotFoundError('Residential quote not found');
      }
      const quote = await acceptResidentialQuote(req.params.id);
      res.json({ data: quote });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/quotes/:id/decline',
  authenticate,
  requirePermission(PERMISSIONS.QUOTATIONS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = declineResidentialQuoteSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }
      const existing = await getResidentialQuoteById(req.params.id, {
        userRole: req.user?.role,
        userId: req.user?.id,
      });
      if (!existing) {
        throw new NotFoundError('Residential quote not found');
      }
      const quote = await declineResidentialQuote(req.params.id, parsed.data);
      res.json({ data: quote });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/quotes/:id/convert',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = convertResidentialQuoteSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }
      const existing = await getResidentialQuoteById(req.params.id, {
        userRole: req.user?.role,
        userId: req.user?.id,
      });
      if (!existing) {
        throw new NotFoundError('Residential quote not found');
      }
      const contract = await convertResidentialQuoteToContract(req.params.id, parsed.data, req.user!.id);
      res.json({ data: contract });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/quotes/:id/archive',
  authenticate,
  requirePermission(PERMISSIONS.QUOTATIONS_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getResidentialQuoteById(req.params.id, {
        userRole: req.user?.role,
        userId: req.user?.id,
      });
      if (!existing) {
        throw new NotFoundError('Residential quote not found');
      }
      const quote = await archiveResidentialQuote(req.params.id);
      res.json({ data: quote });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/quotes/:id/restore',
  authenticate,
  requirePermission(PERMISSIONS.QUOTATIONS_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getResidentialQuoteById(req.params.id, {
        userRole: req.user?.role,
        userId: req.user?.id,
      });
      if (!existing) {
        throw new NotFoundError('Residential quote not found');
      }
      const quote = await restoreResidentialQuote(req.params.id);
      res.json({ data: quote });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
