import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import type { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as inspectionService from '../../services/inspectionService';
import { ensureOwnershipAccess } from '../../middleware/ownership';
import { NotFoundError } from '../../middleware/errorHandler';

let mockUser: { id: string; role: string; teamId?: string | null };

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = mockUser;
    next();
  },
}));

jest.mock('../../middleware/rbac', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
  requireAnyRole: (_req: any, _res: any, next: any) => next(),
  requireManager: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../middleware/ownership', () => ({
  ensureOwnershipAccess: jest.fn(async () => undefined),
  ensureManagerAccountAccess: jest.fn(async () => undefined),
}));

jest.mock('../../services/inspectionService');

describe('Inspections Routes — feedback', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockUser = { id: 'cleaner-1', role: 'cleaner', teamId: null };
    app = createTestApp();
    const routes = (await import('../inspections')).default;
    setupTestRoutes(app, routes, '/api/v1/inspections');
  });

  it('GET /:id/items/:itemId/feedback returns feedback for in-scope inspection', async () => {
    (inspectionService.getInspectionById as jest.Mock).mockResolvedValue({
      id: 'ins-1',
      accountId: 'account-1',
      contractId: 'contract-1',
    });
    (inspectionService.listInspectionItemFeedback as jest.Mock).mockResolvedValue([
      { id: 'fb-1', body: 'note' },
    ]);

    const response = await request(app)
      .get('/api/v1/inspections/ins-1/items/item-1/feedback')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(ensureOwnershipAccess).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'cleaner-1', role: 'cleaner' }),
      expect.objectContaining({ resourceType: 'contract', resourceId: 'contract-1' })
    );
  });

  it('GET /:id/items/:itemId/feedback rejects when inspection has no contractId for cleaner', async () => {
    (inspectionService.getInspectionById as jest.Mock).mockResolvedValue({
      id: 'ins-1',
      accountId: 'account-1',
      contractId: null,
    });

    await request(app)
      .get('/api/v1/inspections/ins-1/items/item-1/feedback')
      .expect(403);

    expect(inspectionService.listInspectionItemFeedback).not.toHaveBeenCalled();
  });

  it('POST /:id/items/:itemId/feedback creates feedback as the authenticated user', async () => {
    (inspectionService.getInspectionById as jest.Mock).mockResolvedValue({
      id: 'ins-1',
      accountId: 'account-1',
      contractId: 'contract-1',
    });
    (inspectionService.createInspectionItemFeedback as jest.Mock).mockResolvedValue({
      id: 'fb-1',
      body: 'mismatched',
    });

    const response = await request(app)
      .post('/api/v1/inspections/ins-1/items/item-1/feedback')
      .send({ body: 'mismatched' })
      .expect(201);

    expect(response.body.data.id).toBe('fb-1');
    expect(inspectionService.createInspectionItemFeedback).toHaveBeenCalledWith(
      'ins-1',
      'item-1',
      { body: 'mismatched', authorUserId: 'cleaner-1' }
    );
  });

  it('POST /:id/items/:itemId/feedback rejects empty body with 422', async () => {
    (inspectionService.getInspectionById as jest.Mock).mockResolvedValue({
      id: 'ins-1',
      accountId: 'account-1',
      contractId: 'contract-1',
    });

    await request(app)
      .post('/api/v1/inspections/ins-1/items/item-1/feedback')
      .send({ body: '' })
      .expect(422);
  });

  it('POST /:id/items/:itemId/feedback surfaces NotFoundError as 404 for cross-inspection itemId', async () => {
    (inspectionService.getInspectionById as jest.Mock).mockResolvedValue({
      id: 'ins-1',
      accountId: 'account-1',
      contractId: 'contract-1',
    });
    (inspectionService.createInspectionItemFeedback as jest.Mock).mockRejectedValue(
      new NotFoundError('Inspection item not found')
    );

    await request(app)
      .post('/api/v1/inspections/ins-1/items/item-other/feedback')
      .send({ body: 'something' })
      .expect(404);
  });
});
