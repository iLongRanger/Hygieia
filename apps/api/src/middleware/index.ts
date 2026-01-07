export { authenticate, optionalAuth } from './auth';
export type { AuthenticatedUser } from '../types/express';
export {
  requireRole,
  requirePermission,
  requireAdmin,
  requireManager,
  requireOwner,
} from './rbac';
export {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  requestIdMiddleware,
  errorHandler,
  notFoundHandler,
} from './errorHandler';
