import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { verifyOwnership } from '../middleware/ownership';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import {
  listProposals,
  getProposalById,
  getProposalByNumber,
  createProposal,
  updateProposal,
  sendProposal,
  markProposalAsViewed,
  acceptProposal,
  rejectProposal,
  archiveProposal,
  restoreProposal,
  deleteProposal,
  getProposalsAvailableForContract,
  updateProposalServiceTasks,
  lockProposalPricing,
  unlockProposalPricing,
  changeProposalPricingPlan,
  recalculateProposalPricing,
  getProposalPricingPreview,
} from '../services/proposalService';
import { logActivity, getProposalActivities } from '../services/proposalActivityService';
import { createVersion, getVersions, getVersion } from '../services/proposalVersionService';
import { generateProposalPdf } from '../services/pdfService';
import { generatePublicToken } from '../services/proposalPublicService';
import { sendProposalEmail, sendNotificationEmail } from '../services/emailService';
import { buildProposalEmailHtmlWithBranding, buildProposalEmailSubject } from '../templates/proposalEmail';
import { buildProposalAcceptedHtmlWithBranding, buildProposalAcceptedSubject } from '../templates/proposalAccepted';
import { buildProposalRejectedHtmlWithBranding, buildProposalRejectedSubject } from '../templates/proposalRejected';
import { getDefaultBranding, getGlobalSettings } from '../services/globalSettingsService';
import logger from '../lib/logger';
import { isEmailConfigured } from '../config/email';
import {
  createProposalSchema,
  updateProposalSchema,
  listProposalsQuerySchema,
  sendProposalSchema,
  acceptProposalSchema,
  rejectProposalSchema,
  updateServiceTasksSchema,
  changePricingPlanSchema,
  recalculatePricingSchema,
  pricingPreviewQuerySchema,
} from '../schemas/proposal';
import { listActivitiesQuerySchema } from '../schemas/proposalActivity';
import { ZodError } from 'zod';
import { prisma } from '../lib/prisma';
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

// List all proposals
router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSALS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listProposalsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const result = await listProposals(parsed.data);
      res.json({ data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }
);

// Get accepted proposals available for contract creation (no existing contract)
router.get(
  '/available-for-contract',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSALS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accountId = req.query.accountId as string | undefined;
      const proposals = await getProposalsAvailableForContract(accountId);
      res.json({ data: proposals });
    } catch (error) {
      next(error);
    }
  }
);

// Get proposal by ID
router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSALS_READ),
  verifyOwnership({ resourceType: 'proposal' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const proposal = await getProposalById(req.params.id);
      if (!proposal) {
        throw new NotFoundError('Proposal not found');
      }
      res.json({ data: proposal });
    } catch (error) {
      next(error);
    }
  }
);

// Get proposal by proposal number
router.get(
  '/number/:proposalNumber',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSALS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const proposal = await getProposalByNumber(req.params.proposalNumber);
      if (!proposal) {
        throw new NotFoundError('Proposal not found');
      }
      res.json({ data: proposal });
    } catch (error) {
      next(error);
    }
  }
);

// Create new proposal
router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSALS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createProposalSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const proposal = await createProposal({
        accountId: parsed.data.accountId,
        title: parsed.data.title,
        facilityId: parsed.data.facilityId,
        description: parsed.data.description,
        validUntil: parsed.data.validUntil,
        taxRate: parsed.data.taxRate,
        notes: parsed.data.notes,
        proposalItems: parsed.data.proposalItems,
        proposalServices: parsed.data.proposalServices,
        pricingPlanId: parsed.data.pricingPlanId,
        createdByUserId: req.user.id,
      });

      await logActivity({
        proposalId: proposal.id,
        action: 'created',
        performedByUserId: req.user.id,
        ipAddress: req.ip,
        metadata: { title: proposal.title },
      });

      res.status(201).json({ data: proposal });
    } catch (error) {
      next(error);
    }
  }
);

