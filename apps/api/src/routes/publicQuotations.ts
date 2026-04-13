import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import {
  getQuotationByPublicToken,
  markPublicViewed,
  acceptQuotationPublic,
  rejectQuotationPublic,
} from '../services/quotationPublicService';
import {
  logQuotationActivity,
} from '../services/quotationService';
import { getDefaultBranding, getGlobalSettings } from '../services/globalSettingsService';
import { generateQuotationPdf } from '../services/pdfService';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';
import { publicAcceptQuotationSchema, publicRejectQuotationSchema } from '../schemas/quotation';
import type { ZodError } from 'zod';
import rateLimit from 'express-rate-limit';
import { createBulkNotifications } from '../services/notificationService';

const router: Router = Router();
type PublicQuotationPayload = NonNullable<Awaited<ReturnType<typeof getQuotationByPublicToken>>>;

const publicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Too many requests, please try again later.' },
});

router.use(publicRateLimiter);

async function getNotificationRecipients(quotationId: string) {
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    select: {
      quotationNumber: true,
      title: true,
      totalAmount: true,
      account: { select: { name: true } },
      createdByUser: { select: { id: true, email: true } },
    },
  });

  const adminUsers = await prisma.user.findMany({
    where: {
      status: 'active',
      roles: { some: { role: { key: { in: ['owner', 'admin'] } } } },
    },
    select: { id: true, email: true },
  });

  return { quotation, adminUsers };
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

// Get quotation by public token
router.get(
  '/:token',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quotation = await getQuotationByPublicToken(req.params.token);
      if (!quotation) {
        throw new NotFoundError('Quotation not found or link has expired');
      }

      const viewResult = await markPublicViewed(req.params.token, req.ip);
      if (viewResult?.newlyViewed) {
        await logQuotationActivity({
          quotationId: viewResult.id,
          action: 'public_viewed',
          ipAddress: req.ip,
        });
      }

      const branding = await getGlobalSettings().catch(() => getDefaultBranding());
      res.json({ data: quotation, branding });
    } catch (error) {
      next(error);
    }
  }
);

// Accept quotation via public token
router.post(
  '/:token/accept',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = publicAcceptQuotationSchema.safeParse(req.body);
      if (!parsed.success) throw handleZodError(parsed.error);

      const result = await acceptQuotationPublic(
        req.params.token,
        parsed.data.signatureName,
        req.ip
      );

      if (result.acceptedNow) {
        await logQuotationActivity({
          quotationId: result.quotation.id,
          action: 'public_accepted',
          ipAddress: req.ip,
          metadata: {
            signatureName: parsed.data.signatureName,
          },
        });

        // Notify admins
        try {
          const { quotation: fullQuotation, adminUsers } = await getNotificationRecipients(result.quotation.id);
          if (fullQuotation) {
            const recipientUserIds = new Set<string>();
            if (fullQuotation.createdByUser) recipientUserIds.add(fullQuotation.createdByUser.id);
            for (const admin of adminUsers) recipientUserIds.add(admin.id);

            await createBulkNotifications([...recipientUserIds], {
              type: 'quotation_accepted',
              title: `Quotation ${fullQuotation.quotationNumber} accepted`,
              body: `${fullQuotation.account.name} has accepted quotation "${fullQuotation.title}".`,
              metadata: { quotationId: result.quotation.id },
            });
          }
        } catch (notifyError) {
          logger.error('Failed to send quotation acceptance notifications:', notifyError);
        }
      }

      res.json({
        data: result.quotation,
        message: result.acceptedNow ? 'Quotation accepted successfully' : 'Quotation already accepted',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Reject quotation via public token
router.post(
  '/:token/reject',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = publicRejectQuotationSchema.safeParse(req.body);
      if (!parsed.success) throw handleZodError(parsed.error);

      const result = await rejectQuotationPublic(
        req.params.token,
        parsed.data.rejectionReason,
        req.ip
      );

      if (result.rejectedNow) {
        await logQuotationActivity({
          quotationId: result.quotation.id,
          action: 'public_rejected',
          ipAddress: req.ip,
          metadata: { rejectionReason: parsed.data.rejectionReason },
        });

        // Notify admins
        try {
          const { quotation: fullQuotation, adminUsers } = await getNotificationRecipients(
            result.quotation.id
          );
          if (fullQuotation) {
            const recipientUserIds = new Set<string>();
            if (fullQuotation.createdByUser) recipientUserIds.add(fullQuotation.createdByUser.id);
            for (const admin of adminUsers) recipientUserIds.add(admin.id);

            await createBulkNotifications([...recipientUserIds], {
              type: 'quotation_rejected',
              title: `Quotation ${fullQuotation.quotationNumber} rejected`,
              body: `${fullQuotation.account.name} has rejected quotation "${fullQuotation.title}".`,
              metadata: { quotationId: result.quotation.id },
            });
          }
        } catch (notifyError) {
          logger.error('Failed to send quotation rejection notifications:', notifyError);
        }
      }

      res.json({
        data: result.quotation,
        message: result.rejectedNow ? 'Quotation rejected' : 'Quotation already rejected',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Download PDF via public token
router.get(
  '/:token/pdf',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quotation = await getQuotationByPublicToken(req.params.token);
      if (!quotation) {
        throw new NotFoundError('Quotation not found or link has expired');
      }

      const pdfBuffer = await generateQuotationPdf(quotation as PublicQuotationPayload);

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
