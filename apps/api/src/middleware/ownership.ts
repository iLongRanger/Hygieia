import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from './errorHandler';
import { prisma } from '../lib/prisma';
import { logSecurityEvent } from '../lib/logger';

export type ResourceType =
  | 'lead'
  | 'account'
  | 'facility'
  | 'proposal'
  | 'contract'
  | 'contact'
  | 'appointment';

interface OwnershipContext {
  resourceType: ResourceType;
  paramName?: string; // defaults to 'id'
}

/**
 * Checks if a manager has access to a resource.
 * Managers can access resources they created or are assigned to.
 */
async function hasManagerAccess(
  userId: string,
  resourceType: ResourceType,
  resourceId: string
): Promise<boolean> {
  switch (resourceType) {
    case 'lead': {
      const lead = await prisma.lead.findUnique({
        where: { id: resourceId },
        select: { createdByUserId: true, assignedToUserId: true },
      });
      if (!lead) return false;
      return lead.createdByUserId === userId || lead.assignedToUserId === userId;
    }

    case 'account': {
      const account = await prisma.account.findUnique({
        where: { id: resourceId },
        select: { createdByUserId: true, accountManagerId: true },
      });
      if (!account) return false;
      return account.createdByUserId === userId || account.accountManagerId === userId;
    }

    case 'facility': {
      const facility = await prisma.facility.findUnique({
        where: { id: resourceId },
        select: {
          createdByUserId: true,
          facilityManagerId: true,
          account: { select: { accountManagerId: true } },
        },
      });
      if (!facility) return false;
      return (
        facility.createdByUserId === userId ||
        facility.facilityManagerId === userId ||
        facility.account.accountManagerId === userId
      );
    }

    case 'proposal': {
      const proposal = await prisma.proposal.findUnique({
        where: { id: resourceId },
        select: {
          createdByUserId: true,
          account: { select: { accountManagerId: true } },
        },
      });
      if (!proposal) return false;
      return (
        proposal.createdByUserId === userId ||
        proposal.account.accountManagerId === userId
      );
    }

    case 'contract': {
      const contract = await prisma.contract.findUnique({
        where: { id: resourceId },
        select: {
          createdByUserId: true,
          account: { select: { accountManagerId: true } },
        },
      });
      if (!contract) return false;
      return (
        contract.createdByUserId === userId ||
        contract.account.accountManagerId === userId
      );
    }

    case 'contact': {
      const contact = await prisma.contact.findUnique({
        where: { id: resourceId },
        select: {
          createdByUserId: true,
          account: { select: { accountManagerId: true } },
        },
      });
      if (!contact) return false;
      return (
        contact.createdByUserId === userId ||
        (contact.account?.accountManagerId === userId)
      );
    }

    case 'appointment': {
      const appointment = await prisma.appointment.findUnique({
        where: { id: resourceId },
        select: {
          createdByUserId: true,
          assignedToUserId: true,
        },
      });
      if (!appointment) return false;
      return (
        appointment.createdByUserId === userId ||
        appointment.assignedToUserId === userId
      );
    }

    default:
      return false;
  }
}

/**
 * Middleware to verify resource ownership for IDOR protection.
 * Owners and admins bypass this check.
 * Managers need to have created or be assigned to the resource.
 */
export function verifyOwnership(context: OwnershipContext) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { role, id: userId } = req.user;

      // Owner and admin bypass ownership check
      if (role === 'owner' || role === 'admin') {
        return next();
      }

      // Manager needs ownership verification
      if (role === 'manager') {
        const paramName = context.paramName || 'id';
        const resourceId = req.params[paramName];

        if (!resourceId) {
          throw new ForbiddenError('Resource ID not provided');
        }

        const hasAccess = await hasManagerAccess(
          userId,
          context.resourceType,
          resourceId
        );

        if (!hasAccess) {
          logSecurityEvent('idor_attempt_blocked', {
            userId,
            resourceType: context.resourceType,
            resourceId,
            path: req.path,
            method: req.method,
          });
          throw new ForbiddenError('You do not have access to this resource');
        }
      }

      // Cleaner role - deny access by default for these resources
      if (role === 'cleaner') {
        throw new ForbiddenError('Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to verify account ownership for nested resources.
 * Use when accessing resources by account ID (e.g., /accounts/:accountId/facilities)
 */
export function verifyAccountAccess(paramName = 'accountId') {
  return verifyOwnership({ resourceType: 'account', paramName });
}

/**
 * Middleware to verify facility ownership for nested resources.
 */
export function verifyFacilityAccess(paramName = 'facilityId') {
  return verifyOwnership({ resourceType: 'facility', paramName });
}