// Update proposal
router.patch(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSALS_WRITE),
  verifyOwnership({ resourceType: 'proposal' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateProposalSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const proposal = await getProposalById(req.params.id);
      if (!proposal) {
        throw new NotFoundError('Proposal not found');
      }

      // Prevent editing accepted or rejected proposals
      if (['accepted', 'rejected'].includes(proposal.status)) {
        throw new ValidationError(
          `Cannot edit proposal with status: ${proposal.status}. Please create a new proposal instead.`
        );
      }

      // Revert sent/viewed proposals back to draft when editing
      if (['sent', 'viewed'].includes(proposal.status)) {
        await createVersion(req.params.id, req.user!.id, 'Revised after sending');
      }

      const updateData: any = {
        accountId: parsed.data.accountId,
        facilityId: parsed.data.facilityId,
        title: parsed.data.title,
        status: ['sent', 'viewed'].includes(proposal.status) ? 'draft' : parsed.data.status,
        description: parsed.data.description,
        validUntil: parsed.data.validUntil,
        taxRate: parsed.data.taxRate,
        notes: parsed.data.notes,
      };

      if (parsed.data.proposalItems !== undefined) {
        updateData.proposalItems = parsed.data.proposalItems;
      }

      if (parsed.data.proposalServices !== undefined) {
        updateData.proposalServices = parsed.data.proposalServices;
      }

      if (
        parsed.data.pricingPlanId !== undefined
        && parsed.data.pricingPlanId !== proposal.pricingPlanId
      ) {
        if (!parsed.data.pricingPlanId) {
          throw new ValidationError('Pricing plan is required');
        }
        await changeProposalPricingPlan(req.params.id, parsed.data.pricingPlanId);
      }

      const updated = await updateProposal(req.params.id, updateData);

      await logActivity({
        proposalId: req.params.id,
        action: 'updated',
        performedByUserId: req.user!.id,
        ipAddress: req.ip,
      });

      res.json({ data: updated });
    } catch (error) {
      next(error);
    }
  }
);

// Send proposal
router.post(
  '/:id/send',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSALS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = sendProposalSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const proposal = await getProposalById(req.params.id);
      if (!proposal) {
        throw new NotFoundError('Proposal not found');
      }

      if (proposal.status !== 'draft') {
        throw new ValidationError('Only draft proposals can be sent');
      }

      // 1. Lock pricing if not already locked
      if (!proposal.pricingLocked) {
        await lockProposalPricing(req.params.id);
      }

      // 2. Create version snapshot
      await createVersion(req.params.id, req.user!.id, 'Proposal sent');

      // 3. Generate public token
      const publicToken = await generatePublicToken(req.params.id);

      // 4. Mark as sent
      const sent = await sendProposal(req.params.id);

      // 5. Log activity
      await logActivity({
        proposalId: req.params.id,
        action: 'sent',
        performedByUserId: req.user!.id,
        ipAddress: req.ip,
        metadata: {
          emailTo: parsed.data.emailTo,
          emailCc: parsed.data.emailCc,
        },
      });

      // 6. Auto-resolve recipient from account contacts if not provided
      let emailTo = parsed.data.emailTo;
      let emailCc = parsed.data.emailCc || [];
      if (!emailTo) {
        const contacts = await prisma.contact.findMany({
          where: { accountId: proposal.account.id, archivedAt: null, email: { not: null } },
          select: { email: true, isPrimary: true },
          orderBy: { isPrimary: 'desc' },
        });
        const primary = contacts.find((c) => c.isPrimary);
        if (primary?.email) {
          emailTo = primary.email;
          emailCc = contacts
            .filter((c) => !c.isPrimary && c.email)
            .map((c) => c.email!);
        }
      }

      if (emailTo) {
        if (!isEmailConfigured()) {
          logger.warn('Email not configured — skipping proposal email send');
        } else {
          try {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const publicViewUrl = `${frontendUrl}/p/${publicToken}`;

            logger.info(`Generating PDF for proposal ${sent.proposalNumber}`);
            const pdfBuffer = await generateProposalPdf(sent as any);

            const emailSubject = parsed.data.emailSubject || buildProposalEmailSubject(
              sent.proposalNumber,
              sent.title
            );
            const branding = await getBrandingSafe();
            const emailHtml = buildProposalEmailHtmlWithBranding({
              proposalNumber: sent.proposalNumber,
              title: sent.title,
              accountName: sent.account.name,
              totalAmount: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(sent.totalAmount)),
              validUntil: sent.validUntil ? new Date(sent.validUntil).toLocaleDateString() : null,
              publicViewUrl,
            }, branding);

            logger.info(`Sending proposal email to ${emailTo}`);
            const emailSent = await sendProposalEmail(
              emailTo,
              emailCc,
              emailSubject,
              emailHtml,
              pdfBuffer,
              sent.proposalNumber
            );
            logger.info(`Proposal email result: ${emailSent ? 'sent' : 'failed'}`);

            await logActivity({
              proposalId: req.params.id,
              action: 'email_sent',
              performedByUserId: req.user!.id,
              ipAddress: req.ip,
              metadata: { to: emailTo, cc: emailCc },
            });
          } catch (emailError) {
            // Don't fail the whole send if email fails
            logger.error('Failed to send proposal email:', emailError);
          }
        }
      }

      // Re-fetch to get updated fields
      const updatedProposal = await getProposalById(req.params.id);
      res.json({ data: updatedProposal, message: 'Proposal sent successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Mark proposal as viewed (typically called when client opens the proposal)
router.post(
  '/:id/viewed',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSALS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const proposal = await getProposalById(req.params.id);
      if (!proposal) {
        throw new NotFoundError('Proposal not found');
      }

      const viewed = await markProposalAsViewed(req.params.id);

      await logActivity({
        proposalId: req.params.id,
        action: 'viewed',
        performedByUserId: req.user!.id,
        ipAddress: req.ip,
      });

      res.json({ data: viewed });
    } catch (error) {
      next(error);
    }
  }
);

