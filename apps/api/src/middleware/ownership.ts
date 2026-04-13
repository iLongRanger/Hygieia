import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from './errorHandler';
import { prisma } from '../lib/prisma';
import { logSecurityEvent } from '../lib/logger';
import type { AuthenticatedUser } from '../types/express';
import { applyDueContractAssignmentOverrideForContract } from '../services/contractAssignmentOverrideService';

export type ResourceType =
  | 'lead'
  | 'account'
  | 'facility'
  | 'proposal'
  | 'quotation'
  | 'contract'
  | 'contact'
  | 'appointment'
  | 'invoice';

interface OwnershipContext {
  resourceType: ResourceType;
  paramName?: string; // defaults to 'id'
}

interface OwnershipCheckContext {
  resourceType: ResourceType;
  resourceId: string;
  path?: string;
  method?: string;
}

async function hasManagerAccountScope(userId: string, accountId: string): Promise<boolean> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { accountManagerId: true },
  });

  return account?.accountManagerId === userId;
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
      return hasManagerAccountScope(userId, resourceId);
    }

    case 'facility': {
      const facility = await prisma.facility.findUnique({
        where: { id: resourceId },
        select: {
          account: { select: { accountManagerId: true } },
        },
      });
      if (!facility) return false;
      return facility.account.accountManagerId === userId;
    }

    case 'proposal': {
      const proposal = await prisma.proposal.findUnique({
        where: { id: resourceId },
        select: {
          account: { select: { accountManagerId: true } },
        },
      });
      if (!proposal) return false;
      return proposal.account.accountManagerId === userId;
    }

    case 'quotation': {
      const quotation = await prisma.quotation.findUnique({
        where: { id: resourceId },
        select: {
          account: { select: { accountManagerId: true } },
        },
      });
      if (!quotation) return false;
      return quotation.account.accountManagerId === userId;
    }

    case 'contract': {
      const contract = await prisma.contract.findUnique({
        where: { id: resourceId },
        select: {
          account: { select: { accountManagerId: true } },
        },
      });
      if (!contract) return false;
      return contract.account.accountManagerId === userId;
    }

    case 'contact': {
      const contact = await prisma.contact.findUnique({
        where: { id: resourceId },
        select: {
          account: { select: { accountManagerId: true } },
        },
      });
      if (!contact) return false;
      return contact.account?.accountManagerId === userId;
    }

    case 'appointment': {
      const appointment = await prisma.appointment.findUnique({
        where: { id: resourceId },
        select: {
          account: { select: { accountManagerId: true } },
        },
      });
      if (!appointment) return false;
      return appointment.account?.accountManagerId === userId;
    }

    case 'invoice': {
      const invoice = await prisma.invoice.findUnique({
        where: { id: resourceId },
        select: {
          account: { select: { accountManagerId: true } },
        },
      });
      if (!invoice) return false;
      return invoice.account.accountManagerId === userId;
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
      const paramName = context.paramName ?? 'id';
      const resourceId = req.params[paramName];

      if (!resourceId) {
        throw new ForbiddenError('Resource ID not provided');
      }

      await ensureOwnershipAccess(req.user, {
        resourceType: context.resourceType,
        resourceId,
        path: req.path,
        method: req.method,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
}

export async function ensureOwnershipAccess(
  user: AuthenticatedUser | undefined,
  context: OwnershipCheckContext
): Promise<void> {
  if (!user) {
    throw new ForbiddenError('Authentication required');
  }

  const { role, id: userId } = user;
  const { resourceType, resourceId, path, method } = context;

  if (role === 'owner' || role === 'admin') {
    return;
  }

  if (role === 'subcontractor') {
    const teamId = user.teamId;
    let hasAccess = false;

    if (resourceType === 'contract') {
      await applyDueContractAssignmentOverrideForContract(resourceId);
      const contract = await prisma.contract.findUnique({
        where: { id: resourceId },
        select: { assignedTeamId: true, assignedToUserId: true },
      });
      hasAccess =
        contract?.assignedToUserId === userId ||
        (Boolean(teamId) && contract?.assignedTeamId === teamId);
    } else if (resourceType === 'facility' && teamId) {
      const count = await prisma.contract.count({
        where: { facilityId: resourceId, assignedTeamId: teamId },
      });
      hasAccess = count > 0;
    }

    if (!hasAccess) {
      logSecurityEvent('idor_attempt_blocked', {
        userId,
        resourceType,
        resourceId,
        path,
        method,
      });
      throw new ForbiddenError('Access denied');
    }

    return;
  }

  if (role === 'manager') {
    const hasAccess = await hasManagerAccess(userId, resourceType, resourceId);

    if (!hasAccess) {
      logSecurityEvent('idor_attempt_blocked', {
        userId,
        resourceType,
        resourceId,
        path,
        method,
      });
      throw new ForbiddenError('You do not have access to this resource');
    }

    return;
  }

  if (role === 'cleaner') {
    if (resourceType === 'contract') {
      await applyDueContractAssignmentOverrideForContract(resourceId);
      const contract = await prisma.contract.findUnique({
        where: { id: resourceId },
        select: { assignedToUserId: true },
      });

      if (contract?.assignedToUserId === userId) {
        return;
      }
    }

    throw new ForbiddenError('Insufficient permissions');
  }
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

export async function ensureManagerAccountAccess(
  user: AuthenticatedUser | undefined,
  accountId: string,
  context?: Pick<OwnershipCheckContext, 'path' | 'method'>
): Promise<void> {
  if (!user) {
    throw new ForbiddenError('Authentication required');
  }

  if (user.role === 'owner' || user.role === 'admin') {
    return;
  }

  if (user.role !== 'manager') {
    throw new ForbiddenError('Insufficient permissions');
  }

  const hasAccess = await hasManagerAccountScope(user.id, accountId);
  if (!hasAccess) {
    logSecurityEvent('idor_attempt_blocked', {
      userId: user.id,
      resourceType: 'account',
      resourceId: accountId,
      path: context?.path,
      method: context?.method,
    });
    throw new ForbiddenError('You do not have access to this account');
  }
}
