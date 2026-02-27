import { Request, Response, NextFunction } from 'express';
import { UserRole, hasPermission, isRoleAtLeast } from '../types/roles';

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          details: {
            required_role: allowedRoles.join(' OR '),
            current_role: req.user.role,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
      return;
    }

    next();
  };
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
      return;
    }

    if (!hasPermission(req.user.role, permission)) {
      res.status(403).json({
        error: {
          code: 'INSUFFICIENT_SCOPE',
          message: `Missing required permission: ${permission}`,
          details: {
            required_permission: permission,
            current_role: req.user.role,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
      return;
    }

    next();
  };
}

export function requireRoleAtLeast(minimumRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
      return;
    }

    if (!isRoleAtLeast(req.user.role, minimumRole)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Requires at least ${minimumRole} role`,
          details: {
            minimum_role: minimumRole,
            current_role: req.user.role,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
      return;
    }

    next();
  };
}

export const requireOwner = requireRole('owner');
export const requireAdmin = requireRole('owner', 'admin');
export const requireManager = requireRole('owner', 'admin', 'manager');
export const requireAnyRole = requireRole(
  'owner',
  'admin',
  'manager',
  'cleaner',
  'subcontractor'
);
