import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import {
  ensureManagerAccountAccess,
  ensureOwnershipAccess,
  verifyOwnership,
} from '../middleware/ownership';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import {
  listQuotations,
  getQuotationById,
  getQuotationByNumber,
  createQuotation,
  updateQuotation,
  sendQuotation,
  acceptQuotation,
  rejectQuotation,
  archiveQuotation,
  restoreQuotation,
  deleteQuotation,
  logQuotationActivity,
  setQuotationPricingApproval,
} from '../services/quotationService';
import { generatePublicToken } from '../services/quotationPublicService';
import { sendEmail } from '../services/emailService';
import { buildQuotationEmailHtmlWithBranding, buildQuotationEmailSubject } from '../templates/quotationEmail';
import { generateQuotationPdf } from '../services/pdfService';
import { getDefaultBranding, getGlobalSettings } from '../services/globalSettingsService';
import logger from '../lib/logger';
import { isEmailConfigured } from '../config/email';
import { requireFrontendBaseUrl } from '../lib/appUrl';
import {
  createQuotationSchema,
  updateQuotationSchema,
  listQuotationsQuerySchema,
  sendQuotationSchema,
  acceptQuotationSchema,
  rejectQuotationSchema,
  quotationPricingApprovalSchema,
} from '../schemas/quotation';
import type { ZodError } from 'zod';
import { PERMISSIONS } from '../types';

const router: Router = Router();
type QuotationPdfPayload = NonNullable<Awaited<ReturnType<typeof getQuotationById>>>;

function requireAuthenticatedUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) {
    throw new ValidationError('User not authenticated');
  }

  return req.user;
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

      const result = await listQuotations(parsed.data, {
        userRole: req.user?.role,
        userId: req.user?.id,
      });
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

      if (!quotation) {
        throw new NotFoundError('Quotation not found');
      }

      await ensureOwnershipAccess(req.user, {
        resourceType: 'quotation',
        resourceId: quotation.id,
        path: req.path,
        method: req.method,
      });

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

      await ensureManagerAccountAccess(req.user, parsed.data.accountId, {
        path: req.path,
        method: req.method,
      });
      const user = requireAuthenticatedUser(req);

      const quotation = await createQuotation({
        ...parsed.data,
        createdByUserId: user.id,
      });

      await logQuotationActivity({
        quotationId: quotation.id,
        action: 'created',
        performedByUserId: user.id,
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
  verifyOwnership({ resourceType: 'quotation' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateQuotationSchema.safeParse(req.body);
      if (!parsed.success) throw handleZodError(parsed.error);
      const user = requireAuthenticatedUser(req);

      const quotation = await updateQuotation(req.params.id, {
        ...parsed.data,
        updatedByUserId: user.id,
      });

      await logQuotationActivity({
        quotationId: quotation.id,
        action: 'updated',
        performedByUserId: user.id,
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
  verifyOwnership({ resourceType: 'quotation' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = sendQuotationSchema.safeParse(req.body);
      if (!parsed.success) throw handleZodError(parsed.error);

      const frontendBaseUrl = requireFrontendBaseUrl();
      const quotation = await sendQuotation(req.params.id);
      const user = requireAuthenticatedUser(req);

      // Generate public token
      const token = await generatePublicToken(quotation.id);
      const publicUrl = `${frontendBaseUrl}/q/${token}`;

      await logQuotationActivity({
        quotationId: quotation.id,
        action: 'sent',
        performedByUserId: user.id,
        metadata: { publicUrl },
      });

      // Send email if configured and recipient provided
      const emailTo = parsed.data?.emailTo ?? quotation.account.billingEmail;
      if (emailTo && isEmailConfigured()) {
        try {
          logger.info(`Generating PDF for quotation ${quotation.quotationNumber}`);
          const pdfBuffer = await generateQuotationPdf(quotation as QuotationPdfPayload);

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
          await sendEmail({
            to: emailTo,
            subject,
            html,
            attachments: [{
              filename: `${quotation.quotationNumber}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            }],
          });
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

router.post(
  '/:id/public-link',
  authenticate,
  requirePermission(PERMISSIONS.QUOTATIONS_READ),
  verifyOwnership({ resourceType: 'quotation' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quotation = await getQuotationById(req.params.id);
      if (!quotation) {
        throw new NotFoundError('Quotation not found');
      }

      const frontendBaseUrl = requireFrontendBaseUrl();
      const token = await generatePublicToken(req.params.id);

      res.json({
        data: {
          publicUrl: `${frontendBaseUrl}/q/${token}`,
        },
      });
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
  verifyOwnership({ resourceType: 'quotation' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = acceptQuotationSchema.safeParse(req.body);
      if (!parsed.success) throw handleZodError(parsed.error);
      const user = requireAuthenticatedUser(req);

      const quotation = await acceptQuotation(req.params.id, parsed.data?.signatureName);

      await logQuotationActivity({
        quotationId: quotation.id,
        action: 'accepted',
        performedByUserId: user.id,
      });

      res.json({ data: quotation });
    } catch (error) {
      next(error);
    }
  }
);

// Approve or reject quotation pricing (internal review)
router.post(
  '/:id/pricing-approval',
  authenticate,
  requirePermission(PERMISSIONS.QUOTATIONS_ADMIN),
  verifyOwnership({ resourceType: 'quotation' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = quotationPricingApprovalSchema.safeParse(req.body);
      if (!parsed.success) throw handleZodError(parsed.error);
      const user = requireAuthenticatedUser(req);

      const quotation = await setQuotationPricingApproval({
        quotationId: req.params.id,
        action: parsed.data.action,
        reason: parsed.data.reason,
        performedByUserId: user.id,
      });

      await logQuotationActivity({
        quotationId: quotation.id,
        action: `pricing_approval_${parsed.data.action}`,
        performedByUserId: user.id,
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
  verifyOwnership({ resourceType: 'quotation' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = rejectQuotationSchema.safeParse(req.body);
      if (!parsed.success) throw handleZodError(parsed.error);
      const user = requireAuthenticatedUser(req);

      const quotation = await rejectQuotation(req.params.id, parsed.data.rejectionReason);

      await logQuotationActivity({
        quotationId: quotation.id,
        action: 'rejected',
        performedByUserId: user.id,
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
  verifyOwnership({ resourceType: 'quotation' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = requireAuthenticatedUser(req);
      const quotation = await archiveQuotation(req.params.id);

      await logQuotationActivity({
        quotationId: quotation.id,
        action: 'archived',
        performedByUserId: user.id,
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
  verifyOwnership({ resourceType: 'quotation' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = requireAuthenticatedUser(req);
      const quotation = await restoreQuotation(req.params.id);

      await logQuotationActivity({
        quotationId: quotation.id,
        action: 'restored',
        performedByUserId: user.id,
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
  verifyOwnership({ resourceType: 'quotation' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteQuotation(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// Download quotation as PDF
router.get(
  '/:id/pdf',
  authenticate,
  requirePermission(PERMISSIONS.QUOTATIONS_READ),
  verifyOwnership({ resourceType: 'quotation' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quotation = await getQuotationById(req.params.id);
      if (!quotation) {
        throw new NotFoundError('Quotation not found');
      }

      const pdfBuffer = await generateQuotationPdf(quotation as QuotationPdfPayload);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${quotation.quotationNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      });

      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
