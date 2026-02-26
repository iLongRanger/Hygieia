import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { jwtConfig, getJwtSecret } from '../config/jwt';
import { UserRole, isValidRole, resolveHighestRole } from '../types';

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authorization header required',
          details: { reason: 'missing_authorization_header' },
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
      return;
    }

    const token = authHeader.substring(7);
    const secret = getJwtSecret();

    const decoded = jwt.verify(token, secret, {
      algorithms: [jwtConfig.algorithm],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      clockTolerance: jwtConfig.clockTolerance,
    }) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'User not found',
          details: { reason: 'user_not_found' },
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
      return;
    }

    if (user.status !== 'active') {
      res.status(401).json({
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'User account is not active',
          details: { reason: 'account_disabled', status: user.status },
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
      return;
    }

    const assignedRoles = user.roles
      .map((userRole) => userRole.role?.key)
      .filter(isValidRole);
    const primaryRole = resolveHighestRole(assignedRoles);

    req.user = {
      id: user.id,
      supabaseUserId: user.supabaseUserId,
      email: user.email,
      fullName: user.fullName,
      role: primaryRole,
      teamId: user.teamId,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token has expired',
          details: { reason: 'token_expired' },
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token validation failed',
          details: { reason: error.message },
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Authentication error',
        details: { reason: 'unexpected_error' },
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    });
  }
}

export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  authenticate(req, res, next);
}
