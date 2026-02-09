import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { requirePermission, requireRole, requireRoleAtLeast } from '../rbac';

describe('rbac middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn().mockReturnThis();
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    mockNext = jest.fn();
    mockReq = {
      path: '/test',
    };
  });

  it('requirePermission should return 401 when unauthenticated', () => {
    const middleware = requirePermission('proposals_read');
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'UNAUTHORIZED',
        }),
      })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('requirePermission should return 403 when permission is missing', () => {
    mockReq.user = { id: 'u-1', email: 'manager@test.com', role: 'manager' };

    const middleware = requirePermission('users_write');
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'INSUFFICIENT_SCOPE',
        }),
      })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('requirePermission should call next when permission exists', () => {
    mockReq.user = { id: 'u-1', email: 'admin@test.com', role: 'admin' };

    const middleware = requirePermission('users_write');
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('requireRole should return 401 when unauthenticated', () => {
    const middleware = requireRole('owner', 'admin');
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('requireRole should return 403 when role is not allowed', () => {
    mockReq.user = { id: 'u-1', email: 'manager@test.com', role: 'manager' };

    const middleware = requireRole('owner', 'admin');
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('requireRole should call next when role is allowed', () => {
    mockReq.user = { id: 'u-1', email: 'owner@test.com', role: 'owner' };

    const middleware = requireRole('owner', 'admin');
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('requireRoleAtLeast should return 401 when unauthenticated', () => {
    const middleware = requireRoleAtLeast('manager');
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('requireRoleAtLeast should return 403 when below minimum role', () => {
    mockReq.user = { id: 'u-1', email: 'cleaner@test.com', role: 'cleaner' };

    const middleware = requireRoleAtLeast('manager');
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('requireRoleAtLeast should call next when role meets minimum', () => {
    mockReq.user = { id: 'u-1', email: 'admin@test.com', role: 'admin' };

    const middleware = requireRoleAtLeast('manager');
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect(statusMock).not.toHaveBeenCalled();
  });
});
