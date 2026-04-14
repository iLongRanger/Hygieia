import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { ZodError } from 'zod';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import { createBulkNotifications } from '../services/notificationService';
import { sendNotificationEmail } from '../services/emailService';
import logger from '../lib/logger';
import { prisma } from '../lib/prisma';
import { getDefaultBranding, getGlobalSettings } from '../services/globalSettingsService';
import { logContractActivity } from '../services/contractActivityService';
import { publicSignContractSchema } from '../schemas/publicContract';
import {
  getContractAmendmentByPublicToken,
  markPublicViewed,
  signContractAmendmentPublic,
} from '../services/contractAmendmentPublicService';
import { escapeHtml } from '../utils/escapeHtml';

const router: Router = Router();

const publicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Too many requests, please try again later.' },
});

router.use(publicRateLimiter);

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

async function getAmendmentNotificationRecipients(amendmentId: string) {
  const amendment = await prisma.contractAmendment.findUnique({
    where: { id: amendmentId },
    select: {
      amendmentNumber: true,
      title: true,
      contract: {
        select: {
          id: true,
          contractNumber: true,
          account: {
            select: {
              name: true,
              accountManagerId: true,
            },
          },
        },
      },
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

  return { amendment, adminUsers };
}

router.get('/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const amendment = await getContractAmendmentByPublicToken(req.params.token);
    if (!amendment) {
      throw new NotFoundError('Amendment not found or link has expired');
    }

    const viewResult = await markPublicViewed(req.params.token, req.ip);
    if (viewResult?.newlyViewed) {
      await logContractActivity({
        contractId: amendment.contract.id,
        action: 'public_viewed',
        ipAddress: req.ip,
        metadata: {
          amendmentId: amendment.id,
          amendmentNumber: amendment.amendmentNumber,
        },
      });
    }

    const branding = await getGlobalSettings().catch(() => getDefaultBranding());
    res.json({ data: amendment, branding });
  } catch (error) {
    next(error);
  }
});

router.post('/:token/sign', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = publicSignContractSchema.safeParse(req.body);
    if (!parsed.success) {
      throw handleZodError(parsed.error);
    }

    const result = await signContractAmendmentPublic(
      req.params.token,
      parsed.data.signedByName,
      parsed.data.signedByEmail,
      req.ip
    );

    if (result.signedNow) {
      await logContractActivity({
        contractId: result.amendment.contract.id,
        action: 'public_signed',
        ipAddress: req.ip,
        metadata: {
          amendmentId: result.amendment.id,
          amendmentNumber: result.amendment.amendmentNumber,
          signedByName: parsed.data.signedByName,
          signedByEmail: parsed.data.signedByEmail,
        },
      });

      try {
        const { amendment, adminUsers } = await getAmendmentNotificationRecipients(result.amendment.id);
        if (amendment) {
          const recipientUserIds = new Set<string>();
          recipientUserIds.add(amendment.createdByUser.id);
          if (amendment.contract.account.accountManagerId) {
            recipientUserIds.add(amendment.contract.account.accountManagerId);
          }
          for (const admin of adminUsers) {
            recipientUserIds.add(admin.id);
          }

          await createBulkNotifications([...recipientUserIds], {
            type: 'contract_amendment_signed',
            title: `Contract amendment signed`,
            body:
              `${amendment.contract.account.name} signed amendment #${amendment.amendmentNumber} ` +
              `for contract ${amendment.contract.contractNumber}.`,
            metadata: {
              contractId: amendment.contract.id,
              amendmentId: result.amendment.id,
              amendmentNumber: amendment.amendmentNumber,
            },
          });

          const branding = await getGlobalSettings().catch(() => getDefaultBranding());
          const emailRecipients = new Set<string>();
          if (amendment.createdByUser.email) {
            emailRecipients.add(amendment.createdByUser.email);
          }
          if (branding.companyEmail) {
            emailRecipients.add(branding.companyEmail);
          }

          const safeName = escapeHtml(parsed.data.signedByName);
          const safeEmail = escapeHtml(parsed.data.signedByEmail);
          const subject =
            `Contract amendment #${amendment.amendmentNumber} signed for ${amendment.contract.contractNumber}`;
          const html =
            `<p>${safeName} (${safeEmail}) signed amendment ` +
            `<strong>#${escapeHtml(String(amendment.amendmentNumber))}: ${escapeHtml(amendment.title)}</strong> ` +
            `for contract ${escapeHtml(amendment.contract.contractNumber)}.</p>`;

          await Promise.allSettled(
            [...emailRecipients].map((email) => sendNotificationEmail(email, subject, html))
          );
        }
      } catch (notifyError) {
        logger.error('Failed to send contract amendment signing notifications:', notifyError);
      }
    }

    res.json({
      data: result.amendment,
      message: result.signedNow ? 'Amendment signed successfully' : 'Amendment already signed',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
