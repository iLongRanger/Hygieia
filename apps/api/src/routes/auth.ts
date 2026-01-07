import { Router, Request, Response, NextFunction } from 'express';
import {
  login,
  refreshAccessToken,
  getUserById,
  createDevUser,
} from '../services/authService';
import { authenticate } from '../middleware/auth';
import {
  BadRequestError,
  UnauthorizedError,
  ValidationError,
} from '../middleware/errorHandler';
import { UserRole, isValidRole } from '../types/roles';

const router: Router = Router();

router.post(
  '/login',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      if (!email || typeof email !== 'string') {
        throw new ValidationError('Email is required', { field: 'email' });
      }

      if (!password || typeof password !== 'string') {
        throw new ValidationError('Password is required', {
          field: 'password',
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new ValidationError('Invalid email format', { field: 'email' });
      }

      const result = await login({ email, password });

      if (!result) {
        throw new UnauthorizedError('Invalid email or password');
      }

      res.json({
        data: {
          user: result.user,
          tokens: {
            accessToken: result.tokens.accessToken,
            refreshToken: result.tokens.refreshToken,
            expiresIn: result.tokens.expiresIn,
            tokenType: 'Bearer',
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/logout',
  authenticate,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({
        data: {
          message: 'Logged out successfully',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/refresh',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken || typeof refreshToken !== 'string') {
        throw new ValidationError('Refresh token is required', {
          field: 'refreshToken',
        });
      }

      const tokens = await refreshAccessToken(refreshToken);

      if (!tokens) {
        throw new UnauthorizedError('Invalid or expired refresh token');
      }

      res.json({
        data: {
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
            tokenType: 'Bearer',
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Not authenticated');
      }

      const user = await getUserById(req.user.id);

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      res.json({
        data: {
          user,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/dev/create-user',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        throw new BadRequestError(
          'This endpoint is only available in development mode'
        );
      }

      const { email, fullName, password, role } = req.body;

      if (!email || typeof email !== 'string') {
        throw new ValidationError('Email is required', { field: 'email' });
      }

      if (!fullName || typeof fullName !== 'string') {
        throw new ValidationError('Full name is required', {
          field: 'fullName',
        });
      }

      if (!password || typeof password !== 'string') {
        throw new ValidationError('Password is required', {
          field: 'password',
        });
      }

      if (password.length < 6) {
        throw new ValidationError('Password must be at least 6 characters', {
          field: 'password',
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new ValidationError('Invalid email format', { field: 'email' });
      }

      const userRole: UserRole = role && isValidRole(role) ? role : 'owner';

      const result = await createDevUser(email, fullName, password, userRole);

      res.status(201).json({
        data: {
          user: result.user,
          tokens: {
            accessToken: result.tokens.accessToken,
            refreshToken: result.tokens.refreshToken,
            expiresIn: result.tokens.expiresIn,
            tokenType: 'Bearer',
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
