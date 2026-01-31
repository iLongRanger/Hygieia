import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import {
  listContracts,
  getContractById,
  createContract,
  createContractFromProposal,
  createStandaloneContract,
  updateContract,
  updateContractStatus,
  signContract,
  terminateContract,
  archiveContract,
  restoreContract,
  renewContract,
  canRenewContract,
  completeInitialClean,
} from '../services/contractService';
import {
  createContractSchema,
  createContractFromProposalSchema,
  createStandaloneContractSchema,
  updateContractSchema,
  updateContractStatusSchema,
  signContractSchema,
  terminateContractSchema,
  renewContractSchema,
  listContractsQuerySchema,
} from '../schemas/contract';
import { BadRequestError } from '../middleware/errorHandler';
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

// List all contracts
router.get(
  '/',
  authenticate,
  requireRole('owner', 'admin', 'manager'),
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

// Get contract by ID
router.get(
  '/:id',
  authenticate,
  requireRole('owner', 'admin', 'manager'),
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
  requireRole('owner', 'admin', 'manager'),
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
  requireRole('owner', 'admin', 'manager'),
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
  requireRole('owner', 'admin', 'manager'),
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

      // Prevent editing contracts after signature/activation
      if (!['draft', 'pending_signature'].includes(existingContract.status)) {
        throw new ValidationError(
          `Cannot edit ${existingContract.status} contract. Create an amendment or new contract instead.`
        );
      }

      const contract = await updateContract(req.params.id, parsed.data);
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
  requireRole('owner', 'admin', 'manager'),
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

      res.json({ data: contract });
    } catch (error) {
      next(error);
    }
  }
);

// Sign contract
router.post(
  '/:id/sign',
  authenticate,
  requireRole('owner', 'admin', 'manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = signContractSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const contract = await signContract(req.params.id, parsed.data);
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
  requireRole('owner', 'admin'),
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
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contract = await archiveContract(req.params.id);
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
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contract = await restoreContract(req.params.id);
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
  requireRole('owner', 'admin', 'manager'),
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
  requireRole('owner', 'admin', 'manager'),
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
  requireRole('owner', 'admin'),
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
  requireRole('owner', 'admin', 'manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const contract = await completeInitialClean(req.params.id, req.user.id);
      res.json({ data: contract, message: 'Initial clean marked as completed' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
