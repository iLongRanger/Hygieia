import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
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
} from '../services/proposalService';
import {
  createProposalSchema,
  updateProposalSchema,
  listProposalsQuerySchema,
  sendProposalSchema,
  acceptProposalSchema,
  rejectProposalSchema,
} from '../schemas/proposal';
import { ZodError } from 'zod';

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

// List all proposals
router.get(
  '/',
  authenticate,
  requireRole('owner', 'admin', 'manager'),
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

// Get proposal by ID
router.get(
  '/:id',
  authenticate,
  requireRole('owner', 'admin', 'manager'),
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
  requireRole('owner', 'admin', 'manager'),
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
  requireRole('owner', 'admin', 'manager'),
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
        opportunityId: parsed.data.opportunityId,
        facilityId: parsed.data.facilityId,
        description: parsed.data.description,
        validUntil: parsed.data.validUntil,
        taxRate: parsed.data.taxRate,
        notes: parsed.data.notes,
        termsAndConditions: parsed.data.termsAndConditions,
        proposalItems: parsed.data.proposalItems,
        proposalServices: parsed.data.proposalServices,
        createdByUserId: req.user.id,
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
  requireRole('owner', 'admin', 'manager'),
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

      // Prevent editing sent, accepted, or rejected proposals
      if (['sent', 'accepted', 'rejected'].includes(proposal.status)) {
        throw new ValidationError(
          `Cannot edit proposal with status: ${proposal.status}. Please create a new proposal instead.`
        );
      }

      const updateData: any = {
        opportunityId: parsed.data.opportunityId,
        accountId: parsed.data.accountId,
        facilityId: parsed.data.facilityId,
        title: parsed.data.title,
        status: parsed.data.status,
        description: parsed.data.description,
        validUntil: parsed.data.validUntil,
        taxRate: parsed.data.taxRate,
        notes: parsed.data.notes,
        termsAndConditions: parsed.data.termsAndConditions,
      };

      if (parsed.data.proposalItems !== undefined) {
        updateData.proposalItems = parsed.data.proposalItems;
      }

      if (parsed.data.proposalServices !== undefined) {
        updateData.proposalServices = parsed.data.proposalServices;
      }

      const updated = await updateProposal(req.params.id, updateData);
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
  requireRole('owner', 'admin', 'manager'),
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

      const sent = await sendProposal(req.params.id);

      // TODO: Implement email sending logic here using emailService
      // await emailService.sendProposal(sent, parsed.data);

      res.json({ data: sent, message: 'Proposal sent successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Mark proposal as viewed (typically called when client opens the proposal)
router.post(
  '/:id/viewed',
  authenticate,
  requireRole('owner', 'admin', 'manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const proposal = await getProposalById(req.params.id);
      if (!proposal) {
        throw new NotFoundError('Proposal not found');
      }

      const viewed = await markProposalAsViewed(req.params.id);
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
  requireRole('owner', 'admin', 'manager'),
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

      // TODO: Create contract from accepted proposal
      // TODO: Update opportunity status to closed-won

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
  requireRole('owner', 'admin', 'manager'),
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

      // TODO: Update opportunity status if needed

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
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const proposal = await getProposalById(req.params.id);
      if (!proposal) {
        throw new NotFoundError('Proposal not found');
      }

      const archived = await archiveProposal(req.params.id);
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
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const proposal = await getProposalById(req.params.id);
      if (!proposal) {
        throw new NotFoundError('Proposal not found');
      }

      const restored = await restoreProposal(req.params.id);
      res.json({ data: restored, message: 'Proposal restored successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Delete proposal (permanent)
router.delete(
  '/:id',
  authenticate,
  requireRole('owner'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const proposal = await getProposalById(req.params.id);
      if (!proposal) {
        throw new NotFoundError('Proposal not found');
      }

      await deleteProposal(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
