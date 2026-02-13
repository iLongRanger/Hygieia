import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { verifyOwnership } from '../middleware/ownership';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import {
  listContracts,
  getContractById,
  createContract,
  createContractFromProposal,
  createStandaloneContract,
  updateContract,
  updateContractStatus,
  assignContractTeam,
  signContract,
  sendContract as sendContractService,
  terminateContract,
  archiveContract,
  restoreContract,
  renewContract,
  canRenewContract,
  completeInitialClean,
  getExpiringContracts,
} from '../services/contractService';
import { generatePublicToken } from '../services/contractPublicService';
import { isEmailConfigured } from '../config/email';
import { sendEmail } from '../services/emailService';
import { buildContractSentHtmlWithBranding, buildContractSentSubject } from '../templates/contractSent';
import { generateContractTerms } from '../services/contractTemplateService';
import {
  createContractSchema,
  createContractFromProposalSchema,
  createStandaloneContractSchema,
  updateContractSchema,
  updateContractStatusSchema,
  assignContractTeamSchema,
  signContractSchema,
  terminateContractSchema,
  renewContractSchema,
  listContractsQuerySchema,
  sendContractSchema,
} from '../schemas/contract';
import { listContractActivitiesQuerySchema } from '../schemas/contractActivity';
import { logContractActivity, getContractActivities } from '../services/contractActivityService';
import { generateContractPdf } from '../services/pdfService';
import { sendNotificationEmail } from '../services/emailService';
import { getDefaultBranding, getGlobalSettings } from '../services/globalSettingsService';
import { buildContractActivatedHtmlWithBranding, buildContractActivatedSubject } from '../templates/contractActivated';
import { buildContractTerminatedHtmlWithBranding, buildContractTerminatedSubject } from '../templates/contractTerminated';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';
import { BadRequestError } from '../middleware/errorHandler';
import { ZodError } from 'zod';
import { PERMISSIONS } from '../types';
import { createBulkNotifications } from '../services/notificationService';

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

async function getContractNotificationRecipients(contractId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      createdByUserId: true,
      createdByUser: { select: { email: true } },
      account: {
        select: {
          accountManagerId: true,
          accountManager: { select: { email: true } },
        },
      },
    },
  });
  if (!contract) return { userIds: new Set<string>(), emails: new Set<string>() };

  const userIds = new Set<string>();
  const emails = new Set<string>();

  userIds.add(contract.createdByUserId);
  emails.add(contract.createdByUser.email);

  if (contract.account.accountManagerId) {
    userIds.add(contract.account.accountManagerId);
    if (contract.account.accountManager?.email) {
      emails.add(contract.account.accountManager.email);
    }
  }

  // Also include admin/owner users
  const adminUsers = await prisma.userRole.findMany({
    where: {
      user: { status: 'active' },
      role: { key: { in: ['owner', 'admin'] } },
    },
    select: { user: { select: { id: true, email: true } } },
  });
  for (const ur of adminUsers) {
    userIds.add(ur.user.id);
    emails.add(ur.user.email);
  }

  return { userIds, emails };
}

// List all contracts
router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listContractsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const result = await listContracts(parsed.data);
      res.json({ data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }
);

// Get expiring contracts
router.get(
  '/expiring',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
      const contracts = await getExpiringContracts(days);
      res.json({ data: contracts });
    } catch (error) {
      next(error);
    }
  }
);

// Generate default contract terms
router.post(
  '/generate-terms',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId, facilityId, startDate, endDate, monthlyValue, billingCycle, paymentTerms, serviceFrequency, autoRenew, renewalNoticeDays, title } = req.body;

      if (!accountId) {
        throw new ValidationError('accountId is required');
      }
      if (monthlyValue == null) {
        throw new ValidationError('monthlyValue is required');
      }

      const [account, facility] = await Promise.all([
        prisma.account.findUnique({ where: { id: accountId }, select: { name: true } }),
        facilityId
          ? prisma.facility.findUnique({ where: { id: facilityId }, select: { name: true, address: true } })
          : null,
      ]);

      if (!account) {
        throw new NotFoundError('Account not found');
      }

      const terms = await generateContractTerms({
        title,
        accountName: account.name,
        facilityName: facility?.name,
        facilityAddress: facility?.address as string | null | undefined,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        monthlyValue: Number(monthlyValue),
        billingCycle: billingCycle || 'monthly',
        paymentTerms: paymentTerms || 'Net 30',
        serviceFrequency: serviceFrequency || null,
        autoRenew: autoRenew ?? false,
        renewalNoticeDays: renewalNoticeDays ?? 30,
      });

      res.json({ data: terms });
    } catch (error) {
      next(error);
    }
  }
);

