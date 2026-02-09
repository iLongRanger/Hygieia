import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as proposalTemplateService from '../../services/proposalTemplateService';

let mockUser: { id: string; role: string } | null = { id: 'user-1', role: 'owner' };

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    if (!mockUser) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    req.user = mockUser;
    next();
  },
}));

jest.mock('../../middleware/rbac', () => ({
  requirePermission:
    (permission: string) =>
    (req: any, res: any, next: any) => {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      const rolePermissions: Record<string, string[]> = {
        owner: ['all', 'proposal_templates_delete'],
        admin: [
          'proposal_templates_read',
          'proposal_templates_write',
          'proposal_templates_admin',
        ],
        manager: ['proposal_templates_read', 'proposal_templates_write'],
        cleaner: [],
      };
      const permissions = rolePermissions[req.user.role] ?? [];

      if (!permissions.includes('all') && !permissions.includes(permission)) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions',
          },
        });
        return;
      }

      next();
    },
}));

jest.mock('../../services/proposalTemplateService');

describe('Proposal Template Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockUser = { id: 'user-1', role: 'owner' };
    app = createTestApp();
    const routes = (await import('../proposalTemplates')).default;
    setupTestRoutes(app, routes, '/api/v1/proposal-templates');
  });

  it('GET / should list templates', async () => {
    (proposalTemplateService.listTemplates as jest.Mock).mockResolvedValue([
      { id: 'template-1', name: 'Default Terms' },
    ]);

    const response = await request(app).get('/api/v1/proposal-templates').expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(proposalTemplateService.listTemplates).toHaveBeenCalledWith(undefined);
  });

  it('GET /default should return default template', async () => {
    (proposalTemplateService.getDefaultTemplate as jest.Mock).mockResolvedValue({
      id: 'template-default',
      name: 'Default Terms',
    });

    const response = await request(app).get('/api/v1/proposal-templates/default').expect(200);
    expect(response.body.data.id).toBe('template-default');
  });

  it('GET /:id should return 404 when template not found', async () => {
    (proposalTemplateService.getTemplateById as jest.Mock).mockResolvedValue(null);
    await request(app).get('/api/v1/proposal-templates/missing').expect(404);
  });

  it('POST / should create template', async () => {
    (proposalTemplateService.createTemplate as jest.Mock).mockResolvedValue({
      id: 'template-1',
      name: 'Custom Terms',
    });

    const response = await request(app)
      .post('/api/v1/proposal-templates')
      .send({
        name: 'Custom Terms',
        termsAndConditions: 'Payment due in 30 days.',
        isDefault: true,
      })
      .expect(201);

    expect(response.body.data.id).toBe('template-1');
    expect(proposalTemplateService.createTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Custom Terms',
        termsAndConditions: 'Payment due in 30 days.',
        isDefault: true,
        createdByUserId: 'user-1',
      })
    );
  });

  it('POST / should return 422 for invalid payload', async () => {
    await request(app)
      .post('/api/v1/proposal-templates')
      .send({ name: '' })
      .expect(422);
  });

  it('PATCH /:id should update template', async () => {
    (proposalTemplateService.getTemplateById as jest.Mock).mockResolvedValue({ id: 'template-1' });
    (proposalTemplateService.updateTemplate as jest.Mock).mockResolvedValue({
      id: 'template-1',
      name: 'Updated Terms',
    });

    const response = await request(app)
      .patch('/api/v1/proposal-templates/template-1')
      .send({ name: 'Updated Terms' })
      .expect(200);

    expect(response.body.data.name).toBe('Updated Terms');
  });

  it('PATCH /:id should return 422 for invalid payload', async () => {
    (proposalTemplateService.getTemplateById as jest.Mock).mockResolvedValue({ id: 'template-1' });
    await request(app)
      .patch('/api/v1/proposal-templates/template-1')
      .send({ name: '' })
      .expect(422);
  });

  it('POST /:id/archive should archive template', async () => {
    (proposalTemplateService.getTemplateById as jest.Mock).mockResolvedValue({ id: 'template-1' });
    (proposalTemplateService.archiveTemplate as jest.Mock).mockResolvedValue({ id: 'template-1' });

    const response = await request(app)
      .post('/api/v1/proposal-templates/template-1/archive')
      .expect(200);

    expect(response.body.data.id).toBe('template-1');
  });

  it('POST /:id/restore should restore template', async () => {
    (proposalTemplateService.getTemplateById as jest.Mock).mockResolvedValue({ id: 'template-1' });
    (proposalTemplateService.restoreTemplate as jest.Mock).mockResolvedValue({ id: 'template-1' });

    const response = await request(app)
      .post('/api/v1/proposal-templates/template-1/restore')
      .expect(200);

    expect(response.body.data.id).toBe('template-1');
  });

  it('DELETE /:id should delete template', async () => {
    (proposalTemplateService.getTemplateById as jest.Mock).mockResolvedValue({ id: 'template-1' });
    (proposalTemplateService.deleteTemplate as jest.Mock).mockResolvedValue({ id: 'template-1' });

    await request(app).delete('/api/v1/proposal-templates/template-1').expect(204);
  });
});
