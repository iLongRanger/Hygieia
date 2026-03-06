import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { ForbiddenError, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { PERMISSIONS } from '../types';
import { prisma } from '../lib/prisma';
import {
  getContractAmendmentById,
  listOrganizationContractAmendments,
} from '../services/contractAmendmentService';

const router: Router = Router();

const listAmendmentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['draft', 'pending_approval', 'approved', 'applied', 'canceled']).optional(),
  search: z.string().trim().max(120).optional(),
});

async function assertAmendmentAccess(req: Request, contractId: string): Promise<void> {
  if (!req.user) {
    throw new ValidationError('User not authenticated');
  }

  const { role, id: userId, teamId } = req.user;
  if (role === 'owner' || role === 'admin') return;

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      createdByUserId: true,
      assignedToUserId: true,
      assignedTeamId: true,
      account: {
        select: { accountManagerId: true },
      },
    },
  });

  if (!contract) {
    throw new NotFoundError('Contract not found');
  }

  if (role === 'manager') {
    if (contract.createdByUserId === userId || contract.account.accountManagerId === userId) return;
    throw new ForbiddenError('Access denied');
  }

  if (role === 'subcontractor') {
    if (contract.assignedToUserId === userId || (teamId && contract.assignedTeamId === teamId)) return;
    throw new ForbiddenError('Access denied');
  }

  if (role === 'cleaner') {
    if (contract.assignedToUserId === userId) return;
    throw new ForbiddenError('Access denied');
  }
}

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listAmendmentsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors[0]?.message || 'Invalid query');
      }

      const result = await listOrganizationContractAmendments(parsed.data, {
        userRole: req.user?.role,
        userId: req.user?.id,
        userTeamId: req.user?.teamId,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.CONTRACTS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const amendment = await getContractAmendmentById(req.params.id);
      if (!amendment) {
        throw new NotFoundError('Amendment not found');
      }

      await assertAmendmentAccess(req, amendment.contractId);
      res.json({ data: amendment });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
