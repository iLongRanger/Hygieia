import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as contractService from '../../services/contractService';

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

jest.mock('../../services/contractService');

jest.mock('../../services/contractActivityService', () => ({
  logContractActivity: jest.fn().mockResolvedValue({}),
  getContractActivities: jest.fn().mockResolvedValue({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
}));

jest.mock('../../services/pdfService', () => ({
  generateContractPdf: jest.fn().mockResolvedValue(Buffer.from('fake-pdf')),
}));

jest.mock('../../services/emailService', () => ({
  sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/globalSettingsService', () => ({
  getGlobalSettings: jest.fn().mockResolvedValue({}),
  getDefaultBranding: jest.fn().mockReturnValue({}),
}));

jest.mock('../../templates/contractActivated', () => ({
  buildContractActivatedHtmlWithBranding: jest.fn().mockReturnValue('<html></html>'),
  buildContractActivatedSubject: jest.fn().mockReturnValue('Subject'),
}));

jest.mock('../../templates/contractTerminated', () => ({
  buildContractTerminatedHtmlWithBranding: jest.fn().mockReturnValue('<html></html>'),
  buildContractTerminatedSubject: jest.fn().mockReturnValue('Subject'),
}));

jest.mock('../../lib/prisma', () => ({
  prisma: {
    contract: { findUnique: jest.fn().mockResolvedValue(null) },
    notification: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
    userRole: { findMany: jest.fn().mockResolvedValue([]) },
  },
}));

jest.mock('../../lib/logger', () => {
  const logger = { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: logger };
});

describe('Contract Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = createTestApp();
    const routes = (await import('../contracts')).default;
    setupTestRoutes(app, routes, '/api/v1/contracts');
  });

  it('GET / should list contracts', async () => {
    (contractService.listContracts as jest.Mock).mockResolvedValue({
      data: [{ id: 'contract-1' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const response = await request(app)
      .get('/api/v1/contracts')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(contractService.listContracts).toHaveBeenCalled();
  });

  it('GET / should return 422 for invalid query', async () => {
    await request(app)
      .get('/api/v1/contracts?limit=0')
      .expect(422);
  });

  it('GET /:id should return contract', async () => {
    (contractService.getContractById as jest.Mock).mockResolvedValue({ id: 'contract-1' });

    const response = await request(app)
      .get('/api/v1/contracts/contract-1')
      .expect(200);

    expect(response.body.data.id).toBe('contract-1');
  });

  it('GET /:id should return 404 when not found', async () => {
    (contractService.getContractById as jest.Mock).mockResolvedValue(null);

    await request(app)
      .get('/api/v1/contracts/missing')
      .expect(404);
  });

  it('POST / should create contract', async () => {
    (contractService.createContract as jest.Mock).mockResolvedValue({ id: 'contract-1' });

    const response = await request(app)
      .post('/api/v1/contracts')
      .send({
        title: 'New Contract',
        accountId: '11111111-1111-1111-1111-111111111111',
        startDate: '2026-01-01',
        monthlyValue: 1000,
      })
      .expect(201);

    expect(response.body.data.id).toBe('contract-1');
    expect(contractService.createContract).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Contract',
        accountId: '11111111-1111-1111-1111-111111111111',
        createdByUserId: 'user-1',
      })
    );
  });

  it('POST / should return 422 for invalid payload', async () => {
    await request(app)
      .post('/api/v1/contracts')
      .send({ title: 'Missing required fields' })
      .expect(422);
  });

  it('POST /from-proposal/:proposalId should create from proposal', async () => {
    (contractService.createContractFromProposal as jest.Mock).mockResolvedValue({ id: 'contract-1' });

    const response = await request(app)
      .post('/api/v1/contracts/from-proposal/11111111-1111-1111-1111-111111111111')
      .send({ title: 'From Proposal' })
      .expect(201);

    expect(response.body.data.id).toBe('contract-1');
    expect(contractService.createContractFromProposal).toHaveBeenCalled();
  });

  it('PATCH /:id should update contract', async () => {
    (contractService.getContractById as jest.Mock).mockResolvedValue({ id: 'contract-1', status: 'draft' });
    (contractService.updateContract as jest.Mock).mockResolvedValue({ id: 'contract-1' });

    const response = await request(app)
      .patch('/api/v1/contracts/contract-1')
      .send({ title: 'Updated' })
      .expect(200);

    expect(response.body.data.id).toBe('contract-1');
  });

  it('PATCH /:id should return 422 when status locked for edits', async () => {
    (contractService.getContractById as jest.Mock).mockResolvedValue({ id: 'contract-1', status: 'active' });

    await request(app)
      .patch('/api/v1/contracts/contract-1')
      .send({ title: 'Updated' })
      .expect(422);
  });

  it('PATCH /:id/status should update status', async () => {
    (contractService.updateContractStatus as jest.Mock).mockResolvedValue({ id: 'contract-1' });

    const response = await request(app)
      .patch('/api/v1/contracts/contract-1/status')
      .send({ status: 'active' });

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe('contract-1');
  });

  it('PATCH /:id/team should assign team', async () => {
    (contractService.assignContractTeam as jest.Mock).mockResolvedValue({ id: 'contract-1' });

    const response = await request(app)
      .patch('/api/v1/contracts/contract-1/team')
      .send({ teamId: '11111111-1111-1111-1111-111111111111' })
      .expect(200);

    expect(response.body.data.id).toBe('contract-1');
    expect(contractService.assignContractTeam).toHaveBeenCalledWith(
      'contract-1',
      '11111111-1111-1111-1111-111111111111'
    );
  });

  it('POST /:id/sign should sign contract', async () => {
    (contractService.signContract as jest.Mock).mockResolvedValue({ id: 'contract-1' });

    const response = await request(app)
      .post('/api/v1/contracts/contract-1/sign')
      .send({
        signedDate: '2026-01-01',
        signedByName: 'Signer',
        signedByEmail: 'signer@example.com',
      })
      .expect(200);

    expect(response.body.data.id).toBe('contract-1');
  });

  it('POST /:id/terminate should terminate contract', async () => {
    (contractService.terminateContract as jest.Mock).mockResolvedValue({ id: 'contract-1' });

    const response = await request(app)
      .post('/api/v1/contracts/contract-1/terminate')
      .send({ terminationReason: 'Breach' })
      .expect(200);

    expect(response.body.data.id).toBe('contract-1');
  });

  it('DELETE /:id should archive contract', async () => {
    (contractService.archiveContract as jest.Mock).mockResolvedValue({ id: 'contract-1' });

    const response = await request(app)
      .delete('/api/v1/contracts/contract-1')
      .expect(200);

    expect(response.body.data.id).toBe('contract-1');
  });

  it('POST /:id/restore should restore contract', async () => {
    (contractService.restoreContract as jest.Mock).mockResolvedValue({ id: 'contract-1' });

    const response = await request(app)
      .post('/api/v1/contracts/contract-1/restore')
      .expect(200);

    expect(response.body.data.id).toBe('contract-1');
  });

  it('GET /:id/can-renew should return renewal eligibility', async () => {
    (contractService.canRenewContract as jest.Mock).mockResolvedValue({ canRenew: true });

    const response = await request(app)
      .get('/api/v1/contracts/contract-1/can-renew')
      .expect(200);

    expect(response.body.data.canRenew).toBe(true);
  });

  it('POST /:id/renew should renew contract when eligible', async () => {
    (contractService.canRenewContract as jest.Mock).mockResolvedValue({ canRenew: true });
    (contractService.renewContract as jest.Mock).mockResolvedValue({ id: 'contract-1' });

    const response = await request(app)
      .post('/api/v1/contracts/contract-1/renew')
      .send({ startDate: '2026-02-01' })
      .expect(201);

    expect(response.body.data.id).toBe('contract-1');
  });

  it('POST /:id/renew should return 400 when not eligible', async () => {
    (contractService.canRenewContract as jest.Mock).mockResolvedValue({ canRenew: false, reason: 'Too early' });

    await request(app)
      .post('/api/v1/contracts/contract-1/renew')
      .send({ startDate: '2026-02-01' })
      .expect(400);
  });

  it('POST /standalone should create standalone contract', async () => {
    (contractService.createStandaloneContract as jest.Mock).mockResolvedValue({ id: 'contract-1' });

    const response = await request(app)
      .post('/api/v1/contracts/standalone')
      .send({
        title: 'Standalone',
        contractSource: 'imported',
        accountId: '11111111-1111-1111-1111-111111111111',
        startDate: '2026-01-01',
        monthlyValue: 1000,
      })
      .expect(201);

    expect(response.body.data.id).toBe('contract-1');
  });

  it('POST /:id/complete-initial-clean should mark initial clean', async () => {
    (contractService.completeInitialClean as jest.Mock).mockResolvedValue({ id: 'contract-1' });

    const response = await request(app)
      .post('/api/v1/contracts/contract-1/complete-initial-clean')
      .expect(200);

    expect(response.body.data.id).toBe('contract-1');
  });
});
