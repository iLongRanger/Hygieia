import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as facilityTaskService from '../../services/facilityTaskService';

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', role: 'owner' };
    next();
  },
}));

jest.mock('../../middleware/rbac', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../services/facilityTaskService');

describe('Facility Task Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = createTestApp();
    const routes = (await import('../facilityTasks')).default;
    setupTestRoutes(app, routes, '/api/v1/facility-tasks');
  });

  it('GET / should list facility tasks', async () => {
    (facilityTaskService.listFacilityTasks as jest.Mock).mockResolvedValue({
      data: [{ id: 'task-1' }],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
    });

    const response = await request(app)
      .get('/api/v1/facility-tasks')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(facilityTaskService.listFacilityTasks).toHaveBeenCalled();
  });

  it('GET / should return 422 for invalid query', async () => {
    await request(app)
      .get('/api/v1/facility-tasks?limit=0')
      .expect(422);
  });

  it('GET /:id should return task', async () => {
    (facilityTaskService.getFacilityTaskById as jest.Mock).mockResolvedValue({ id: 'task-1' });

    const response = await request(app)
      .get('/api/v1/facility-tasks/task-1')
      .expect(200);

    expect(response.body.data.id).toBe('task-1');
  });

  it('GET /:id should return 404 when not found', async () => {
    (facilityTaskService.getFacilityTaskById as jest.Mock).mockResolvedValue(null);

    await request(app)
      .get('/api/v1/facility-tasks/missing')
      .expect(404);
  });

  it('POST / should create task', async () => {
    (facilityTaskService.createFacilityTask as jest.Mock).mockResolvedValue({ id: 'task-1' });

    const response = await request(app)
      .post('/api/v1/facility-tasks')
      .send({
        facilityId: '11111111-1111-1111-1111-111111111111',
        taskTemplateId: '22222222-2222-2222-2222-222222222222',
        cleaningFrequency: 'daily',
      })
      .expect(201);

    expect(response.body.data.id).toBe('task-1');
    expect(facilityTaskService.createFacilityTask).toHaveBeenCalledWith(
      expect.objectContaining({
        facilityId: '11111111-1111-1111-1111-111111111111',
        taskTemplateId: '22222222-2222-2222-2222-222222222222',
        createdByUserId: 'user-1',
      })
    );
  });

  it('POST / should return 422 for missing taskTemplateId/customName', async () => {
    await request(app)
      .post('/api/v1/facility-tasks')
      .send({
        facilityId: '11111111-1111-1111-1111-111111111111',
      })
      .expect(422);
  });

  it('POST /bulk should create tasks from templates', async () => {
    (facilityTaskService.bulkCreateFacilityTasks as jest.Mock).mockResolvedValue({ count: 2 });

    const response = await request(app)
      .post('/api/v1/facility-tasks/bulk')
      .send({
        facilityId: '11111111-1111-1111-1111-111111111111',
        taskTemplateIds: [
          '22222222-2222-2222-2222-222222222222',
          '33333333-3333-3333-3333-333333333333',
        ],
        cleaningFrequency: 'weekly',
      })
      .expect(201);

    expect(response.body.data.count).toBe(2);
    expect(facilityTaskService.bulkCreateFacilityTasks).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      ['22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333'],
      'user-1',
      undefined,
      'weekly'
    );
  });

  it('POST /bulk should return 422 for empty taskTemplateIds', async () => {
    await request(app)
      .post('/api/v1/facility-tasks/bulk')
      .send({
        facilityId: '11111111-1111-1111-1111-111111111111',
        taskTemplateIds: [],
      })
      .expect(422);
  });

  it('PATCH /:id should update task', async () => {
    (facilityTaskService.getFacilityTaskById as jest.Mock).mockResolvedValue({ id: 'task-1' });
    (facilityTaskService.updateFacilityTask as jest.Mock).mockResolvedValue({ id: 'task-1' });

    const response = await request(app)
      .patch('/api/v1/facility-tasks/task-1')
      .send({ customName: 'Updated' })
      .expect(200);

    expect(response.body.data.id).toBe('task-1');
  });

  it('PATCH /:id should return 404 when not found', async () => {
    (facilityTaskService.getFacilityTaskById as jest.Mock).mockResolvedValue(null);

    await request(app)
      .patch('/api/v1/facility-tasks/missing')
      .send({ customName: 'Updated' })
      .expect(404);
  });

  it('POST /:id/archive should archive task', async () => {
    (facilityTaskService.getFacilityTaskById as jest.Mock).mockResolvedValue({ id: 'task-1' });
    (facilityTaskService.archiveFacilityTask as jest.Mock).mockResolvedValue({ id: 'task-1' });

    const response = await request(app)
      .post('/api/v1/facility-tasks/task-1/archive')
      .expect(200);

    expect(response.body.data.id).toBe('task-1');
  });

  it('POST /:id/restore should restore task', async () => {
    (facilityTaskService.getFacilityTaskById as jest.Mock).mockResolvedValue({ id: 'task-1' });
    (facilityTaskService.restoreFacilityTask as jest.Mock).mockResolvedValue({ id: 'task-1' });

    const response = await request(app)
      .post('/api/v1/facility-tasks/task-1/restore')
      .expect(200);

    expect(response.body.data.id).toBe('task-1');
  });

  it('DELETE /:id should delete task', async () => {
    (facilityTaskService.getFacilityTaskById as jest.Mock).mockResolvedValue({ id: 'task-1' });
    (facilityTaskService.deleteFacilityTask as jest.Mock).mockResolvedValue({ id: 'task-1' });

    await request(app)
      .delete('/api/v1/facility-tasks/task-1')
      .expect(204);

    expect(facilityTaskService.deleteFacilityTask).toHaveBeenCalledWith('task-1');
  });
});
