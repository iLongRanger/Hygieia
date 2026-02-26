import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import {
  listQuotations,
  getQuotationById,
  getQuotationByNumber,
  createQuotation,
  updateQuotation,
  sendQuotation,
  markQuotationAsViewed,
  acceptQuotation,
  rejectQuotation,
  archiveQuotation,
  restoreQuotation,
  deleteQuotation,
  logQuotationActivity,
  setQuotationPricingApproval,
} from '../services/quotationService';
import { generatePublicToken } from '../services/quotationPublicService';
import { sendNotificationEmail } from '../services/emailService';
import { buildQuotationEmailHtmlWithBranding, buildQuotationEmailSubject } from '../templates/quotationEmail';
import { getDefaultBranding, getGlobalSettings } from '../services/globalSettingsService';
import logger from '../lib/logger';
import { isEmailConfigured } from '../config/email';
import {
  createQuotationSchema,
  updateQuotationSchema,
  listQuotationsQuerySchema,
  sendQuotationSchema,
  acceptQuotationSchema,
  rejectQuotationSchema,
  quotationPricingApprovalSchema,
} from '../schemas/quotation';
import { ZodError } from 'zod';
import { PERMISSIONS } from '../types';

const router: Router = Router();

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

async function getBrandingSafe() {
  try {
    return await getGlobalSettings();
  } catch {
    return getDefaultBranding();
  }
}

// List all quotations
router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.QUOTATIONS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listQuotationsQuerySchema.safeParse(req.query);
      if (!parsed.success) throw handleZodError(parsed.error);

      const result = await listQuotations(parsed.data);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Get quotation by ID
router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.QUOTATIONS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Try UUID first, then quotation number
      const identifier = req.params.id;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

      const quotation = isUuid
        ? await getQuotationById(identifier)
        : await getQuotationByNumber(identifier);

      res.json({ data: quotation });
    } catch (error) {
      next(error);
    }
  }
);

// Create quotation
router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.QUOTATIONS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createQuotationSchema.safeParse(req.body);
      if (!parsed.success) throw handleZodError(parsed.error);

      const quotation = await createQuotation({
        ...parsed.data,
        createdByUserId: req.user!.id,
      });

      await logQuotationActivity({
        quotationId: quotation.id,
        action: 'created',
        performedByUserId: req.user!.id,
      });

      res.status(201).json({ data: quotation });
    } catch (error) {
      next(error);
    }
  }
);

// Update quotation
router.put(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.QUOTATIONS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateQuotationSchema.safeParse(req.body);
      if (!parsed.success) throw handleZodError(parsed.error);

      const quotation = await updateQuotation(req.params.id, {
        ...parsed.data,
        updatedByUserId: req.user!.id,
      });

      await logQuotationActivity({
        quotationId: quotation.id,
        action: 'updated',
        performedByUserId: req.user!.id,
      });

      res.json({ data: quotation });
    } catch (error) {
      next(error);
    }
  }
);

// Send quotation
router.post(
  '/:id/send',
  authenticate,
  requirePermission(PERMISSIONS.QUOTATIONS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = sendQuotationSchema.safeParse(req.body);
      if (!parsed.success) throw handleZodError(parsed.error);

      const quotation = await sendQuotation(req.params.id);

      // Generate public token
      const token = await generatePublicToken(quotation.id);
      const requestOrigin = typeof req.headers.origin === 'string' ? req.headers.origin : null;
      const frontendBaseUrl = process.env.FRONTEND_URL || requestOrigin || 'http://localhost:5173';
      const publicUrl = `${frontendBaseUrl}/q/${token}`;

      await logQuotationActivity({
        quotationId: quotation.id,
        action: 'sent',
        performedByUserId: req.user!.id,
        metadata: { publicUrl },
      });

      // Send email if configured and recipient provided
      const emailTo = parsed.data?.emailTo || quotation.account.billingEmail;
      if (emailTo && isEmailConfigured()) {
        try {
          const branding = await getBrandingSafe();
          const html = buildQuotationEmailHtmlWithBranding(
            {
              quotationNumber: quotation.quotationNumber,
              title: quotation.title,
              accountName: quotation.account.name,
              totalAmount: new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(Number(quotation.totalAmount)),
              validUntil: quotation.validUntil
                ? new Date(quotation.validUntil).toLocaleDateString()
                : null,
              publicViewUrl: publicUrl,
            },
            branding
          );
          const subject = buildQuotationEmailSubject(quotation.quotationNumber, quotation.title);
          await sendNotificationEmail(emailTo, subject, html);
        } catch (emailError) {
          logger.error('Failed to send quotation email:', emailError);
        }
      }

      // Refetch to include updated publicToken
      const updated = await getQuotationById(quotation.id);
      res.json({ data: updated, publicUrl });
    } catch (error) {
      next(error);
    }
  }
);

// Accept quotation (internal)
router.post(
  '/:id/accept',
  authenticate,
  requirePermission(PERMISSIONS.QUOTATIONS_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = acceptQuotationSchema.safeParse(req.body);
      if (!parsed.success) throw handleZodError(parsed.error);

      const quotation = await acceptQuotation(req.params.id, parsed.data?.signatureName);

      await logQuotationActivity({
        quotationId: quotation.id,
        action: 'accepted',
        performedByUserId: req.user!.id,
      });

      res.json({ data: quotation });
    } catch (error) {
      next(error);
    }
  }
);

// Reject quotation (internal)
router.post(
  '/:id/pricing-approval',
  authenticate,
  requirePermission(PERMISSIONS.QUOTATIONS_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = quotationPricingApprovalSchema.safeParse(req.body);
      if (!parsed.success) throw handleZodError(parsed.error);

      const quotation = await setQuotationPricingApproval({
        quotationId: req.params.id,
        action: parsed.data.action,
        reason: parsed.data.reason,
        performedByUserId: req.user!.id,
      });

      await logQuotationActivity({
        quotationId: quotation.id,
        action: `pricing_approval_${parsed.data.action}`,
        performedByUserId: req.user!.id,
        metadata: parsed.data.reason ? { reason: parsed.data.reason } : undefined,
      });

      res.json({ data: quotation });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/reject',
  authenticate,
  requirePermission(PERMISSIONS.QUOTATIONS_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = rejectQuotationSchema.safeParse(req.body);
      if (!parsed.success) throw handleZodError(parsed.error);

      const quotation = await rejectQuotation(req.params.id, parsed.data.rejectionReason);

      await logQuotationActivity({
        quotationId: quotation.id,
        action: 'rejected',
        performedByUserId: req.user!.id,
        metadata: { rejectionReason: parsed.data.rejectionReason },
      });

      res.json({ data: quotation });
    } catch (error) {
      next(error);
    }
  }
);

// Archive quotation
router.post(
  '/:id/archive',
  authenticate,
  requirePermission(PERMISSIONS.QUOTATIONS_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quotation = await archiveQuotation(req.params.id);

      await logQuotationActivity({
        quotationId: quotation.id,
        action: 'archived',
        performedByUserId: req.user!.id,
      });

      res.json({ data: quotation });
    } catch (error) {
      next(error);
    }
  }
);

// Restore quotation
router.post(
  '/:id/restore',
  authenticate,
  requirePermission(PERMISSIONS.QUOTATIONS_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quotation = await restoreQuotation(req.params.id);

      await logQuotationActivity({
        quotationId: quotation.id,
        action: 'restored',
        performedByUserId: req.user!.id,
      });

      res.json({ data: quotation });
    } catch (error) {
      next(error);
    }
  }
);

// Delete quotation
router.delete(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.QUOTATIONS_DELETE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteQuotation(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
