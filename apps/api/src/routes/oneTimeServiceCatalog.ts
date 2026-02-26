import { Router, type NextFunction, type Request, type Response } from 'express';
import { ZodError } from 'zod';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { ValidationError } from '../middleware/errorHandler';
import { PERMISSIONS } from '../types';
import {
  createOneTimeServiceCatalogItemSchema,
  listOneTimeServiceCatalogQuerySchema,
  updateOneTimeServiceCatalogItemSchema,
} from '../schemas/oneTimeServiceCatalog';
import {
  createOneTimeServiceCatalogItem,
  deleteOneTimeServiceCatalogItem,
  listOneTimeServiceCatalog,
  updateOneTimeServiceCatalogItem,
} from '../services/oneTimeServiceCatalogService';

const router: Router = Router();

function handleZodError(error: ZodError): ValidationError {
  const firstError = error.errors[0];
  return new ValidationError(firstError.message, {
    field: firstError.path.join('.'),
    errors: error.errors.map((entry) => ({ field: entry.path.join('.'), message: entry.message })),
  });
}

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.QUOTATIONS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listOneTimeServiceCatalogQuerySchema.safeParse(req.query);
      if (!parsed.success) throw handleZodError(parsed.error);

      const result = await listOneTimeServiceCatalog(parsed.data);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.QUOTATIONS_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createOneTimeServiceCatalogItemSchema.safeParse(req.body);
      if (!parsed.success) throw handleZodError(parsed.error);

      const item = await createOneTimeServiceCatalogItem(parsed.data, req.user!.id);
      res.status(201).json({ data: item });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.QUOTATIONS_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateOneTimeServiceCatalogItemSchema.safeParse(req.body);
      if (!parsed.success) throw handleZodError(parsed.error);

      const item = await updateOneTimeServiceCatalogItem(req.params.id, parsed.data);
      res.json({ data: item });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.QUOTATIONS_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteOneTimeServiceCatalogItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
