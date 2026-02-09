import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as contactService from '../../services/contactService';

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', role: 'owner' };
    next();
  },
}));

jest.mock('../../middleware/rbac', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../services/contactService');

describe('Contact Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = createTestApp();
    const routes = (await import('../contacts')).default;
    setupTestRoutes(app, routes, '/api/v1/contacts');
  });

  it('GET / should list contacts', async () => {
    (contactService.listContacts as jest.Mock).mockResolvedValue({
      data: [{ id: 'contact-1' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const response = await request(app)
      .get('/api/v1/contacts')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(contactService.listContacts).toHaveBeenCalled();
  });

  it('GET / should return 422 for invalid query', async () => {
    await request(app)
      .get('/api/v1/contacts?limit=0')
      .expect(422);
  });

  it('GET /:id should return 404 when not found', async () => {
    (contactService.getContactById as jest.Mock).mockResolvedValue(null);

    await request(app)
      .get('/api/v1/contacts/missing')
      .expect(404);
  });

  it('POST / should create contact', async () => {
    (contactService.createContact as jest.Mock).mockResolvedValue({ id: 'contact-1' });

    const response = await request(app)
      .post('/api/v1/contacts')
      .send({ name: 'Jane Doe' })
      .expect(201);

    expect(response.body.data.id).toBe('contact-1');
    expect(contactService.createContact).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Jane Doe',
        createdByUserId: 'user-1',
      })
    );
  });

  it('PATCH /:id should update contact', async () => {
    (contactService.getContactById as jest.Mock).mockResolvedValue({ id: 'contact-1' });
    (contactService.updateContact as jest.Mock).mockResolvedValue({ id: 'contact-1' });

    const response = await request(app)
      .patch('/api/v1/contacts/contact-1')
      .send({ notes: 'Updated' })
      .expect(200);

    expect(response.body.data.id).toBe('contact-1');
  });

  it('POST /:id/archive should archive contact', async () => {
    (contactService.getContactById as jest.Mock).mockResolvedValue({ id: 'contact-1' });
    (contactService.archiveContact as jest.Mock).mockResolvedValue({ id: 'contact-1' });

    const response = await request(app)
      .post('/api/v1/contacts/contact-1/archive')
      .expect(200);

    expect(response.body.data.id).toBe('contact-1');
  });

  it('POST /:id/restore should restore contact', async () => {
    (contactService.getContactById as jest.Mock).mockResolvedValue({ id: 'contact-1' });
    (contactService.restoreContact as jest.Mock).mockResolvedValue({ id: 'contact-1' });

    const response = await request(app)
      .post('/api/v1/contacts/contact-1/restore')
      .expect(200);

    expect(response.body.data.id).toBe('contact-1');
  });

  it('DELETE /:id should delete contact', async () => {
    (contactService.getContactById as jest.Mock).mockResolvedValue({ id: 'contact-1' });
    (contactService.deleteContact as jest.Mock).mockResolvedValue({ id: 'contact-1' });

    await request(app)
      .delete('/api/v1/contacts/contact-1')
      .expect(204);
  });
});
