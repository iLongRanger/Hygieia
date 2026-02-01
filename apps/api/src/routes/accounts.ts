import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { verifyOwnership } from '../middleware/ownership';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../middleware/errorHandler';
import {
  listAccounts,
  getAccountById,
  getAccountByName,
  createAccount,
  updateAccount,
  archiveAccount,
  restoreAccount,
  deleteAccount,
} from '../services/accountService';
import {
  createAccountSchema,
  updateAccountSchema,
  listAccountsQuerySchema,
} from '../schemas/account';
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

router.get(
  '/',
  authenticate,
  requireRole('owner', 'admin', 'manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listAccountsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const result = await listAccounts(parsed.data);
      res.json({ data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id',
  authenticate,
  requireRole('owner', 'admin', 'manager'),
  verifyOwnership({ resourceType: 'account' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = await getAccountById(req.params.id);
      if (!account) {
        throw new NotFoundError('Account not found');
      }
      res.json({ data: account });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/',
  authenticate,
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createAccountSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const existing = await getAccountByName(parsed.data.name);
      if (existing) {
        throw new ConflictError('Account with this name already exists');
      }

      const account = await createAccount({
        ...parsed.data,
        createdByUserId: req.user.id,
      });

      res.status(201).json({ data: account });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:id',
  authenticate,
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getAccountById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Account not found');
      }

      const parsed = updateAccountSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      if (parsed.data.name && parsed.data.name !== existing.name) {
        const duplicate = await getAccountByName(parsed.data.name);
        if (duplicate) {
          throw new ConflictError('Account with this name already exists');
        }
      }

      const account = await updateAccount(req.params.id, parsed.data);
      res.json({ data: account });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/archive',
  authenticate,
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getAccountById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Account not found');
      }

      const account = await archiveAccount(req.params.id);
      res.json({ data: account });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/restore',
  authenticate,
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getAccountById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Account not found');
      }

      const account = await restoreAccount(req.params.id);
      res.json({ data: account });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id',
  authenticate,
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getAccountById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Account not found');
      }

      await deleteAccount(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
