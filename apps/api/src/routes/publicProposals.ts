import { Router, Request, Response, NextFunction } from 'express';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import {
  getProposalByPublicToken,
  markPublicViewed,
  acceptProposalPublic,
  rejectProposalPublic,
} from '../services/proposalPublicService';
import { logActivity } from '../services/proposalActivityService';
import { generateProposalPdf } from '../services/pdfService';
import { sendNotificationEmail } from '../services/emailService';
import { buildProposalAcceptedHtml, buildProposalAcceptedSubject } from '../templates/proposalAccepted';
import { buildProposalRejectedHtml, buildProposalRejectedSubject } from '../templates/proposalRejected';
import { companyConfig } from '../config/company';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';
import { publicAcceptSchema, publicRejectSchema } from '../schemas/publicProposal';
import { ZodError } from 'zod';
import rateLimit from 'express-rate-limit';

const router: Router = Router();

// Rate limiting for public endpoints
const publicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { message: 'Too many requests, please try again later.' },
});

router.use(publicRateLimiter);

async function getNotificationRecipients(proposalId: string) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: {
      proposalNumber: true,
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

  return { proposal, adminUsers };
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

// Get proposal by public token
router.get(
  '/:token',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const proposal = await getProposalByPublicToken(req.params.token);
      if (!proposal) {
        throw new NotFoundError('Proposal not found or link has expired');
      }

      // Auto-mark as viewed
      const viewResult = await markPublicViewed(req.params.token, req.ip);
      if (viewResult) {
        await logActivity({
          proposalId: viewResult.id,
          action: 'public_viewed',
          ipAddress: req.ip,
        });
      }

      res.json({ data: proposal });
    } catch (error) {
      next(error);
    }
  }
);

// Accept proposal via public token
router.post(
  '/:token/accept',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = publicAcceptSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const proposal = await acceptProposalPublic(
        req.params.token,
        parsed.data.signatureName,
        req.ip
      );

      await logActivity({
        proposalId: proposal.id,
        action: 'public_accepted',
        ipAddress: req.ip,
        metadata: { signatureName: parsed.data.signatureName },
      });

      // Notify admins and proposal creator (fire-and-forget)
      try {
        const { proposal: fullProposal, adminUsers } = await getNotificationRecipients(proposal.id);
        if (fullProposal) {
          const recipientUserIds = new Set<string>();
          if (fullProposal.createdByUser) {
            recipientUserIds.add(fullProposal.createdByUser.id);
          }
          for (const admin of adminUsers) {
            recipientUserIds.add(admin.id);
          }

          // Create in-app notifications
          await prisma.notification.createMany({
            data: [...recipientUserIds].map((userId) => ({
              userId,
              type: 'proposal_accepted',
              title: `Proposal ${fullProposal.proposalNumber} accepted`,
              body: `${fullProposal.account.name} has accepted proposal "${fullProposal.title}".`,
              metadata: { proposalId: proposal.id },
            })),
          });

          // Send email notifications
          const html = buildProposalAcceptedHtml({
            proposalNumber: fullProposal.proposalNumber,
            title: fullProposal.title,
            accountName: fullProposal.account.name,
            totalAmount: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(fullProposal.totalAmount)),
            acceptedAt: new Date().toLocaleDateString(),
            signatureName: parsed.data.signatureName,
          });
          const subject = buildProposalAcceptedSubject(fullProposal.proposalNumber);

          const emailRecipients = new Set<string>();
          if (fullProposal.createdByUser?.email) {
            emailRecipients.add(fullProposal.createdByUser.email);
          }
          if (companyConfig.email) {
            emailRecipients.add(companyConfig.email);
          }

          await Promise.allSettled(
            [...emailRecipients].map((email) => sendNotificationEmail(email, subject, html))
          );
        }
      } catch (notifyError) {
        logger.error('Failed to send acceptance notifications:', notifyError);
      }

      res.json({ data: proposal, message: 'Proposal accepted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Reject proposal via public token
router.post(
  '/:token/reject',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = publicRejectSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const proposal = await rejectProposalPublic(
        req.params.token,
        parsed.data.rejectionReason,
        req.ip
      );

      await logActivity({
        proposalId: proposal.id,
        action: 'public_rejected',
        ipAddress: req.ip,
        metadata: { rejectionReason: parsed.data.rejectionReason },
      });

      // Notify admins and proposal creator (fire-and-forget)
      try {
        const { proposal: fullProposal, adminUsers } = await getNotificationRecipients(proposal.id);
        if (fullProposal) {
          const recipientUserIds = new Set<string>();
          if (fullProposal.createdByUser) {
            recipientUserIds.add(fullProposal.createdByUser.id);
          }
          for (const admin of adminUsers) {
            recipientUserIds.add(admin.id);
          }

          // Create in-app notifications
          await prisma.notification.createMany({
            data: [...recipientUserIds].map((userId) => ({
              userId,
              type: 'proposal_rejected',
              title: `Proposal ${fullProposal.proposalNumber} rejected`,
              body: `${fullProposal.account.name} has rejected proposal "${fullProposal.title}".`,
              metadata: { proposalId: proposal.id },
            })),
          });

          // Send email notifications
          const html = buildProposalRejectedHtml({
            proposalNumber: fullProposal.proposalNumber,
            title: fullProposal.title,
            accountName: fullProposal.account.name,
            rejectedAt: new Date().toLocaleDateString(),
            rejectionReason: parsed.data.rejectionReason,
          });
          const subject = buildProposalRejectedSubject(fullProposal.proposalNumber);

          const emailRecipients = new Set<string>();
          if (fullProposal.createdByUser?.email) {
            emailRecipients.add(fullProposal.createdByUser.email);
          }
          if (companyConfig.email) {
            emailRecipients.add(companyConfig.email);
          }

          await Promise.allSettled(
            [...emailRecipients].map((email) => sendNotificationEmail(email, subject, html))
          );
        }
      } catch (notifyError) {
        logger.error('Failed to send rejection notifications:', notifyError);
      }

      res.json({ data: proposal, message: 'Proposal rejected' });
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
      const proposal = await getProposalByPublicToken(req.params.token);
      if (!proposal) {
        throw new NotFoundError('Proposal not found or link has expired');
      }

      const pdfBuffer = await generateProposalPdf(proposal as any);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${proposal.proposalNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      });

      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
