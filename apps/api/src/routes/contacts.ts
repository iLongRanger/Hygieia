import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import {
  listContacts,
  getContactById,
  createContact,
  updateContact,
  archiveContact,
  restoreContact,
  deleteContact,
} from '../services/contactService';
import {
  createContactSchema,
  updateContactSchema,
  listContactsQuerySchema,
} from '../schemas/contact';
import { ZodError } from 'zod';
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

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.CONTACTS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listContactsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const result = await listContacts(parsed.data);
      res.json({ data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.CONTACTS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contact = await getContactById(req.params.id);
      if (!contact) {
        throw new NotFoundError('Contact not found');
      }
      res.json({ data: contact });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.CONTACTS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createContactSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const contact = await createContact({
        ...parsed.data,
        createdByUserId: req.user.id,
      });

      res.status(201).json({ data: contact });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.CONTACTS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getContactById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Contact not found');
      }

      const parsed = updateContactSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const contact = await updateContact(req.params.id, parsed.data);
      res.json({ data: contact });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/archive',
  authenticate,
  requirePermission(PERMISSIONS.CONTACTS_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getContactById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Contact not found');
      }

      const contact = await archiveContact(req.params.id);
      res.json({ data: contact });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/restore',
  authenticate,
  requirePermission(PERMISSIONS.CONTACTS_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getContactById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Contact not found');
      }

      const contact = await restoreContact(req.params.id);
      res.json({ data: contact });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.CONTACTS_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await getContactById(req.params.id);
      if (!existing) {
        throw new NotFoundError('Contact not found');
      }

      await deleteContact(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
