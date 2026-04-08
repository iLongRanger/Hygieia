import { Router, Request, Response, NextFunction } from 'express';
import {
  authenticateCredentials,
  beginPasswordSetVerification,
  completeLogin,
  refreshAccessToken,
  getUserById,
  logout,
  logoutAll,
  issuePasswordSetTokenForEmail,
  consumePasswordSetToken,
  changeOwnPassword,
  issueSmsVerificationChallenge,
  verifySmsChallenge,
} from '../services/authService';
import { authenticate } from '../middleware/auth';
import {
  UnauthorizedError,
  ValidationError,
} from '../middleware/errorHandler';
import { authRateLimiter, sensitiveRateLimiter } from '../middleware/rateLimiter';
import { validatePassword } from '../utils/passwordPolicy';
import { isEmailConfigured } from '../config/email';
import { sendNotificationEmail } from '../services/emailService';
import { buildPasswordResetHtml, buildPasswordResetSubject } from '../templates/passwordReset';
import { requireWebAppBaseUrl } from '../lib/appUrl';
import { getUserById as getDetailedUserById, updateUser } from '../services/userService';
import { updateCurrentUserProfileSchema } from '../schemas/user';

const router: Router = Router();
const REFRESH_TOKEN_COOKIE = 'hygieia_refresh_token';

function getRefreshTokenCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function setRefreshTokenCookie(res: Response, refreshToken: string) {
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, getRefreshTokenCookieOptions());
}

function clearRefreshTokenCookie(res: Response) {
  res.clearCookie(REFRESH_TOKEN_COOKIE, getRefreshTokenCookieOptions());
}

function getCookieValue(req: Request, name: string): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return null;
  }

  for (const pair of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = pair.trim().split('=');
    if (rawName === name) {
      return decodeURIComponent(rawValue.join('='));
    }
  }

  return null;
}

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

      const normalizedEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        throw new ValidationError('Invalid email format', { field: 'email' });
      }

      const user = await authenticateCredentials({
        email: normalizedEmail,
        password,
      });

      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      res.json({
        data: {
          requiresTwoFactor: true,
          verification: await issueSmsVerificationChallenge(user.id, 'login'),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/login/verify',
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { challengeId, code } = req.body;

      if (!challengeId || typeof challengeId !== 'string') {
        throw new ValidationError('Challenge ID is required', { field: 'challengeId' });
      }

      if (!code || typeof code !== 'string') {
        throw new ValidationError('Verification code is required', { field: 'code' });
      }

      const challenge = await verifySmsChallenge(challengeId, code, 'login');
      const result = await completeLogin(challenge.userId, {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      });

      setRefreshTokenCookie(res, result.tokens.refreshToken);
      res.json({
        data: {
          user: result.user,
          tokens: {
            accessToken: result.tokens.accessToken,
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
  '/forgot-password',
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== 'string') {
        throw new ValidationError('Email is required', { field: 'email' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        throw new ValidationError('Invalid email format', { field: 'email' });
      }

      const tokenResult = await issuePasswordSetTokenForEmail(normalizedEmail);
      if (tokenResult && isEmailConfigured()) {
        try {
          const baseUrl = requireWebAppBaseUrl();
          const resetUrl = `${baseUrl}/auth/reset-password?token=${tokenResult.token}`;
          await sendNotificationEmail(
            tokenResult.user.email,
            buildPasswordResetSubject(),
            buildPasswordResetHtml({
              fullName: tokenResult.user.fullName,
              resetUrl,
            })
          );
        } catch {
          // Keep response generic to avoid enumeration and leaking delivery details.
        }
      }

      return res.json({
        data: {
          message:
            'If an account exists for that email, a password reset link has been sent.',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/set-password/challenge',
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;

      if (!token || typeof token !== 'string') {
        throw new ValidationError('Token is required', { field: 'token' });
      }

      const result = await beginPasswordSetVerification(token);
      return res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/set-password',
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password, challengeId, code } = req.body;

      if (!token || !password) {
        return res.status(400).json({ error: 'Token and password are required' });
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          error: passwordValidation.error || 'Invalid password',
        });
      }

      await consumePasswordSetToken(token, password, {
        smsChallengeId: typeof challengeId === 'string' ? challengeId : undefined,
        smsCode: typeof code === 'string' ? code : undefined,
      });

      return res.json({ message: 'Password set successfully. You can now log in.' });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/reset-password',
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ error: 'Token and password are required' });
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          error: passwordValidation.error || 'Invalid password',
        });
      }

      await consumePasswordSetToken(token, password);

      clearRefreshTokenCookie(res);
      return res.json({ message: 'Password reset successfully. You can now log in.' });
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
      const refreshToken =
        (typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : null) ??
        getCookieValue(req, REFRESH_TOKEN_COOKIE);

      if (refreshToken) {
        await logout(refreshToken);
      }

      clearRefreshTokenCookie(res);

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
      clearRefreshTokenCookie(res);

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
      const refreshToken =
        (typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : null) ??
        getCookieValue(req, REFRESH_TOKEN_COOKIE);

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

      setRefreshTokenCookie(res, tokens.refreshToken);
      res.json({
        data: {
          tokens: {
            accessToken: tokens.accessToken,
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

router.get(
  '/profile',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Not authenticated');
      }

      const user = await getDetailedUserById(req.user.id);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      res.json({ data: user });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/profile',
  authenticate,
  sensitiveRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Not authenticated');
      }

      const parsed = updateCurrentUserProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        throw new ValidationError(firstError.message, {
          field: firstError.path.join('.'),
        });
      }

      const updatedUser = await updateUser(req.user.id, parsed.data);
      res.json({ data: updatedUser });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/change-password',
  authenticate,
  sensitiveRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Not authenticated');
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || typeof currentPassword !== 'string') {
        throw new ValidationError('Current password is required', { field: 'currentPassword' });
      }

      if (!newPassword || typeof newPassword !== 'string') {
        throw new ValidationError('New password is required', { field: 'newPassword' });
      }

      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new ValidationError(passwordValidation.error || 'Invalid password', {
          field: 'newPassword',
        });
      }

      await changeOwnPassword(req.user.id, currentPassword, newPassword);
      clearRefreshTokenCookie(res);

      res.json({
        data: {
          message: 'Password changed successfully. Please sign in again.',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
