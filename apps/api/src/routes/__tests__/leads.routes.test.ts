import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as leadService from '../../services/leadService';

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', role: 'owner' };
    next();
  },
}));

jest.mock('../../middleware/rbac', () => ({
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../middleware/ownership', () => ({
  verifyOwnership: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../services/leadService');

describe('Lead Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = createTestApp();
    const routes = (await import('../leads')).default;
    setupTestRoutes(app, routes, '/api/v1/leads');
  });

  it('GET / should list leads', async () => {
    (leadService.listLeads as jest.Mock).mockResolvedValue({
      data: [{ id: 'lead-1' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const response = await request(app)
      .get('/api/v1/leads')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(leadService.listLeads).toHaveBeenCalled();
  });

  it('GET / should return 422 for invalid query', async () => {
    await request(app)
      .get('/api/v1/leads?limit=0')
      .expect(422);
  });

  it('GET /:id should return 404 when not found', async () => {
    (leadService.getLeadById as jest.Mock).mockResolvedValue(null);

    await request(app)
      .get('/api/v1/leads/missing')
      .expect(404);
  });

  it('POST / should create lead', async () => {
    (leadService.createLead as jest.Mock).mockResolvedValue({ id: 'lead-1' });

    const response = await request(app)
      .post('/api/v1/leads')
      .send({ contactName: 'Jane Doe' })
      .expect(201);

    expect(response.body.data.id).toBe('lead-1');
    expect(leadService.createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        contactName: 'Jane Doe',
        createdByUserId: 'user-1',
      })
    );
  });

  it('PATCH /:id should update lead', async () => {
    (leadService.getLeadById as jest.Mock).mockResolvedValue({ id: 'lead-1' });
    (leadService.updateLead as jest.Mock).mockResolvedValue({ id: 'lead-1' });

    const response = await request(app)
      .patch('/api/v1/leads/lead-1')
      .send({ notes: 'Updated' })
      .expect(200);

    expect(response.body.data.id).toBe('lead-1');
  });

  it('POST /:id/archive should archive lead', async () => {
    (leadService.getLeadById as jest.Mock).mockResolvedValue({ id: 'lead-1' });
    (leadService.archiveLead as jest.Mock).mockResolvedValue({ id: 'lead-1' });

    const response = await request(app)
      .post('/api/v1/leads/lead-1/archive')
      .expect(200);

    expect(response.body.data.id).toBe('lead-1');
  });

  it('POST /:id/restore should restore lead', async () => {
    (leadService.getLeadById as jest.Mock).mockResolvedValue({ id: 'lead-1' });
    (leadService.restoreLead as jest.Mock).mockResolvedValue({ id: 'lead-1' });

    const response = await request(app)
      .post('/api/v1/leads/lead-1/restore')
      .expect(200);

    expect(response.body.data.id).toBe('lead-1');
  });

  it('DELETE /:id should delete lead', async () => {
    (leadService.getLeadById as jest.Mock).mockResolvedValue({ id: 'lead-1' });
    (leadService.deleteLead as jest.Mock).mockResolvedValue({ id: 'lead-1' });

    await request(app)
      .delete('/api/v1/leads/lead-1')
      .expect(204);
  });

  it('GET /:id/can-convert should return conversion status', async () => {
    (leadService.canConvertLead as jest.Mock).mockResolvedValue({ canConvert: true });

    const response = await request(app)
      .get('/api/v1/leads/lead-1/can-convert')
      .expect(200);

    expect(response.body.data.canConvert).toBe(true);
  });

  it('POST /:id/convert should convert lead', async () => {
    (leadService.canConvertLead as jest.Mock).mockResolvedValue({ canConvert: true });
    (leadService.convertLead as jest.Mock).mockResolvedValue({ accountId: 'account-1' });

    const response = await request(app)
      .post('/api/v1/leads/lead-1/convert')
      .send({
        createNewAccount: true,
        accountData: {
          name: 'Acme Corp',
          type: 'commercial',
        },
        facilityOption: 'none',
      })
      .expect(201);

    expect(response.body.data.accountId).toBe('account-1');
    expect(leadService.convertLead).toHaveBeenCalledWith(
      'lead-1',
      expect.objectContaining({
        userId: 'user-1',
      })
    );
  });
});
