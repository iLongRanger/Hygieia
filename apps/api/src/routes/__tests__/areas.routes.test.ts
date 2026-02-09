import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as areaService from '../../services/areaService';

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', role: 'owner' };
    next();
  },
}));

jest.mock('../../middleware/rbac', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../services/areaService');

describe('Area Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = createTestApp();
    const routes = (await import('../areas')).default;
    setupTestRoutes(app, routes, '/api/v1/areas');
  });

  it('GET / should list areas', async () => {
    (areaService.listAreas as jest.Mock).mockResolvedValue({
      data: [{ id: 'area-1' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const response = await request(app)
      .get('/api/v1/areas')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(areaService.listAreas).toHaveBeenCalled();
  });

  it('GET / should return 422 for invalid query', async () => {
    await request(app)
      .get('/api/v1/areas?limit=0')
      .expect(422);
  });

  it('GET /:id should return 404 when not found', async () => {
    (areaService.getAreaById as jest.Mock).mockResolvedValue(null);

    await request(app)
      .get('/api/v1/areas/missing')
      .expect(404);
  });

  it('POST / should create area', async () => {
    (areaService.createArea as jest.Mock).mockResolvedValue({ id: 'area-1' });

    const response = await request(app)
      .post('/api/v1/areas')
      .send({
        facilityId: '11111111-1111-1111-1111-111111111111',
        areaTypeId: '22222222-2222-2222-2222-222222222222',
        name: 'Office A',
      })
      .expect(201);

    expect(response.body.data.id).toBe('area-1');
    expect(areaService.createArea).toHaveBeenCalledWith(
      expect.objectContaining({
        facilityId: '11111111-1111-1111-1111-111111111111',
        areaTypeId: '22222222-2222-2222-2222-222222222222',
        createdByUserId: 'user-1',
      })
    );
  });

  it('PATCH /:id should update area', async () => {
    (areaService.getAreaById as jest.Mock).mockResolvedValue({ id: 'area-1' });
    (areaService.updateArea as jest.Mock).mockResolvedValue({ id: 'area-1' });

    const response = await request(app)
      .patch('/api/v1/areas/area-1')
      .send({ name: 'Updated' })
      .expect(200);

    expect(response.body.data.id).toBe('area-1');
  });

  it('POST /:id/archive should archive area', async () => {
    (areaService.getAreaById as jest.Mock).mockResolvedValue({ id: 'area-1' });
    (areaService.archiveArea as jest.Mock).mockResolvedValue({ id: 'area-1' });

    const response = await request(app)
      .post('/api/v1/areas/area-1/archive')
      .expect(200);

    expect(response.body.data.id).toBe('area-1');
  });

  it('POST /:id/restore should restore area', async () => {
    (areaService.getAreaById as jest.Mock).mockResolvedValue({ id: 'area-1' });
    (areaService.restoreArea as jest.Mock).mockResolvedValue({ id: 'area-1' });

    const response = await request(app)
      .post('/api/v1/areas/area-1/restore')
      .expect(200);

    expect(response.body.data.id).toBe('area-1');
  });

  it('DELETE /:id should delete area', async () => {
    (areaService.getAreaById as jest.Mock).mockResolvedValue({ id: 'area-1' });
    (areaService.deleteArea as jest.Mock).mockResolvedValue({ id: 'area-1' });

    await request(app)
      .delete('/api/v1/areas/area-1')
      .expect(204);
  });
});
