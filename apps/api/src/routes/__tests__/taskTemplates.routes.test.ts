import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as taskTemplateService from '../../services/taskTemplateService';

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', role: 'owner' };
    next();
  },
}));

jest.mock('../../middleware/rbac', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../services/taskTemplateService');

describe('Task Template Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = createTestApp();
    const routes = (await import('../taskTemplates')).default;
    setupTestRoutes(app, routes, '/api/v1/task-templates');
  });

  it('GET / should list templates', async () => {
    (taskTemplateService.listTaskTemplates as jest.Mock).mockResolvedValue({
      data: [{ id: 'template-1' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const response = await request(app)
      .get('/api/v1/task-templates')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(taskTemplateService.listTaskTemplates).toHaveBeenCalled();
  });

  it('GET / should return 422 for invalid query', async () => {
    await request(app)
      .get('/api/v1/task-templates?limit=0')
      .expect(422);
  });

  it('GET /:id should return template', async () => {
    (taskTemplateService.getTaskTemplateById as jest.Mock).mockResolvedValue({ id: 'template-1' });

    const response = await request(app)
      .get('/api/v1/task-templates/template-1')
      .expect(200);

    expect(response.body.data.id).toBe('template-1');
  });

  it('GET /:id should return 404 when not found', async () => {
    (taskTemplateService.getTaskTemplateById as jest.Mock).mockResolvedValue(null);

    await request(app)
      .get('/api/v1/task-templates/missing')
      .expect(404);
  });

  it('POST / should create template', async () => {
    (taskTemplateService.createTaskTemplate as jest.Mock).mockResolvedValue({ id: 'template-1' });

    const response = await request(app)
      .post('/api/v1/task-templates')
      .send({
        name: 'Vacuum',
        cleaningType: 'daily',
      })
      .expect(201);

    expect(response.body.data.id).toBe('template-1');
    expect(taskTemplateService.createTaskTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Vacuum',
        cleaningType: 'daily',
        createdByUserId: 'user-1',
      })
    );
  });

  it('POST / should return 422 for invalid payload', async () => {
    await request(app)
      .post('/api/v1/task-templates')
      .send({ cleaningType: 'daily' })
      .expect(422);
  });

  it('PATCH /:id should update template', async () => {
    (taskTemplateService.getTaskTemplateById as jest.Mock).mockResolvedValue({ id: 'template-1' });
    (taskTemplateService.updateTaskTemplate as jest.Mock).mockResolvedValue({ id: 'template-1' });

    const response = await request(app)
      .patch('/api/v1/task-templates/template-1')
      .send({ name: 'Updated' })
      .expect(200);

    expect(response.body.data.id).toBe('template-1');
  });

  it('PATCH /:id should return 404 when not found', async () => {
    (taskTemplateService.getTaskTemplateById as jest.Mock).mockResolvedValue(null);

    await request(app)
      .patch('/api/v1/task-templates/missing')
      .send({ name: 'Updated' })
      .expect(404);
  });

  it('POST /:id/archive should archive template', async () => {
    (taskTemplateService.getTaskTemplateById as jest.Mock).mockResolvedValue({ id: 'template-1' });
    (taskTemplateService.archiveTaskTemplate as jest.Mock).mockResolvedValue({ id: 'template-1' });

    const response = await request(app)
      .post('/api/v1/task-templates/template-1/archive')
      .expect(200);

    expect(response.body.data.id).toBe('template-1');
  });

  it('POST /:id/restore should restore template', async () => {
    (taskTemplateService.getTaskTemplateById as jest.Mock).mockResolvedValue({ id: 'template-1' });
    (taskTemplateService.restoreTaskTemplate as jest.Mock).mockResolvedValue({ id: 'template-1' });

    const response = await request(app)
      .post('/api/v1/task-templates/template-1/restore')
      .expect(200);

    expect(response.body.data.id).toBe('template-1');
  });

  it('DELETE /:id should delete template', async () => {
    (taskTemplateService.getTaskTemplateById as jest.Mock).mockResolvedValue({ id: 'template-1' });
    (taskTemplateService.deleteTaskTemplate as jest.Mock).mockResolvedValue({ id: 'template-1' });

    await request(app)
      .delete('/api/v1/task-templates/template-1')
      .expect(204);

    expect(taskTemplateService.deleteTaskTemplate).toHaveBeenCalledWith('template-1');
  });
});
