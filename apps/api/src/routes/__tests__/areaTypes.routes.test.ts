import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as areaTypeService from '../../services/areaTypeService';

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', role: 'owner' };
    next();
  },
}));

jest.mock('../../middleware/rbac', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../services/areaTypeService');

describe('Area Type Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = createTestApp();
    const routes = (await import('../areaTypes')).default;
    setupTestRoutes(app, routes, '/api/v1/area-types');
  });

  it('GET / should list area types', async () => {
    (areaTypeService.listAreaTypes as jest.Mock).mockResolvedValue({
      data: [{ id: 'area-type-1' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const response = await request(app)
      .get('/api/v1/area-types')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(areaTypeService.listAreaTypes).toHaveBeenCalled();
  });

  it('GET / should return 422 for invalid query', async () => {
    await request(app)
      .get('/api/v1/area-types?limit=0')
      .expect(422);
  });

  it('GET /:id should return 404 when not found', async () => {
    (areaTypeService.getAreaTypeById as jest.Mock).mockResolvedValue(null);

    await request(app)
      .get('/api/v1/area-types/missing')
      .expect(404);
  });

  it('POST / should create area type', async () => {
    (areaTypeService.getAreaTypeByName as jest.Mock).mockResolvedValue(null);
    (areaTypeService.createAreaType as jest.Mock).mockResolvedValue({ id: 'area-type-1' });

    const response = await request(app)
      .post('/api/v1/area-types')
      .send({ name: 'Office' })
      .expect(201);

    expect(response.body.data.id).toBe('area-type-1');
  });

  it('POST / should return 409 for duplicate name', async () => {
    (areaTypeService.getAreaTypeByName as jest.Mock).mockResolvedValue({ id: 'area-type-dup' });

    await request(app)
      .post('/api/v1/area-types')
      .send({ name: 'Office' })
      .expect(409);
  });

  it('PATCH /:id should update area type', async () => {
    (areaTypeService.getAreaTypeById as jest.Mock).mockResolvedValue({ id: 'area-type-1', name: 'Old' });
    (areaTypeService.updateAreaType as jest.Mock).mockResolvedValue({ id: 'area-type-1' });

    const response = await request(app)
      .patch('/api/v1/area-types/area-type-1')
      .send({ name: 'Updated' })
      .expect(200);

    expect(response.body.data.id).toBe('area-type-1');
  });

  it('PATCH /:id should return 409 for duplicate name', async () => {
    (areaTypeService.getAreaTypeById as jest.Mock).mockResolvedValue({ id: 'area-type-1', name: 'Old' });
    (areaTypeService.getAreaTypeByName as jest.Mock).mockResolvedValue({ id: 'area-type-dup' });

    await request(app)
      .patch('/api/v1/area-types/area-type-1')
      .send({ name: 'Office' })
      .expect(409);
  });

  it('DELETE /:id should delete area type', async () => {
    (areaTypeService.getAreaTypeById as jest.Mock).mockResolvedValue({ id: 'area-type-1' });
    (areaTypeService.deleteAreaType as jest.Mock).mockResolvedValue({ id: 'area-type-1' });

    await request(app)
      .delete('/api/v1/area-types/area-type-1')
      .expect(204);
  });
});
