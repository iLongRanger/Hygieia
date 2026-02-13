import { Router, Request, Response, NextFunction } from 'express';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import {
  getContractByPublicToken,
  markPublicViewed,
  signContractPublic,
} from '../services/contractPublicService';
import { logContractActivity } from '../services/contractActivityService';
import { generateContractPdf } from '../services/pdfService';
import { sendNotificationEmail } from '../services/emailService';
import { getDefaultBranding, getGlobalSettings } from '../services/globalSettingsService';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';
import { publicSignContractSchema } from '../schemas/publicContract';
import { ZodError } from 'zod';
import rateLimit from 'express-rate-limit';

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

async function getContractNotificationRecipients(contractId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      contractNumber: true,
      title: true,
      monthlyValue: true,
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

  return { contract, adminUsers };
}

// Get contract by public token
router.get(
  '/:token',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contract = await getContractByPublicToken(req.params.token);
      if (!contract) {
        throw new NotFoundError('Contract not found or link has expired');
      }

      const viewResult = await markPublicViewed(req.params.token, req.ip);
      if (viewResult) {
        await logContractActivity({
          contractId: viewResult.id,
          action: 'public_viewed',
          metadata: { ipAddress: req.ip },
        });
      }

      const branding = await getGlobalSettings().catch(() => getDefaultBranding());
      res.json({ data: contract, branding });
    } catch (error) {
      next(error);
    }
  }
);

// Sign contract via public token
router.post(
  '/:token/sign',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = publicSignContractSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const contract = await signContractPublic(
        req.params.token,
        parsed.data.signedByName,
        parsed.data.signedByEmail,
        req.ip
      );

      await logContractActivity({
        contractId: contract.id,
        action: 'public_signed',
        metadata: {
          signedByName: parsed.data.signedByName,
          signedByEmail: parsed.data.signedByEmail,
          ipAddress: req.ip,
        },
      });

      // Notify admins and contract creator (fire-and-forget)
      try {
        const { contract: fullContract, adminUsers } = await getContractNotificationRecipients(contract.id);
        if (fullContract) {
          const recipientUserIds = new Set<string>();
          if (fullContract.createdByUser) {
            recipientUserIds.add(fullContract.createdByUser.id);
          }
          for (const admin of adminUsers) {
            recipientUserIds.add(admin.id);
          }

          await prisma.notification.createMany({
            data: [...recipientUserIds].map((userId) => ({
              userId,
              type: 'contract_signed',
              title: `Contract ${fullContract.contractNumber} signed`,
              body: `${fullContract.account.name} has signed contract "${fullContract.title}".`,
              metadata: { contractId: contract.id },
            })),
          });

          const branding = await getGlobalSettings().catch(() => getDefaultBranding());
          const emailRecipients = new Set<string>();
          if (fullContract.createdByUser?.email) {
            emailRecipients.add(fullContract.createdByUser.email);
          }
          if (branding.companyEmail) {
            emailRecipients.add(branding.companyEmail);
          }

          const subject = `Contract ${fullContract.contractNumber} signed by ${parsed.data.signedByName}`;
          const html = `<p>${parsed.data.signedByName} (${parsed.data.signedByEmail}) has signed contract <strong>${fullContract.contractNumber}: ${fullContract.title}</strong> for ${fullContract.account.name}.</p>`;

          await Promise.allSettled(
            [...emailRecipients].map((email) => sendNotificationEmail(email, subject, html))
          );
        }
      } catch (notifyError) {
        logger.error('Failed to send contract signing notifications:', notifyError);
      }

      res.json({ data: contract, message: 'Contract signed successfully' });
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
      const contract = await getContractByPublicToken(req.params.token);
      if (!contract) {
        throw new NotFoundError('Contract not found or link has expired');
      }

      const pdfBuffer = await generateContractPdf(contract as any);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${contract.contractNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      });

      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
