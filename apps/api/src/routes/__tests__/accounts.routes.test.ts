import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as accountService from '../../services/accountService';
import * as accountActivityService from '../../services/accountActivityService';

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', role: 'owner' };
    next();
  },
}));

jest.mock('../../middleware/rbac', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../middleware/ownership', () => ({
  verifyOwnership: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../services/accountService');
jest.mock('../../services/accountActivityService');

describe('Account Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = createTestApp();
    const routes = (await import('../accounts')).default;
    setupTestRoutes(app, routes, '/api/v1/accounts');
  });

  it('GET / should list accounts', async () => {
    (accountService.listAccounts as jest.Mock).mockResolvedValue({
      data: [{ id: 'account-1' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const response = await request(app)
      .get('/api/v1/accounts')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(accountService.listAccounts).toHaveBeenCalled();
  });

  it('GET / should return 422 for invalid query', async () => {
    await request(app)
      .get('/api/v1/accounts?limit=0')
      .expect(422);
  });

  it('GET /:id should return 404 when not found', async () => {
    (accountService.getAccountById as jest.Mock).mockResolvedValue(null);

    await request(app)
      .get('/api/v1/accounts/missing')
      .expect(404);
  });

  it('GET /:id/activities should return account activity history', async () => {
    (accountService.getAccountById as jest.Mock).mockResolvedValue({ id: 'account-1' });
    (accountActivityService.listAccountActivities as jest.Mock).mockResolvedValue({
      data: [{ id: 'activity-1', entryType: 'complaint', note: 'Client called with issue.' }],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
    });

    const response = await request(app)
      .get('/api/v1/accounts/account-1/activities')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].entryType).toBe('complaint');
  });

  it('POST /:id/activities should create an account activity note', async () => {
    (accountService.getAccountById as jest.Mock).mockResolvedValue({ id: 'account-1' });
    (accountActivityService.createAccountActivity as jest.Mock).mockResolvedValue({
      id: 'activity-1',
      entryType: 'request',
      note: 'Requested schedule change.',
    });

    const response = await request(app)
      .post('/api/v1/accounts/account-1/activities')
      .send({ entryType: 'request', note: 'Requested schedule change.' })
      .expect(201);

    expect(response.body.data.id).toBe('activity-1');
    expect(accountActivityService.createAccountActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'account-1',
        entryType: 'request',
        note: 'Requested schedule change.',
        performedByUserId: 'user-1',
      })
    );
  });

  it('POST / should create account', async () => {
    (accountService.getAccountByName as jest.Mock).mockResolvedValue(null);
    (accountService.createAccount as jest.Mock).mockResolvedValue({ id: 'account-1' });

    const response = await request(app)
      .post('/api/v1/accounts')
      .send({ name: 'Acme Corp', type: 'commercial' })
      .expect(201);

    expect(response.body.data.id).toBe('account-1');
    expect(accountService.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Acme Corp',
        type: 'commercial',
        createdByUserId: 'user-1',
      })
    );
  });

  it('POST / should return 409 for duplicate name', async () => {
    (accountService.getAccountByName as jest.Mock).mockResolvedValue({ id: 'account-dup' });

    await request(app)
      .post('/api/v1/accounts')
      .send({ name: 'Duplicate', type: 'commercial' })
      .expect(409);
  });

  it('PATCH /:id should update account', async () => {
    (accountService.getAccountById as jest.Mock).mockResolvedValue({ id: 'account-1', name: 'Old' });
    (accountService.updateAccount as jest.Mock).mockResolvedValue({ id: 'account-1' });

    const response = await request(app)
      .patch('/api/v1/accounts/account-1')
      .send({ name: 'Updated' })
      .expect(200);

    expect(response.body.data.id).toBe('account-1');
  });

  it('PATCH /:id should return 409 for duplicate name', async () => {
    (accountService.getAccountById as jest.Mock).mockResolvedValue({ id: 'account-1', name: 'Old' });
    (accountService.getAccountByName as jest.Mock).mockResolvedValue({ id: 'account-dup' });

    await request(app)
      .patch('/api/v1/accounts/account-1')
      .send({ name: 'Duplicate' })
      .expect(409);
  });

  it('POST /:id/archive should archive account', async () => {
    (accountService.getAccountById as jest.Mock).mockResolvedValue({ id: 'account-1' });
    (accountService.archiveAccount as jest.Mock).mockResolvedValue({ id: 'account-1' });

    const response = await request(app)
      .post('/api/v1/accounts/account-1/archive')
      .expect(200);

    expect(response.body.data.id).toBe('account-1');
  });

  it('POST /:id/restore should restore account', async () => {
    (accountService.getAccountById as jest.Mock).mockResolvedValue({ id: 'account-1' });
    (accountService.restoreAccount as jest.Mock).mockResolvedValue({ id: 'account-1' });

    const response = await request(app)
      .post('/api/v1/accounts/account-1/restore')
      .expect(200);

    expect(response.body.data.id).toBe('account-1');
  });

  it('DELETE /:id should delete account', async () => {
    (accountService.getAccountById as jest.Mock).mockResolvedValue({ id: 'account-1' });
    (accountService.deleteAccount as jest.Mock).mockResolvedValue({ id: 'account-1' });

    await request(app)
      .delete('/api/v1/accounts/account-1')
      .expect(204);
  });
});