// Get contract by ID
router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_READ),
  verifyOwnership({ resourceType: 'contract' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contract = await getContractById(req.params.id);
      if (!contract) {
        throw new NotFoundError('Contract not found');
      }
      res.json({ data: contract });
    } catch (error) {
      next(error);
    }
  }
);

// Create new contract
router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createContractSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const contract = await createContract({
        ...parsed.data,
        createdByUserId: req.user.id,
      });

      await logContractActivity({
        contractId: contract.id,
        action: 'created',
        performedByUserId: req.user.id,
      });

      res.status(201).json({ data: contract });
    } catch (error) {
      next(error);
    }
  }
);

// Create contract from accepted proposal
router.post(
  '/from-proposal/:proposalId',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createContractFromProposalSchema.safeParse({
        ...req.body,
        proposalId: req.params.proposalId,
      });

      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { proposalId, ...overrides } = parsed.data;
      const contract = await createContractFromProposal(
        proposalId,
        req.user.id,
        overrides
      );

      await logContractActivity({
        contractId: contract.id,
        action: 'created',
        performedByUserId: req.user.id,
        metadata: { source: 'proposal', proposalId },
      });

      res.status(201).json({ data: contract });
    } catch (error) {
      next(error);
    }
  }
);

// Update contract
router.patch(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_WRITE),
  verifyOwnership({ resourceType: 'contract' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateContractSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const existingContract = await getContractById(req.params.id);
      if (!existingContract) {
        throw new NotFoundError('Contract not found');
      }

      // Prevent editing active or terminated contracts
      if (['active', 'terminated'].includes(existingContract.status)) {
        throw new ValidationError(
          `Cannot edit ${existingContract.status} contract. Create an amendment or new contract instead.`
        );
      }

      const contract = await updateContract(req.params.id, parsed.data);

      await logContractActivity({
        contractId: contract.id,
        action: 'updated',
        performedByUserId: req.user?.id,
        metadata: { fields: Object.keys(parsed.data) },
      });

      res.json({ data: contract });
    } catch (error) {
      next(error);
    }
  }
);

// Update contract status
router.patch(
  '/:id/status',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateContractStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const contract = await updateContractStatus(
        req.params.id,
        parsed.data.status,
        req.user?.id
      );

      await logContractActivity({
        contractId: contract.id,
        action: parsed.data.status === 'active' ? 'activated' : 'status_changed',
        performedByUserId: req.user?.id,
        metadata: { newStatus: parsed.data.status },
      });

      // Send notifications on activation
      if (parsed.data.status === 'active') {
        try {
          const { userIds, emails } = await getContractNotificationRecipients(contract.id);
          const branding = await getBrandingSafe();

          await createBulkNotifications([...userIds], {
            type: 'contract_activated',
            title: `Contract ${contract.contractNumber} activated`,
            body: `Contract "${contract.title}" for ${contract.account.name} is now active.`,
            metadata: { contractId: contract.id },
          });

          const html = buildContractActivatedHtmlWithBranding({
            contractNumber: contract.contractNumber,
            title: contract.title,
            accountName: contract.account.name,
            monthlyValue: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(contract.monthlyValue)),
            startDate: new Date(contract.startDate).toLocaleDateString(),
            activatedAt: new Date().toLocaleDateString(),
          }, branding);
          const subject = buildContractActivatedSubject(contract.contractNumber);

          await Promise.allSettled(
            [...emails].map((email) => sendNotificationEmail(email, subject, html))
          );
        } catch (notifyError) {
          logger.error('Failed to send contract activation notifications:', notifyError);
        }
      }

      res.json({ data: contract });
    } catch (error) {
      next(error);
    }
  }
);

// Assign team to active contract
router.patch(
  '/:id/team',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = assignContractTeamSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const contract = await assignContractTeam(req.params.id, parsed.data.teamId);

      await logContractActivity({
        contractId: contract.id,
        action: 'team_assigned',
        performedByUserId: req.user?.id,
        metadata: { teamId: parsed.data.teamId },
      });

      res.json({ data: contract });
    } catch (error) {
      next(error);
    }
  }
);

