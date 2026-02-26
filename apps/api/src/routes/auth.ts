import { Router, Request, Response, NextFunction } from 'express';
import {
  login,
  refreshAccessToken,
  getUserById,
  createDevUser,
  logout,
  logoutAll,
  hashPassword,
} from '../services/authService';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import {
  BadRequestError,
  UnauthorizedError,
  ValidationError,
} from '../middleware/errorHandler';
import { UserRole, isValidRole } from '../types/roles';
import { authRateLimiter } from '../middleware/rateLimiter';
import { validatePassword } from '../utils/passwordPolicy';

const router: Router = Router();

router.post(
  '/login',
  authRateLimiter,
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

      const result = await login(
        { email, password },
        {
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
        }
      );

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
  '/set-password',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ error: 'Token and password are required' });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      const passwordToken = await prisma.passwordSetToken.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!passwordToken || passwordToken.usedAt || passwordToken.expiresAt < new Date()) {
        return res.status(400).json({ error: 'Invalid or expired token' });
      }

      const passwordHash = await hashPassword(password);
      await prisma.user.update({
        where: { id: passwordToken.userId },
        data: { passwordHash, status: 'active' },
      });

      await prisma.passwordSetToken.update({
        where: { id: passwordToken.id },
        data: { usedAt: new Date() },
      });

      return res.json({ message: 'Password set successfully. You can now log in.' });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/logout',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        await logout(refreshToken);
      }

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
  '/logout-all',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Not authenticated');
      }

      const revokedCount = await logoutAll(req.user.id);

      res.json({
        data: {
          message: 'All sessions logged out successfully',
          sessionsRevoked: revokedCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/refresh',
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken || typeof refreshToken !== 'string') {
        throw new ValidationError('Refresh token is required', {
          field: 'refreshToken',
        });
      }

      const tokens = await refreshAccessToken(refreshToken, {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      });

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

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new ValidationError(passwordValidation.error || 'Invalid password', {
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
