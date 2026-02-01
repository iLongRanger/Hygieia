import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { verifyOwnership } from '../ownership';
import { ForbiddenError } from '../errorHandler';
import { prisma } from '../../lib/prisma';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    lead: { findUnique: jest.fn() },
    account: { findUnique: jest.fn() },
    facility: { findUnique: jest.fn() },
    proposal: { findUnique: jest.fn() },
    contract: { findUnique: jest.fn() },
    contact: { findUnique: jest.fn() },
    appointment: { findUnique: jest.fn() },
  },
}));

jest.mock('../../lib/logger', () => ({
  logSecurityEvent: jest.fn(),
}));

describe('ownership middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      params: { id: 'resource-123' },
      path: '/test',
      method: 'GET',
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  describe('verifyOwnership', () => {
    it('should allow owner role without ownership check', async () => {
      mockReq.user = { id: 'user-123', email: 'test@test.com', role: 'owner' };

      const middleware = verifyOwnership({ resourceType: 'lead' });
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(prisma.lead.findUnique).not.toHaveBeenCalled();
    });

    it('should allow admin role without ownership check', async () => {
      mockReq.user = { id: 'user-123', email: 'test@test.com', role: 'admin' };

      const middleware = verifyOwnership({ resourceType: 'lead' });
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(prisma.lead.findUnique).not.toHaveBeenCalled();
    });

    it('should check ownership for manager role on leads', async () => {
      mockReq.user = { id: 'user-123', email: 'test@test.com', role: 'manager' };

      (prisma.lead.findUnique as jest.Mock).mockResolvedValue({
        createdByUserId: 'user-123',
        assignedToUserId: null,
      });

      const middleware = verifyOwnership({ resourceType: 'lead' });
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 'resource-123' },
        select: { createdByUserId: true, assignedToUserId: true },
      });
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow manager access if assigned to lead', async () => {
      mockReq.user = { id: 'user-123', email: 'test@test.com', role: 'manager' };

      (prisma.lead.findUnique as jest.Mock).mockResolvedValue({
        createdByUserId: 'other-user',
        assignedToUserId: 'user-123',
      });

      const middleware = verifyOwnership({ resourceType: 'lead' });
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access if manager does not own lead', async () => {
      mockReq.user = { id: 'user-123', email: 'test@test.com', role: 'manager' };

      (prisma.lead.findUnique as jest.Mock).mockResolvedValue({
        createdByUserId: 'other-user',
        assignedToUserId: 'another-user',
      });

      const middleware = verifyOwnership({ resourceType: 'lead' });
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('should deny access for cleaner role', async () => {
      mockReq.user = { id: 'user-123', email: 'test@test.com', role: 'cleaner' };

      const middleware = verifyOwnership({ resourceType: 'lead' });
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('should deny access if no user is authenticated', async () => {
      mockReq.user = undefined;

      const middleware = verifyOwnership({ resourceType: 'lead' });
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('should use custom param name', async () => {
      mockReq.user = { id: 'user-123', email: 'test@test.com', role: 'manager' };
      mockReq.params = { leadId: 'lead-456' };

      (prisma.lead.findUnique as jest.Mock).mockResolvedValue({
        createdByUserId: 'user-123',
        assignedToUserId: null,
      });

      const middleware = verifyOwnership({ resourceType: 'lead', paramName: 'leadId' });
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 'lead-456' },
        select: { createdByUserId: true, assignedToUserId: true },
      });
    });

    it('should check ownership for account resource', async () => {
      mockReq.user = { id: 'user-123', email: 'test@test.com', role: 'manager' };

      (prisma.account.findUnique as jest.Mock).mockResolvedValue({
        createdByUserId: 'user-123',
        accountManagerId: null,
      });

      const middleware = verifyOwnership({ resourceType: 'account' });
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.account.findUnique).toHaveBeenCalledWith({
        where: { id: 'resource-123' },
        select: { createdByUserId: true, accountManagerId: true },
      });
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should check ownership for facility with account manager cascade', async () => {
      mockReq.user = { id: 'user-123', email: 'test@test.com', role: 'manager' };

      (prisma.facility.findUnique as jest.Mock).mockResolvedValue({
        createdByUserId: 'other-user',
        facilityManagerId: null,
        account: { accountManagerId: 'user-123' },
      });

      const middleware = verifyOwnership({ resourceType: 'facility' });
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access if resource not found', async () => {
      mockReq.user = { id: 'user-123', email: 'test@test.com', role: 'manager' };

      (prisma.lead.findUnique as jest.Mock).mockResolvedValue(null);

      const middleware = verifyOwnership({ resourceType: 'lead' });
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });
});