// Send contract to client
router.post(
  '/:id/send',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = sendContractSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const contract = await getContractById(req.params.id);
      if (!contract) {
        throw new NotFoundError('Contract not found');
      }

      if (!['draft', 'sent', 'viewed'].includes(contract.status)) {
        throw new ValidationError('Only draft, sent, or viewed contracts can be sent');
      }

      // 1. Generate public token (regenerate on resend)
      const publicToken = await generatePublicToken(req.params.id);

      // 2. Mark as sent
      const sent = await sendContractService(req.params.id);

      // 3. Log activity
      await logContractActivity({
        contractId: req.params.id,
        action: 'sent',
        performedByUserId: req.user!.id,
        metadata: {
          emailTo: parsed.data.emailTo,
          emailCc: parsed.data.emailCc,
        },
      });

      // 4. Resolve recipient/contact context for defaults and personalization
      let emailTo = parsed.data.emailTo;
      let emailCc = parsed.data.emailCc || [];
      const contacts = await prisma.contact.findMany({
        where: { accountId: contract.account.id, archivedAt: null, email: { not: null } },
        select: { name: true, email: true, isPrimary: true },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      });
      const primary = contacts.find((c) => c.isPrimary) || contacts[0];
      const firstNameFromName = (name?: string | null) => name?.trim().split(/\s+/)[0] || undefined;
      let recipientFirstName = firstNameFromName(primary?.name);

      if (!emailTo) {
        if (primary?.email) {
          emailTo = primary.email;
          emailCc = contacts
            .filter((c) => !c.isPrimary && c.email)
            .map((c) => c.email!);
        }
      } else {
        const matchedRecipient = contacts.find((c) => c.email?.toLowerCase() === emailTo?.toLowerCase());
        const matchedFirstName = firstNameFromName(matchedRecipient?.name);
        if (matchedFirstName) {
          recipientFirstName = matchedFirstName;
        }
      }

      if (emailTo) {
        if (!isEmailConfigured()) {
          logger.warn('Email not configured — skipping contract email send');
        } else {
          try {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const publicViewUrl = `${frontendUrl}/c/${publicToken}`;

            logger.info(`Generating PDF for contract ${sent.contractNumber}`);
            const pdfBuffer = await generateContractPdf(sent as any);

            const emailSubject = parsed.data.emailSubject || buildContractSentSubject(
              sent.contractNumber,
              sent.title
            );
            const branding = await getBrandingSafe();
            const emailHtml = buildContractSentHtmlWithBranding({
              contractNumber: sent.contractNumber,
              title: sent.title,
              accountName: sent.account.name,
              monthlyValue: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(sent.monthlyValue)),
              startDate: new Date(sent.startDate).toLocaleDateString(),
              recipientName: recipientFirstName || sent.account.name,
              customMessage: parsed.data.emailBody,
              publicViewUrl,
            }, branding);

            logger.info(`Sending contract email to ${emailTo}`);
            const emailSent = await sendEmail({
              to: emailTo,
              cc: emailCc.length > 0 ? emailCc : undefined,
              subject: emailSubject,
              html: emailHtml,
              attachments: [{
                filename: `${sent.contractNumber}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf',
              }],
            });
            logger.info(`Contract email result: ${emailSent ? 'sent' : 'failed'}`);

            await logContractActivity({
              contractId: req.params.id,
              action: 'email_sent',
              performedByUserId: req.user!.id,
              metadata: { to: emailTo, cc: emailCc },
            });
          } catch (emailError) {
            logger.error('Failed to send contract email:', emailError);
          }
        }
      }

      // Re-fetch to get updated fields
      const updatedContract = await getContractById(req.params.id);
      res.json({ data: updatedContract, message: 'Contract sent successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Sign contract
router.post(
  '/:id/sign',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = signContractSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const contract = await signContract(req.params.id, parsed.data);

      await logContractActivity({
        contractId: contract.id,
        action: 'signed',
        performedByUserId: req.user?.id,
        metadata: { signedByName: parsed.data.signedByName, signedByEmail: parsed.data.signedByEmail },
      });

      res.json({ data: contract });
    } catch (error) {
      next(error);
    }
  }
);

// Terminate contract
router.post(
  '/:id/terminate',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = terminateContractSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const contract = await terminateContract(
        req.params.id,
        parsed.data.terminationReason
      );

      await logContractActivity({
        contractId: contract.id,
        action: 'terminated',
        performedByUserId: req.user?.id,
        metadata: { reason: parsed.data.terminationReason },
      });

      // Send termination notifications
      try {
        const { userIds, emails } = await getContractNotificationRecipients(contract.id);
        const branding = await getBrandingSafe();

        await createBulkNotifications([...userIds], {
          type: 'contract_terminated',
          title: `Contract ${contract.contractNumber} terminated`,
          body: `Contract "${contract.title}" for ${contract.account.name} has been terminated.`,
          metadata: { contractId: contract.id },
        });

        const html = buildContractTerminatedHtmlWithBranding({
          contractNumber: contract.contractNumber,
          title: contract.title,
          accountName: contract.account.name,
          terminatedAt: new Date().toLocaleDateString(),
          terminationReason: parsed.data.terminationReason,
        }, branding);
        const subject = buildContractTerminatedSubject(contract.contractNumber);

        await Promise.allSettled(
          [...emails].map((email) => sendNotificationEmail(email, subject, html))
        );
      } catch (notifyError) {
        logger.error('Failed to send contract termination notifications:', notifyError);
      }

      res.json({ data: contract });
    } catch (error) {
      next(error);
    }
  }
);

// Archive contract (soft delete)
router.delete(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contract = await archiveContract(req.params.id);

      await logContractActivity({
        contractId: contract.id,
        action: 'archived',
        performedByUserId: req.user?.id,
      });

      res.json({ data: contract, message: 'Contract archived successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Restore archived contract
router.post(
  '/:id/restore',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contract = await restoreContract(req.params.id);

      await logContractActivity({
        contractId: contract.id,
        action: 'restored',
        performedByUserId: req.user?.id,
      });

      res.json({ data: contract, message: 'Contract restored successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// Contract Renewal Routes
// ============================================================

/** Check if a contract can be renewed */
router.get(
  '/:id/can-renew',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await canRenewContract(req.params.id);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

/** Renew a contract */
router.post(
  '/:id/renew',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = renewContractSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      // Check if contract can be renewed
      const canRenew = await canRenewContract(req.params.id);
      if (!canRenew.canRenew) {
        throw new BadRequestError(canRenew.reason || 'Contract cannot be renewed');
      }

      const contract = await renewContract(
        req.params.id,
        parsed.data,
        req.user.id
      );

      await logContractActivity({
        contractId: contract.id,
        action: 'created',
        performedByUserId: req.user.id,
        metadata: { source: 'renewal', renewedFromContractId: req.params.id },
      });

      await logContractActivity({
        contractId: req.params.id,
        action: 'renewed',
        performedByUserId: req.user.id,
        metadata: { renewedToContractId: contract.id },
      });

      res.status(201).json({ data: contract });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// Standalone Contract Creation (imported/legacy)
// ============================================================

/** Create a standalone contract (imported or legacy, without proposal) */
router.post(
  '/standalone',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createStandaloneContractSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const contract = await createStandaloneContract({
        ...parsed.data,
        createdByUserId: req.user.id,
      });

      await logContractActivity({
        contractId: contract.id,
        action: 'created',
        performedByUserId: req.user.id,
        metadata: { source: parsed.data.contractSource },
      });

      res.status(201).json({ data: contract });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// Initial Clean Tracking
// ============================================================

/** Mark initial clean as completed */
router.post(
  '/:id/complete-initial-clean',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const contract = await completeInitialClean(req.params.id, req.user.id);

      await logContractActivity({
        contractId: contract.id,
        action: 'initial_clean_completed',
        performedByUserId: req.user.id,
      });

      res.json({ data: contract, message: 'Initial clean marked as completed' });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// Contract PDF
// ============================================================

/** Generate and download contract PDF */
router.get(
  '/:id/pdf',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contract = await getContractById(req.params.id);
      if (!contract) {
        throw new NotFoundError('Contract not found');
      }

      const pdfBuffer = await generateContractPdf(contract as any);

      await logContractActivity({
        contractId: contract.id,
        action: 'pdf_generated',
        performedByUserId: req.user?.id,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${contract.contractNumber}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// Contract Activities
// ============================================================

/** Get contract activity log */
router.get(
  '/:id/activities',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listContractActivitiesQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const result = await getContractActivities(req.params.id, parsed.data);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
