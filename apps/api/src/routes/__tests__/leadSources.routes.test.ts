import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as leadSourceService from '../../services/leadSourceService';

jest.mock('../../middleware/auth', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../middleware/rbac', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../services/leadSourceService');

describe('Lead Sources Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = createTestApp();
    const routes = (await import('../leadSources')).default;
    setupTestRoutes(app, routes, '/api/v1/lead-sources');
  });

  it('GET / should list lead sources', async () => {
    (leadSourceService.listLeadSources as jest.Mock).mockResolvedValue([{ id: 'source-1' }]);

    const response = await request(app).get('/api/v1/lead-sources').expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(leadSourceService.listLeadSources).toHaveBeenCalled();
  });

  it('GET / should return 422 for invalid query', async () => {
    await request(app).get('/api/v1/lead-sources?isActive=maybe').expect(422);
  });

  it('GET /:id should return lead source', async () => {
    (leadSourceService.getLeadSourceById as jest.Mock).mockResolvedValue({ id: 'source-1' });

    const response = await request(app).get('/api/v1/lead-sources/source-1').expect(200);

    expect(response.body.data.id).toBe('source-1');
  });

  it('POST / should create lead source', async () => {
    (leadSourceService.getLeadSourceByName as jest.Mock).mockResolvedValue(null);
    (leadSourceService.createLeadSource as jest.Mock).mockResolvedValue({ id: 'source-1' });

    const response = await request(app)
      .post('/api/v1/lead-sources')
      .send({ name: 'Referral', color: '#123456' })
      .expect(201);

    expect(response.body.data.id).toBe('source-1');
    expect(leadSourceService.createLeadSource).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Referral' })
    );
  });

  it('POST / should return 409 for duplicate name', async () => {
    (leadSourceService.getLeadSourceByName as jest.Mock).mockResolvedValue({ id: 'source-1' });

    await request(app)
      .post('/api/v1/lead-sources')
      .send({ name: 'Referral' })
      .expect(409);
  });

  it('PATCH /:id should update lead source', async () => {
    (leadSourceService.getLeadSourceById as jest.Mock).mockResolvedValue({ id: 'source-1', name: 'Referral' });
    (leadSourceService.getLeadSourceByName as jest.Mock).mockResolvedValue(null);
    (leadSourceService.updateLeadSource as jest.Mock).mockResolvedValue({ id: 'source-1', name: 'Web' });

    const response = await request(app)
      .patch('/api/v1/lead-sources/source-1')
      .send({ name: 'Web' })
      .expect(200);

    expect(response.body.data.name).toBe('Web');
  });

  it('DELETE /:id should delete lead source', async () => {
    (leadSourceService.getLeadSourceById as jest.Mock).mockResolvedValue({ id: 'source-1' });
    (leadSourceService.deleteLeadSource as jest.Mock).mockResolvedValue(undefined);

    await request(app).delete('/api/v1/lead-sources/source-1').expect(204);
  });
});