// Accept proposal
router.post(
  '/:id/accept',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSALS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = acceptProposalSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const proposal = await getProposalById(req.params.id);
      if (!proposal) {
        throw new NotFoundError('Proposal not found');
      }

      if (!['sent', 'viewed'].includes(proposal.status)) {
        throw new ValidationError('Only sent or viewed proposals can be accepted');
      }

      const accepted = await acceptProposal(req.params.id);

      // Create version snapshot
      await createVersion(req.params.id, req.user!.id, 'Proposal accepted');

      await logActivity({
        proposalId: req.params.id,
        action: 'accepted',
        performedByUserId: req.user!.id,
        ipAddress: req.ip,
      });

      // Send notification to proposal creator
      if (proposal.createdByUser?.email) {
        try {
          const branding = await getBrandingSafe();
          const html = buildProposalAcceptedHtmlWithBranding({
            proposalNumber: proposal.proposalNumber,
            title: proposal.title,
            accountName: proposal.account.name,
            totalAmount: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(proposal.totalAmount)),
            acceptedAt: new Date().toLocaleDateString(),
          }, branding);
          const subject = buildProposalAcceptedSubject(proposal.proposalNumber);
          await sendNotificationEmail(proposal.createdByUser.email, subject, html);
        } catch (emailError) {
          console.error('Failed to send acceptance notification:', emailError);
        }
      }

      res.json({ data: accepted, message: 'Proposal accepted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Reject proposal
router.post(
  '/:id/reject',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSALS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = rejectProposalSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const proposal = await getProposalById(req.params.id);
      if (!proposal) {
        throw new NotFoundError('Proposal not found');
      }

      if (!['sent', 'viewed'].includes(proposal.status)) {
        throw new ValidationError('Only sent or viewed proposals can be rejected');
      }

      const rejected = await rejectProposal(req.params.id, parsed.data.rejectionReason);

      await logActivity({
        proposalId: req.params.id,
        action: 'rejected',
        performedByUserId: req.user!.id,
        ipAddress: req.ip,
        metadata: { rejectionReason: parsed.data.rejectionReason },
      });

      // Send notification to proposal creator
      if (proposal.createdByUser?.email) {
        try {
          const branding = await getBrandingSafe();
          const html = buildProposalRejectedHtmlWithBranding({
            proposalNumber: proposal.proposalNumber,
            title: proposal.title,
            accountName: proposal.account.name,
            rejectedAt: new Date().toLocaleDateString(),
            rejectionReason: parsed.data.rejectionReason,
          }, branding);
          const subject = buildProposalRejectedSubject(proposal.proposalNumber);
          await sendNotificationEmail(proposal.createdByUser.email, subject, html);
        } catch (emailError) {
          console.error('Failed to send rejection notification:', emailError);
        }
      }

      res.json({ data: rejected, message: 'Proposal rejected' });
    } catch (error) {
      next(error);
    }
  }
);

