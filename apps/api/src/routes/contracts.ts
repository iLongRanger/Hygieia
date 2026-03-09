import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { verifyOwnership } from '../middleware/ownership';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import {
  listContracts,
  getContractsSummary,
  getContractById,
  createContract,
  createContractFromProposal,
  createStandaloneContract,
  updateContract,
  updateContractStatus,
  assignContractTeam,
  scheduleContractAssignmentOverride,
  signContract,
  sendContract as sendContractService,
  terminateContract,
  archiveContract,
  restoreContract,
  renewContract,
  completeInitialClean,
  getExpiringContracts,
  getTeamAssignmentNotificationData,
  getFacilityTasksForContract,
} from '../services/contractService';
import { generatePublicToken } from '../services/contractPublicService';
import { isEmailConfigured } from '../config/email';
import { sendEmail } from '../services/emailService';
import { buildContractSentHtmlWithBranding, buildContractSentSubject } from '../templates/contractSent';
import { generateContractTerms } from '../services/contractTemplateService';
import {
  createContractSchemaWithDocumentValidation,
  createContractFromProposalSchemaWithDocumentValidation,
  createStandaloneContractSchemaWithDocumentValidation,
  updateContractSchemaWithDocumentValidation,
  updateContractStatusSchema,
  assignContractTeamSchema,
  signContractSchema,
  terminateContractSchema,
  renewContractSchemaWithDocumentValidation,
  listContractsQuerySchema,
  listContractsSummaryQuerySchema,
  sendContractSchema,
  createContractAmendmentSchema,
  rejectContractAmendmentSchema,
  recalculateContractAmendmentSchema,
  updateContractAmendmentSchema,
  applyContractAmendmentSchema,
} from '../schemas/contract';
import { listContractActivitiesQuerySchema } from '../schemas/contractActivity';
import { logContractActivity, getContractActivities } from '../services/contractActivityService';
import { generateContractPdf } from '../services/pdfService';
import { sendNotificationEmail } from '../services/emailService';
import { getDefaultBranding, getGlobalSettings } from '../services/globalSettingsService';
import { buildContractActivatedHtmlWithBranding, buildContractActivatedSubject } from '../templates/contractActivated';
import { buildContractTerminatedHtmlWithBranding, buildContractTerminatedSubject } from '../templates/contractTerminated';
import { buildContractTeamAssignedHtmlWithBranding, buildContractTeamAssignedSubject } from '../templates/contractTeamAssigned';
import { buildSubcontractorWelcomeSubject, buildSubcontractorWelcomeHtml } from '../templates/subcontractorWelcome';
import { createSubcontractorUser } from '../services/authService';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';
import { BadRequestError } from '../middleware/errorHandler';
import { ZodError } from 'zod';
import { PERMISSIONS } from '../types';
import { createBulkNotifications } from '../services/notificationService';
import { autoCreateInspectionTemplate } from '../services/inspectionTemplateService';
import { tierToPercentage } from '../lib/subcontractorTiers';
import {
  autoGenerateRecurringJobsForContract,
  regenerateRecurringJobsForContract,
} from '../services/jobService';
import { ensureSubcontractorRoleForTeamUsers } from '../services/teamService';
import {
  approveContractAmendment,
  createContractAmendment,
  getContractAmendmentById,
  listContractAmendments,
  recalculateContractAmendment,
  rejectContractAmendment,
  updateContractAmendment,
} from '../services/contractAmendmentService';
import { applyContractAmendmentWorkflow } from '../services/contractAmendmentWorkflowService';
import { getWebAppBaseUrl, requireFrontendBaseUrl } from '../lib/appUrl';

const router: Router = Router();

function decodeDataUrlToBuffer(dataUrl: string): Buffer {
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) {
    throw new ValidationError('Invalid document format');
  }
  const base64 = dataUrl.slice(commaIndex + 1);
  return Buffer.from(base64, 'base64');
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

