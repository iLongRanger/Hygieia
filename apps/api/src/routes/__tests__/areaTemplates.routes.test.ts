import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as areaTemplateService from '../../services/areaTemplateService';

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', role: 'owner' };
    next();
  },
}));

jest.mock('../../middleware/rbac', () => ({
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../services/areaTemplateService');

describe('Area Template Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = createTestApp();
    const routes = (await import('../areaTemplates')).default;
    setupTestRoutes(app, routes, '/api/v1/area-templates');
  });

  it('GET / should list templates', async () => {
    (areaTemplateService.listAreaTemplates as jest.Mock).mockResolvedValue({
      data: [{ id: 'template-1' }],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
    });

    const response = await request(app)
      .get('/api/v1/area-templates')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(areaTemplateService.listAreaTemplates).toHaveBeenCalled();
  });

  it('GET / should return 422 for invalid query', async () => {
    await request(app)
      .get('/api/v1/area-templates?limit=0')
      .expect(422);
  });

  it('GET /:id should return template', async () => {
    (areaTemplateService.getAreaTemplateById as jest.Mock).mockResolvedValue({ id: 'template-1' });

    const response = await request(app)
      .get('/api/v1/area-templates/template-1')
      .expect(200);

    expect(response.body.data.id).toBe('template-1');
  });

  it('GET /:id should return 404 when not found', async () => {
    (areaTemplateService.getAreaTemplateById as jest.Mock).mockResolvedValue(null);

    await request(app)
      .get('/api/v1/area-templates/missing')
      .expect(404);
  });

  it('GET /area-type/:areaTypeId should return template', async () => {
    (areaTemplateService.getAreaTemplateByAreaType as jest.Mock).mockResolvedValue({ id: 'template-1' });

    const response = await request(app)
      .get('/api/v1/area-templates/area-type/area-type-1')
      .expect(200);

    expect(response.body.data.id).toBe('template-1');
  });

  it('POST / should create template', async () => {
    (areaTemplateService.createAreaTemplate as jest.Mock).mockResolvedValue({ id: 'template-1' });

    const response = await request(app)
      .post('/api/v1/area-templates')
      .send({
        areaTypeId: '11111111-1111-1111-1111-111111111111',
        name: 'Office Default',
      })
      .expect(201);

    expect(response.body.data.id).toBe('template-1');
    expect(areaTemplateService.createAreaTemplate).toHaveBeenCalled();
  });

  it('POST / should return 422 for invalid payload', async () => {
    await request(app)
      .post('/api/v1/area-templates')
      .send({ name: 'Missing areaTypeId' })
      .expect(422);
  });

  it('PATCH /:id should update template', async () => {
    (areaTemplateService.getAreaTemplateById as jest.Mock).mockResolvedValue({ id: 'template-1' });
    (areaTemplateService.updateAreaTemplate as jest.Mock).mockResolvedValue({ id: 'template-1' });

    const response = await request(app)
      .patch('/api/v1/area-templates/template-1')
      .send({ name: 'Updated' })
      .expect(200);

    expect(response.body.data.id).toBe('template-1');
  });

  it('PATCH /:id should return 404 when not found', async () => {
    (areaTemplateService.getAreaTemplateById as jest.Mock).mockResolvedValue(null);

    await request(app)
      .patch('/api/v1/area-templates/missing')
      .send({ name: 'Updated' })
      .expect(404);
  });

  it('DELETE /:id should delete template', async () => {
    (areaTemplateService.getAreaTemplateById as jest.Mock).mockResolvedValue({ id: 'template-1' });
    (areaTemplateService.deleteAreaTemplate as jest.Mock).mockResolvedValue({ id: 'template-1' });

    await request(app)
      .delete('/api/v1/area-templates/template-1')
      .expect(204);

    expect(areaTemplateService.deleteAreaTemplate).toHaveBeenCalledWith('template-1');
  });
});