// Archive proposal
router.post(
  '/:id/archive',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSALS_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const proposal = await getProposalById(req.params.id);
      if (!proposal) {
        throw new NotFoundError('Proposal not found');
      }

      const archived = await archiveProposal(req.params.id);

      await logActivity({
        proposalId: req.params.id,
        action: 'archived',
        performedByUserId: req.user!.id,
        ipAddress: req.ip,
      });

      res.json({ data: archived, message: 'Proposal archived successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Restore archived proposal
router.post(
  '/:id/restore',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSALS_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const proposal = await getProposalById(req.params.id);
      if (!proposal) {
        throw new NotFoundError('Proposal not found');
      }

      const restored = await restoreProposal(req.params.id);

      await logActivity({
        proposalId: req.params.id,
        action: 'restored',
        performedByUserId: req.user!.id,
        ipAddress: req.ip,
      });

      res.json({ data: restored, message: 'Proposal restored successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Send reminder for sent/viewed proposals
router.post(
  '/:id/remind',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSALS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.info(`Remind request body: ${JSON.stringify(req.body)}`);
      const parsed = sendProposalSchema.safeParse(req.body);
      if (!parsed.success) {
        logger.error(`Remind validation errors: ${JSON.stringify(parsed.error.errors)}`);
        throw handleZodError(parsed.error);
      }

      const proposal = await getProposalById(req.params.id);
      if (!proposal) {
        throw new NotFoundError('Proposal not found');
      }

      logger.info(`Remind: proposal ${proposal.proposalNumber} status=${proposal.status}`);
      if (!['sent', 'viewed'].includes(proposal.status)) {
        throw new ValidationError('Can only send reminders for sent or viewed proposals');
      }

      // Auto-resolve recipient from account contacts if not provided
      let remindEmailTo = parsed.data.emailTo;
      let remindEmailCc = parsed.data.emailCc || [];
      if (!remindEmailTo) {
        const contacts = await prisma.contact.findMany({
          where: { accountId: proposal.account.id, archivedAt: null, email: { not: null } },
          select: { email: true, isPrimary: true },
          orderBy: { isPrimary: 'desc' },
        });
        const primary = contacts.find((c) => c.isPrimary);
        if (primary?.email) {
          remindEmailTo = primary.email;
          remindEmailCc = contacts
            .filter((c) => !c.isPrimary && c.email)
            .map((c) => c.email!);
        }
      }

      if (remindEmailTo) {
        if (!isEmailConfigured()) {
          logger.warn('Email not configured — skipping reminder email send');
          throw new ValidationError('Email is not configured. Set RESEND_API_KEY.');
        }

        try {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
          const publicViewUrl = proposal.publicToken
            ? `${frontendUrl}/p/${proposal.publicToken}`
            : undefined;

          logger.info(`Generating PDF for reminder ${proposal.proposalNumber}`);
          const pdfBuffer = await generateProposalPdf(proposal as any);

          const emailSubject = parsed.data.emailSubject || `Reminder: Proposal ${proposal.proposalNumber}`;
          const branding = await getBrandingSafe();
          const emailHtml = buildProposalEmailHtmlWithBranding({
            proposalNumber: proposal.proposalNumber,
            title: proposal.title,
            accountName: proposal.account.name,
            totalAmount: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(proposal.totalAmount)),
            validUntil: proposal.validUntil ? new Date(proposal.validUntil).toLocaleDateString() : null,
            publicViewUrl,
          }, branding);

          logger.info(`Sending reminder email to ${remindEmailTo}`);
          const emailSent = await sendProposalEmail(
            remindEmailTo,
            remindEmailCc,
            emailSubject,
            emailHtml,
            pdfBuffer,
            proposal.proposalNumber
          );
          logger.info(`Reminder email result: ${emailSent ? 'sent' : 'failed'}`);

          if (!emailSent) {
            throw new ValidationError('Failed to send reminder email');
          }

          await logActivity({
            proposalId: req.params.id,
            action: 'reminder_sent',
            performedByUserId: req.user!.id,
            ipAddress: req.ip,
            metadata: { to: remindEmailTo, cc: remindEmailCc },
          });
        } catch (emailError) {
          if (emailError instanceof ValidationError) throw emailError;
          logger.error('Failed to send reminder:', emailError);
          throw new ValidationError('Failed to send reminder email');
        }
      }

      res.json({ message: 'Reminder sent successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Delete proposal (permanent)
router.delete(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSALS_DELETE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const proposal = await getProposalById(req.params.id);
      if (!proposal) {
        throw new NotFoundError('Proposal not found');
      }

      // Log before delete since cascade will remove activities
      await logActivity({
        proposalId: req.params.id,
        action: 'deleted',
        performedByUserId: req.user!.id,
        ipAddress: req.ip,
        metadata: { proposalNumber: proposal.proposalNumber },
      });

      await deleteProposal(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// Update service tasks (quick-edit)
router.patch(
  '/:proposalId/services/:serviceId/tasks',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSALS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateServiceTasksSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const updated = await updateProposalServiceTasks(
        req.params.proposalId,
        req.params.serviceId,
        parsed.data.includedTasks
      );

      await logActivity({
        proposalId: req.params.proposalId,
        action: 'service_tasks_updated',
        performedByUserId: req.user!.id,
        ipAddress: req.ip,
        metadata: { serviceId: req.params.serviceId },
      });

      res.json({ data: updated });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// PDF GENERATION ROUTES
// ============================================================

// Download proposal as PDF
router.get(
  '/:id/pdf',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSALS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const proposal = await getProposalById(req.params.id);
      if (!proposal) {
        throw new NotFoundError('Proposal not found');
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

// ============================================================
// ACTIVITY LOG ROUTES
// ============================================================

// Get proposal activities
router.get(
  '/:id/activities',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSALS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listActivitiesQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const proposal = await getProposalById(req.params.id);
      if (!proposal) {
        throw new NotFoundError('Proposal not found');
      }

      const result = await getProposalActivities(req.params.id, parsed.data);
      res.json({ data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// VERSION HISTORY ROUTES
// ============================================================

// Get proposal versions
router.get(
  '/:id/versions',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSALS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const proposal = await getProposalById(req.params.id);
      if (!proposal) {
        throw new NotFoundError('Proposal not found');
      }

      const versions = await getVersions(req.params.id);
      res.json({ data: versions });
    } catch (error) {
      next(error);
    }
  }
);

// Get specific version
router.get(
  '/:id/versions/:versionNumber',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSALS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const proposal = await getProposalById(req.params.id);
      if (!proposal) {
        throw new NotFoundError('Proposal not found');
      }

      const versionNumber = parseInt(req.params.versionNumber, 10);
      if (isNaN(versionNumber)) {
        throw new ValidationError('Invalid version number');
      }

      const version = await getVersion(req.params.id, versionNumber);
      if (!version) {
        throw new NotFoundError('Version not found');
      }

      res.json({ data: version });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// PRICING STRATEGY ROUTES
// ============================================================

// Lock proposal pricing
router.post(
  '/:id/pricing/lock',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSALS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const proposal = await getProposalById(req.params.id);
      if (!proposal) {
        throw new NotFoundError('Proposal not found');
      }

      const locked = await lockProposalPricing(req.params.id);

      await logActivity({
        proposalId: req.params.id,
        action: 'pricing_locked',
        performedByUserId: req.user!.id,
        ipAddress: req.ip,
      });

      res.json({ data: locked, message: 'Proposal pricing locked successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Unlock proposal pricing
router.post(
  '/:id/pricing/unlock',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSALS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const proposal = await getProposalById(req.params.id);
      if (!proposal) {
        throw new NotFoundError('Proposal not found');
      }

      const unlocked = await unlockProposalPricing(req.params.id);

      await logActivity({
        proposalId: req.params.id,
        action: 'pricing_unlocked',
        performedByUserId: req.user!.id,
        ipAddress: req.ip,
      });

      res.json({ data: unlocked, message: 'Proposal pricing unlocked successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Change pricing plan for a proposal
router.post(
  '/:id/pricing/plan',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSALS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = changePricingPlanSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const proposal = await getProposalById(req.params.id);
      if (!proposal) {
        throw new NotFoundError('Proposal not found');
      }

      const updated = await changeProposalPricingPlan(
        req.params.id,
        parsed.data.pricingPlanId
      );

      await logActivity({
        proposalId: req.params.id,
        action: 'pricing_plan_changed',
        performedByUserId: req.user!.id,
        ipAddress: req.ip,
        metadata: { pricingPlanId: parsed.data.pricingPlanId },
      });

      res.json({ data: updated, message: 'Pricing plan changed successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Recalculate proposal pricing
router.post(
  '/:id/pricing/recalculate',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSALS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = recalculatePricingSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const proposal = await getProposalById(req.params.id);
      if (!proposal) {
        throw new NotFoundError('Proposal not found');
      }

      const recalculated = await recalculateProposalPricing(
        req.params.id,
        parsed.data.serviceFrequency,
        {
          lockAfterRecalculation: parsed.data.lockAfterRecalculation,
          workerCount: parsed.data.workerCount,
        }
      );

      // Create version snapshot after recalculation
      await createVersion(req.params.id, req.user!.id, 'Pricing recalculated');

      await logActivity({
        proposalId: req.params.id,
        action: 'pricing_recalculated',
        performedByUserId: req.user!.id,
        ipAddress: req.ip,
        metadata: { serviceFrequency: parsed.data.serviceFrequency },
      });

      res.json({ data: recalculated, message: 'Pricing recalculated successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Get pricing preview for a proposal
router.get(
  '/:id/pricing/preview',
  authenticate,
  requirePermission(PERMISSIONS.PROPOSALS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = pricingPreviewQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const proposal = await getProposalById(req.params.id);
      if (!proposal) {
        throw new NotFoundError('Proposal not found');
      }

      const preview = await getProposalPricingPreview(
        req.params.id,
        parsed.data.serviceFrequency,
        { pricingPlanId: parsed.data.pricingPlanId, workerCount: parsed.data.workerCount }
      );
      res.json({ data: preview });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