async function getSubcontractorTeamUsers(
  teamId: string
): Promise<Array<{ id: string; email: string; fullName: string }>> {
  const teamSubcontractors = await prisma.userRole.findMany({
    where: {
      role: { key: 'subcontractor' },
      user: {
        teamId,
        status: { in: ['active', 'pending'] },
      },
    },
    select: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      },
    },
  });

  const usersById = new Map<string, { id: string; email: string; fullName: string }>();
  for (const entry of teamSubcontractors) {
    usersById.set(entry.user.id, entry.user);
  }

  return [...usersById.values()];
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

      const result = await listContracts(parsed.data, {
        userRole: req.user?.role,
        userTeamId: req.user?.teamId ?? undefined,
        userId: req.user?.id,
      });

      if (req.user?.role === 'subcontractor' || req.user?.role === 'cleaner') {
        const safeContracts = result.data.map((contract: any) => {
          const payout =
            Number(contract.monthlyValue || 0) *
            tierToPercentage(contract.subcontractorTier);
          const { monthlyValue, totalValue, ...safeContract } = contract;
          return { ...safeContract, subcontractorPayout: payout };
        });

        return res.json({ data: safeContracts, pagination: result.pagination });
      }

      res.json({ data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }
);

// Get contracts summary
router.get(
  '/summary',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listContractsSummaryQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const summary = await getContractsSummary(parsed.data, {
        userRole: req.user?.role,
        userTeamId: req.user?.teamId ?? undefined,
        userId: req.user?.id,
      });

      res.json({ data: summary });
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

      if (req.user?.role === 'subcontractor' || req.user?.role === 'cleaner') {
        const facilityId = contract.facility?.id;
        const [facilityAreas, facilityTasks] = facilityId
          ? await Promise.all([
              prisma.area.findMany({
                where: {
                  facilityId,
                  archivedAt: null,
                },
                select: {
                  id: true,
                  name: true,
                  squareFeet: true,
                  floorType: true,
                  roomCount: true,
                  unitCount: true,
                  areaType: {
                    select: {
                      name: true,
                    },
                  },
                },
                orderBy: { name: 'asc' },
              }),
              getFacilityTasksForContract(facilityId),
            ])
          : [[], []];

        const isSubcontractor = req.user?.role === 'subcontractor';
        const payout = Number(contract.monthlyValue || 0) * tierToPercentage(contract.subcontractorTier);
        const { monthlyValue, totalValue, ...safeContract } = contract as any;
        const safeFacility = safeContract.facility
          ? {
              ...safeContract.facility,
              areas: facilityAreas.map((area) => ({
                id: area.id,
                name: area.name,
                areaType: area.areaType?.name || null,
                squareFeet: Number(area.squareFeet || 0),
                floorType: area.floorType,
                roomCount: area.roomCount,
                unitCount: area.unitCount,
              })),
              tasks: facilityTasks.map((task: any) => ({
                name: task.taskTemplate?.name || task.customName || 'Unnamed task',
                areaName: task.area?.name || null,
                cleaningFrequency: task.cleaningFrequency,
              })),
            }
          : null;

        return res.json({
          data: {
            ...safeContract,
            facility: safeFacility,
            ...(isSubcontractor ? { subcontractorPayout: payout } : {}),
          },
        });
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
      const parsed = createContractSchemaWithDocumentValidation.safeParse(req.body);
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
      const parsed = createContractFromProposalSchemaWithDocumentValidation.safeParse({
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
      const parsed = updateContractSchemaWithDocumentValidation.safeParse(req.body);
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
        const needsAssignment = !contract.assignedTeam?.id && !contract.assignedToUser?.id;

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

        if (needsAssignment) {
          try {
            const { userIds } = await getContractNotificationRecipients(contract.id);
            await createBulkNotifications([...userIds], {
              type: 'contract_assignment_required',
              title: `Assignment required for ${contract.contractNumber}`,
              body:
                `Contract "${contract.title}" is active. Assign a team or internal employee ` +
                'to start scheduled work.',
              metadata: {
                contractId: contract.id,
                action: 'assign_team_or_employee',
              },
            });
          } catch (assignmentNotifyError) {
            logger.error('Failed to send contract assignment-required notifications:', assignmentNotifyError);
          }
        }

        // Auto-create inspection template from contract tasks
        try {
          await autoCreateInspectionTemplate(contract.id, req.user!.id);
        } catch (templateError) {
          logger.error('Failed to auto-create inspection template:', templateError);
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

      const existingContract = await getContractById(req.params.id);
      if (!existingContract) {
        throw new NotFoundError('Contract not found');
      }

      const nextTeamId = parsed.data.teamId ?? null;
      const nextAssignedToUserId = parsed.data.assignedToUserId ?? null;
      const hasCurrentAssignment = Boolean(
        existingContract.assignedTeam?.id || existingContract.assignedToUser?.id
      );
      const assignmentChanged =
        (existingContract.assignedTeam?.id ?? null) !== nextTeamId ||
        (existingContract.assignedToUser?.id ?? null) !== nextAssignedToUserId ||
        (nextTeamId &&
          parsed.data.subcontractorTier !== undefined &&
          parsed.data.subcontractorTier !== existingContract.subcontractorTier);
      const hasNextAssignment = Boolean(nextTeamId || nextAssignedToUserId);
      const shouldScheduleOverride = hasCurrentAssignment && hasNextAssignment && assignmentChanged;

      if (shouldScheduleOverride && !parsed.data.effectivityDate) {
        throw new ValidationError(
          'Effectivity date is required when overriding an existing contract assignment'
        );
      }

      if (parsed.data.effectivityDate && !['owner', 'admin'].includes(req.user?.role || '')) {
        throw new ValidationError('Only owner and admin can schedule assignment overrides');
      }

      const contract = shouldScheduleOverride
        ? await scheduleContractAssignmentOverride(
            req.params.id,
            nextTeamId,
            nextAssignedToUserId,
            parsed.data.effectivityDate!,
            req.user!.id,
            parsed.data.subcontractorTier
          )
        : await assignContractTeam(
            req.params.id,
            nextTeamId,
            nextAssignedToUserId,
            parsed.data.subcontractorTier
          );

      await logContractActivity({
        contractId: contract.id,
        action: shouldScheduleOverride ? 'assignment_override_scheduled' : 'team_assigned',
        performedByUserId: req.user?.id,
        metadata: {
          previousTeamId: existingContract.assignedTeam?.id ?? null,
          previousAssignedToUserId: existingContract.assignedToUser?.id ?? null,
          teamId: parsed.data.teamId ?? null,
          assignedToUserId: parsed.data.assignedToUserId ?? null,
          effectivityDate: parsed.data.effectivityDate?.toISOString() ?? null,
          subcontractorTier: parsed.data.subcontractorTier,
        },
      });

      if (shouldScheduleOverride) {
        if (nextTeamId) {
          try {
            await ensureSubcontractorRoleForTeamUsers(nextTeamId);
          } catch (roleSyncError) {
            logger.error('Failed to ensure subcontractor role for team users:', roleSyncError);
          }
        }

        const notifyUserIds = new Set<string>();
        notifyUserIds.add(existingContract.createdByUser.id);
        if (existingContract.account.id) {
          const account = await prisma.account.findUnique({
            where: { id: existingContract.account.id },
            select: { accountManagerId: true },
          });
          if (account?.accountManagerId) notifyUserIds.add(account.accountManagerId);
        }
        if (existingContract.assignedToUser?.id) notifyUserIds.add(existingContract.assignedToUser.id);
        if (nextAssignedToUserId) notifyUserIds.add(nextAssignedToUserId);

        const oldTeamUsers = existingContract.assignedTeam?.id
          ? await getSubcontractorTeamUsers(existingContract.assignedTeam.id)
          : [];
        const newTeamUsers = nextTeamId ? await getSubcontractorTeamUsers(nextTeamId) : [];
        for (const user of [...oldTeamUsers, ...newTeamUsers]) {
          notifyUserIds.add(user.id);
        }

        if (notifyUserIds.size > 0) {
          await createBulkNotifications([...notifyUserIds], {
            type: 'contract_assignment_override_scheduled',
            title: `Assignment change scheduled for ${contract.contractNumber}`,
            body:
              `A new contract assignee will take effect on ${parsed.data.effectivityDate!.toLocaleDateString()}. ` +
              'Future scheduled jobs on and after this date will be reassigned automatically.',
            metadata: {
              contractId: contract.id,
              effectivityDate: parsed.data.effectivityDate!.toISOString(),
              previousTeamId: existingContract.assignedTeam?.id ?? null,
              previousAssignedToUserId: existingContract.assignedToUser?.id ?? null,
              nextTeamId,
              nextAssignedToUserId,
            },
          });
        }

        return res.json({ data: contract });
      }

      // Send notification when an assignee is set (team or internal employee)
      if (parsed.data.teamId || parsed.data.assignedToUserId) {
        if (req.user?.id) {
          try {
            const generationResult = await autoGenerateRecurringJobsForContract({
              contractId: contract.id,
              createdByUserId: req.user.id,
              assignedTeamId: parsed.data.teamId ?? null,
              assignedToUserId: parsed.data.assignedToUserId ?? null,
            });

            await logContractActivity({
              contractId: contract.id,
              action: 'jobs_auto_generated',
              performedByUserId: req.user.id,
              metadata: {
                created: generationResult.created,
                source: 'team_assignment',
              },
            });
          } catch (generationError) {
            logger.error('Failed to auto-generate recurring jobs on team assignment:', generationError);
          }
        }
      }

      // Send notification when an internal employee is assigned
      if (parsed.data.assignedToUserId) {
        try {
          await createBulkNotifications([parsed.data.assignedToUserId], {
            type: 'contract_assignment_required',
            title: 'Contract assigned to you',
            body: `You were assigned to contract ${contract.contractNumber} (${contract.title}).`,
            metadata: { contractId: contract.id, assignedToUserId: parsed.data.assignedToUserId },
          });

          const assignedUser = await prisma.user.findUnique({
            where: { id: parsed.data.assignedToUserId },
            select: { email: true, fullName: true, status: true },
          });

          if (assignedUser?.email && ['active', 'pending'].includes(assignedUser.status)) {
            const webAppUrl = getWebAppBaseUrl();
            if (!webAppUrl) {
              logger.warn('Skipping internal contract assignment email because WEB_APP_URL/FRONTEND_URL is not configured');
            } else {
              const contractUrl = `${webAppUrl}/contracts/${contract.id}`;
              const subject = `Contract ${contract.contractNumber} assigned to you`;
              const html = `
                <p>Hi ${assignedUser.fullName || 'there'},</p>
                <p>You were assigned to contract <strong>${contract.contractNumber}</strong> (${contract.title}).</p>
                <p>Please view it in the web app for full details:</p>
                <p><a href="${contractUrl}">${contractUrl}</a></p>
              `;

              await sendNotificationEmail(assignedUser.email, subject, html);
            }
          }
        } catch (notifyError) {
          logger.error('Failed to send internal employee assignment notification:', notifyError);
        }
      }

      if (parsed.data.teamId) {
        try {
          await ensureSubcontractorRoleForTeamUsers(parsed.data.teamId);
        } catch (roleSyncError) {
          logger.error('Failed to ensure subcontractor role for team users:', roleSyncError);
        }

        const subcontractorPayout = Number(contract.monthlyValue || 0) * tierToPercentage(contract.subcontractorTier);
        const subcontractorPayoutLabel = `$${subcontractorPayout.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}/month`;

        try {
          const subcontractorUsers = await getSubcontractorTeamUsers(parsed.data.teamId);
          if (subcontractorUsers.length > 0) {
            await createBulkNotifications(
              subcontractorUsers.map((user) => user.id),
              {
              type: 'contract_team_assigned',
              title: `Contract ${contract.contractNumber} assigned to your team`,
              body:
                `Contract ${contract.contractNumber} (${contract.title}) has been assigned to your team. ` +
                `Your payout: ${subcontractorPayoutLabel}.`,
              metadata: {
                contractId: contract.id,
                teamId: parsed.data.teamId,
              },
              }
            );

            const webAppUrl = getWebAppBaseUrl();
            if (!webAppUrl) {
              logger.warn('Skipping subcontractor assignment email because WEB_APP_URL/FRONTEND_URL is not configured');
            } else {
              const contractUrl = `${webAppUrl}/contracts/${contract.id}`;

              await Promise.allSettled(
                subcontractorUsers
                  .filter((user) => Boolean(user.email))
                  .map((user) =>
                    sendNotificationEmail(
                      user.email,
                      `Contract ${contract.contractNumber} assigned to your team`,
                      `
                        <p>Hi ${user.fullName || 'there'},</p>
                        <p>Your team has been assigned to contract <strong>${contract.contractNumber}</strong> (${contract.title}).</p>
                        <p>Your payout is <strong>${subcontractorPayoutLabel}</strong>.</p>
                        <p>Please view it in the web app for full details:</p>
                        <p><a href="${contractUrl}">${contractUrl}</a></p>
                      `
                    )
                  )
              );
            }
          }
        } catch (notifyError) {
          logger.error('Failed to send subcontractor assignment notifications:', notifyError);
        }

        try {
          const notifData = await getTeamAssignmentNotificationData(contract.id);
          if (notifData && notifData.assignedTeam) {
            const facilityTasks = notifData.facility?.id
              ? await getFacilityTasksForContract(notifData.facility.id)
              : [];

            const monthlyValue = Number(notifData.monthlyValue);
            const subPct = tierToPercentage(notifData.subcontractorTier);
            const subcontractPay = monthlyValue * subPct;

            const facilityAddress = notifData.facility?.address as Record<string, any> | null;
            const addressStr = typeof facilityAddress === 'object' && facilityAddress
              ? [facilityAddress.street, facilityAddress.city, facilityAddress.state, facilityAddress.zip].filter(Boolean).join(', ')
              : String(facilityAddress || '');

            const emailData = {
              contractNumber: notifData.contractNumber,
              title: notifData.title,
              subcontractPay: `$${subcontractPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              startDate: new Date(notifData.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              serviceFrequency: notifData.serviceFrequency || 'As scheduled',
              facilityName: notifData.facility?.name || 'N/A',
              facilityAddress: addressStr || 'N/A',
              buildingType: notifData.facility?.buildingType || 'N/A',
              teamName: notifData.assignedTeam.name,
              proposalServices: notifData.proposal?.proposalServices || [],
              facilityTasks: facilityTasks.map((ft: any) => ({
                name: ft.taskTemplate?.name || ft.customName || 'Unnamed task',
                area: ft.area?.name,
                frequency: ft.cleaningFrequency,
              })),
            };

            const branding = await getBrandingSafe();
            const html = buildContractTeamAssignedHtmlWithBranding(emailData, branding);
            const subject = buildContractTeamAssignedSubject(notifData.contractNumber, notifData.assignedTeam.name);

            // In-app + email to internal admins
            const { userIds, emails } = await getContractNotificationRecipients(contract.id);
            if (userIds.size > 0) {
              await createBulkNotifications([...userIds], {
                type: 'contract_team_assigned',
                title: subject,
                body: `${notifData.assignedTeam.name} has been assigned to contract ${notifData.contractNumber}. Subcontract pay: ${emailData.subcontractPay}/month.`,
                metadata: { contractId: contract.id },
              });
            }
            for (const email of emails) {
              await sendNotificationEmail(email, subject, html);
            }

            // Email-only to team contact (no user account)
            if (notifData.assignedTeam.contactEmail) {
              await sendNotificationEmail(notifData.assignedTeam.contactEmail, subject, html);
            }
          }
        } catch (notifyError) {
          logger.error('Failed to send team assignment notifications:', notifyError);
        }

        // Auto-provision subcontractor portal access
        try {
          const provisioned = await createSubcontractorUser(parsed.data.teamId);
          if (provisioned) {
            try {
              await createBulkNotifications([provisioned.user.id], {
                type: 'contract_team_assigned',
                title: `Contract ${contract.contractNumber} assigned to your team`,
                body:
                  `Contract ${contract.contractNumber} (${contract.title}) has been assigned to your team. ` +
                  `Your payout: ${subcontractorPayoutLabel}.`,
                metadata: {
                  contractId: contract.id,
                  teamId: parsed.data.teamId,
                },
              });
            } catch (newUserNotifyError) {
              logger.error('Failed to send new subcontractor assignment notification:', newUserNotifyError);
            }

            const webAppUrl = getWebAppBaseUrl();
            const branding = await getBrandingSafe();
            const team = await prisma.team.findUnique({ where: { id: parsed.data.teamId } });
            if (team?.contactEmail) {
              if (!webAppUrl) {
                logger.warn('Skipping subcontractor welcome email because WEB_APP_URL/FRONTEND_URL is not configured');
              } else if (isEmailConfigured()) {
                const setPasswordUrl = `${webAppUrl}/auth/set-password?token=${provisioned.token}`;
                await sendNotificationEmail(
                  team.contactEmail,
                  buildSubcontractorWelcomeSubject(),
                  buildSubcontractorWelcomeHtml({
                    teamName: team.name,
                    contractNumber: contract.contractNumber,
                    facilityName: contract.facility?.name || 'N/A',
                    setPasswordUrl,
                  }, branding)
                );
              }
            }
          }
        } catch (provisionErr) {
          logger.error('Failed to auto-provision subcontractor:', provisionErr);
          // Don't fail the assignment if provisioning fails
        }
      }

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

      if (!['draft', 'sent', 'viewed', 'active'].includes(contract.status)) {
        throw new ValidationError('Only draft, sent, viewed, or active contracts can be sent');
      }

      const frontendUrl = requireFrontendBaseUrl();

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
            const publicViewUrl = `${frontendUrl}/c/${publicToken}`;

            logger.info(`Generating PDF for contract ${sent.contractNumber}`);
            const pdfBuffer = await generateContractPdf(sent as any);
            const termsDocument = await prisma.contract.findUnique({
              where: { id: sent.id },
              select: {
                termsDocumentName: true,
                termsDocumentMimeType: true,
                termsDocumentDataUrl: true,
              },
            });
            const attachments: Array<{ filename: string; content: Buffer; contentType: string }> = [
              {
                filename: `${sent.contractNumber}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf',
              },
            ];

            if (termsDocument?.termsDocumentDataUrl && termsDocument.termsDocumentName && termsDocument.termsDocumentMimeType) {
              attachments.push({
                filename: termsDocument.termsDocumentName,
                content: decodeDataUrlToBuffer(termsDocument.termsDocumentDataUrl),
                contentType: termsDocument.termsDocumentMimeType,
              });
            }

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
              attachments,
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

/** Renew a contract */
router.post(
  '/:id/renew',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = renewContractSchemaWithDocumentValidation.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const contract = await renewContract(
        req.params.id,
        parsed.data,
        req.user.id
      );

      if ((parsed.data.serviceFrequency !== undefined || parsed.data.serviceSchedule !== undefined) && contract.status === 'active') {
        try {
          const regenerationResult = await regenerateRecurringJobsForContract({
            contractId: contract.id,
            createdByUserId: req.user.id,
            assignedTeamId: contract.assignedTeam?.id || null,
            assignedToUserId: contract.assignedToUser?.id || null,
            reason: 'Recurring schedule updated from contract renewal',
          });

          await logContractActivity({
            contractId: contract.id,
            action: 'jobs_auto_generated',
            performedByUserId: req.user.id,
            metadata: {
              created: regenerationResult.created,
              canceled: regenerationResult.canceled,
              source: 'contract_renewal_schedule_change',
            },
          });
        } catch (regenerationError) {
          logger.error('Failed to regenerate recurring jobs after contract renewal:', regenerationError);
        }
      }

      await logContractActivity({
        contractId: contract.id,
        action: 'renewed',
        performedByUserId: req.user.id,
        metadata: { renewalNumber: contract.renewalNumber },
      });

      res.json({ data: contract });
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
      const parsed = createStandaloneContractSchemaWithDocumentValidation.safeParse(req.body);
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
        metadata: { source: 'standalone' },
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

/** Download custom Terms & Conditions document */
router.get(
  '/:id/terms-document',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_READ),
  verifyOwnership({ resourceType: 'contract' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contract = await prisma.contract.findUnique({
        where: { id: req.params.id },
        select: {
          contractNumber: true,
          termsDocumentName: true,
          termsDocumentMimeType: true,
          termsDocumentDataUrl: true,
        },
      });

      if (!contract || !contract.termsDocumentDataUrl || !contract.termsDocumentName || !contract.termsDocumentMimeType) {
        throw new NotFoundError('Terms document not found');
      }

      const fileBuffer = decodeDataUrlToBuffer(contract.termsDocumentDataUrl);
      const safeFilename = contract.termsDocumentName.replace(/"/g, '');

      res.setHeader('Content-Type', contract.termsDocumentMimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      res.setHeader('Content-Length', fileBuffer.length.toString());
      res.send(fileBuffer);
    } catch (error) {
      next(error);
    }
  }
);

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

      const termsDocument = await prisma.contract.findUnique({
        where: { id: req.params.id },
        select: {
          termsDocumentMimeType: true,
          termsDocumentDataUrl: true,
        },
      });

      // If a custom contract PDF was uploaded, prefer it for preview/download.
      const pdfBuffer =
        termsDocument?.termsDocumentMimeType === 'application/pdf' &&
        termsDocument.termsDocumentDataUrl
          ? decodeDataUrlToBuffer(termsDocument.termsDocumentDataUrl)
          : await generateContractPdf(contract as any);

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

router.get(
  '/:id/amendments',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_READ),
  verifyOwnership({ resourceType: 'contract' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const amendments = await listContractAmendments(req.params.id);
      res.json({ data: amendments });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/amendments',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_WRITE),
  verifyOwnership({ resourceType: 'contract' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const parsed = createContractAmendmentSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const amendment = await createContractAmendment(req.params.id, parsed.data, req.user.id);

      await logContractActivity({
        contractId: req.params.id,
        action: 'amendment_created',
        performedByUserId: req.user.id,
        metadata: {
          amendmentId: amendment.id,
          amendmentNumber: amendment.amendmentNumber,
          status: amendment.status,
        },
      });

      res.status(201).json({ data: amendment });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id/amendments/:amendmentId',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_READ),
  verifyOwnership({ resourceType: 'contract' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const amendment = await getContractAmendmentById(req.params.amendmentId);
      if (!amendment || amendment.contractId !== req.params.id) {
        throw new NotFoundError('Amendment not found');
      }

      res.json({ data: amendment });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:id/amendments/:amendmentId',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_WRITE),
  verifyOwnership({ resourceType: 'contract' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const parsed = updateContractAmendmentSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const existing = await getContractAmendmentById(req.params.amendmentId);
      if (!existing || existing.contractId !== req.params.id) {
        throw new NotFoundError('Amendment not found');
      }

      const amendment = await updateContractAmendment(
        req.params.amendmentId,
        parsed.data,
        req.user.id
      );

      await logContractActivity({
        contractId: req.params.id,
        action: 'amendment_updated',
        performedByUserId: req.user.id,
        metadata: {
          amendmentId: amendment.id,
          amendmentNumber: amendment.amendmentNumber,
          status: amendment.status,
          fields: Object.keys(parsed.data),
        },
      });

      res.json({ data: amendment });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/amendments/:amendmentId/recalculate',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_WRITE),
  verifyOwnership({ resourceType: 'contract' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const parsed = recalculateContractAmendmentSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const existing = await getContractAmendmentById(req.params.amendmentId);
      if (!existing || existing.contractId !== req.params.id) {
        throw new NotFoundError('Amendment not found');
      }

      const result = await recalculateContractAmendment(
        req.params.amendmentId,
        parsed.data,
        req.user.id
      );

      await logContractActivity({
        contractId: req.params.id,
        action: 'amendment_recalculated',
        performedByUserId: req.user.id,
        metadata: {
          amendmentId: result.amendment.id,
          amendmentNumber: result.amendment.amendmentNumber,
          newMonthlyValue: result.amendment.newMonthlyValue,
          pricingPlanId: result.amendment.pricingPlanId,
        },
      });

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/amendments/:amendmentId/approve',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_ADMIN),
  verifyOwnership({ resourceType: 'contract' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const existing = await getContractAmendmentById(req.params.amendmentId);
      if (!existing || existing.contractId !== req.params.id) {
        throw new NotFoundError('Amendment not found');
      }

      const amendment = await approveContractAmendment(req.params.amendmentId, req.user.id);

      await logContractActivity({
        contractId: req.params.id,
        action: 'amendment_approved',
        performedByUserId: req.user.id,
        metadata: {
          amendmentId: amendment.id,
          amendmentNumber: amendment.amendmentNumber,
        },
      });

      res.json({ data: amendment });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/amendments/:amendmentId/reject',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_ADMIN),
  verifyOwnership({ resourceType: 'contract' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const parsed = rejectContractAmendmentSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const existing = await getContractAmendmentById(req.params.amendmentId);
      if (!existing || existing.contractId !== req.params.id) {
        throw new NotFoundError('Amendment not found');
      }

      const amendment = await rejectContractAmendment(
        req.params.amendmentId,
        parsed.data.rejectedReason,
        req.user.id
      );

      await logContractActivity({
        contractId: req.params.id,
        action: 'amendment_rejected',
        performedByUserId: req.user.id,
        metadata: {
          amendmentId: amendment.id,
          amendmentNumber: amendment.amendmentNumber,
        },
      });

      res.json({ data: amendment });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/amendments/:amendmentId/apply',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_ADMIN),
  verifyOwnership({ resourceType: 'contract' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const parsed = applyContractAmendmentSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const existing = await getContractAmendmentById(req.params.amendmentId);
      if (!existing || existing.contractId !== req.params.id) {
        throw new NotFoundError('Amendment not found');
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const effectiveDate = new Date(existing.effectiveDate);
      effectiveDate.setHours(0, 0, 0, 0);
      const applyingEarly = effectiveDate.getTime() > today.getTime();

      if (applyingEarly && !parsed.data.forceApply) {
        throw new ValidationError(
          `This contract change starts on ${existing.effectiveDate.toISOString().slice(0, 10)}. Review it now, or confirm an early apply override if you need it to start today.`,
          {
            field: 'forceApply',
            effectiveDate: existing.effectiveDate.toISOString(),
          }
        );
      }

      const result = await applyContractAmendmentWorkflow(req.params.amendmentId, {
        appliedByUserId: req.user.id,
        forceApply: parsed.data.forceApply,
        source: 'manual',
      });

      res.json({
        data: {
          amendment: result.amendment,
          recurringJobs: result.recurringJobs,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

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
