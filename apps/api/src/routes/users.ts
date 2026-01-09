import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole, requireAdmin } from '../middleware/rbac';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../middleware/errorHandler';
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  assignRole,
  removeRole,
  listRoles,
  getUserByEmail,
} from '../services/userService';
import {
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
  assignRoleSchema,
} from '../schemas/user';
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
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listUsersQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const result = await listUsers(parsed.data);

      res.json({
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/roles',
  authenticate,
  requireRole('owner', 'admin'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const roles = await listRoles();
      res.json({ data: roles });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id',
  authenticate,
  requireRole('owner', 'admin', 'manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = await getUserById(id);

      if (!user) {
        throw new NotFoundError('User not found', { userId: id });
      }

      res.json({ data: user });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createUserSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const existingUser = await getUserByEmail(parsed.data.email);
      if (existingUser) {
        throw new ConflictError('User with this email already exists', {
          email: parsed.data.email,
        });
      }

      const user = await createUser(parsed.data);

      res.status(201).json({ data: user });
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
      const { id } = req.params;

      const existingUser = await getUserById(id);
      if (!existingUser) {
        throw new NotFoundError('User not found', { userId: id });
      }

      const parsed = updateUserSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const user = await updateUser(id, parsed.data);

      res.json({ data: user });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const existingUser = await getUserById(id);
      if (!existingUser) {
        throw new NotFoundError('User not found', { userId: id });
      }

      if (req.user?.id === id) {
        throw new ValidationError('Cannot delete your own account');
      }

      await deleteUser(id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/roles',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const existingUser = await getUserById(id);
      if (!existingUser) {
        throw new NotFoundError('User not found', { userId: id });
      }

      const parsed = assignRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const user = await assignRole(id, parsed.data.role);

      res.json({ data: user });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id/roles/:roleKey',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, roleKey } = req.params;

      const existingUser = await getUserById(id);
      if (!existingUser) {
        throw new NotFoundError('User not found', { userId: id });
      }

      const parsed = assignRoleSchema.safeParse({ role: roleKey });
      if (!parsed.success) {
        throw handleZodError(parsed.error);
      }

      const user = await removeRole(id, parsed.data.role);

      res.json({ data: user });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:id/password',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { password } = req.body;

      if (!password || password.length < 8) {
        throw new ValidationError('Password must be at least 8 characters long');
      }

      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);

      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const user = await prisma.user.update({
        where: { id },
        data: { passwordHash: hashedPassword },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          avatarUrl: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await prisma.$disconnect();

      if (!user) {
        throw new NotFoundError('User');
      }

      res.json({ data: user, message: 'Password updated successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
