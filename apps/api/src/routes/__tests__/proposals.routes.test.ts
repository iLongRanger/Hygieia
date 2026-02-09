import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as proposalService from '../../services/proposalService';

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', role: 'owner' };
    next();
  },
}));

jest.mock('../../middleware/rbac', () => ({
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../services/proposalService');
jest.mock('../../services/proposalActivityService', () => ({
  logActivity: jest.fn().mockResolvedValue({}),
  getProposalActivities: jest.fn().mockResolvedValue({ data: [], pagination: {} }),
}));
jest.mock('../../services/proposalVersionService', () => ({
  createVersion: jest.fn().mockResolvedValue({ id: 'version-1', versionNumber: 1 }),
  getVersions: jest.fn().mockResolvedValue([]),
  getVersion: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../services/proposalPublicService', () => ({
  generatePublicToken: jest.fn().mockResolvedValue('test-public-token'),
}));
jest.mock('../../services/pdfService', () => ({
  generateProposalPdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
}));
jest.mock('../../services/emailService', () => ({
  sendProposalEmail: jest.fn().mockResolvedValue(true),
  sendNotificationEmail: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../services/globalSettingsService', () => {
  const branding = {
    companyName: 'Test',
    companyEmail: null,
    companyPhone: null,
    companyWebsite: null,
    companyAddress: null,
    logoDataUrl: null,
    themePrimaryColor: '#1e40af',
    themeAccentColor: '#3b82f6',
    themeBackgroundColor: '#ffffff',
    themeTextColor: '#1e293b',
  };
  return {
    getGlobalSettings: jest.fn().mockReturnValue(Promise.resolve(branding)),
    getDefaultBranding: jest.fn().mockReturnValue(branding),
  };
});
jest.mock('../../templates/proposalEmail', () => ({
  buildProposalEmailHtmlWithBranding: jest.fn().mockReturnValue('<html></html>'),
  buildProposalEmailSubject: jest.fn().mockReturnValue('Subject'),
}));
jest.mock('../../templates/proposalAccepted', () => ({
  buildProposalAcceptedHtmlWithBranding: jest.fn().mockReturnValue('<html></html>'),
  buildProposalAcceptedSubject: jest.fn().mockReturnValue('Subject'),
}));
jest.mock('../../templates/proposalRejected', () => ({
  buildProposalRejectedHtmlWithBranding: jest.fn().mockReturnValue('<html></html>'),
  buildProposalRejectedSubject: jest.fn().mockReturnValue('Subject'),
}));
jest.mock('../../config/email', () => ({
  isEmailConfigured: jest.fn().mockReturnValue(false),
}));
jest.mock('../../lib/prisma', () => ({
  prisma: {
    contact: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));
jest.mock('../../lib/logger', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  __esModule: true,
}));

describe('Proposal Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = createTestApp();
    const routes = (await import('../proposals')).default;
    setupTestRoutes(app, routes, '/api/v1/proposals');
  });

  it('GET / should list proposals', async () => {
    (proposalService.listProposals as jest.Mock).mockResolvedValue({
      data: [{ id: 'proposal-1' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const response = await request(app)
      .get('/api/v1/proposals')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(proposalService.listProposals).toHaveBeenCalled();
  });

  it('GET / should return 422 for invalid query', async () => {
    await request(app)
      .get('/api/v1/proposals?limit=0')
      .expect(422);
  });

  it('GET /available-for-contract should return proposals', async () => {
    (proposalService.getProposalsAvailableForContract as jest.Mock).mockResolvedValue([
      { id: 'proposal-1' },
    ]);

    const response = await request(app)
      .get('/api/v1/proposals/available-for-contract')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(proposalService.getProposalsAvailableForContract).toHaveBeenCalled();
  });

  it('GET /:id should return proposal', async () => {
    (proposalService.getProposalById as jest.Mock).mockResolvedValue({ id: 'proposal-1' });

    const response = await request(app)
      .get('/api/v1/proposals/proposal-1')
      .expect(200);

    expect(response.body.data.id).toBe('proposal-1');
  });

  it('GET /:id should return 404 when not found', async () => {
    (proposalService.getProposalById as jest.Mock).mockResolvedValue(null);

    await request(app)
      .get('/api/v1/proposals/missing')
      .expect(404);
  });

  it('GET /number/:proposalNumber should return proposal', async () => {
    (proposalService.getProposalByNumber as jest.Mock).mockResolvedValue({ id: 'proposal-1' });

    const response = await request(app)
      .get('/api/v1/proposals/number/PROP-20260101-0001')
      .expect(200);

    expect(response.body.data.id).toBe('proposal-1');
  });

  it('POST / should create proposal', async () => {
    (proposalService.createProposal as jest.Mock).mockResolvedValue({ id: 'proposal-1' });

    const response = await request(app)
      .post('/api/v1/proposals')
      .send({
        accountId: '11111111-1111-1111-1111-111111111111',
        title: 'New Proposal',
      })
      .expect(201);

    expect(response.body.data.id).toBe('proposal-1');
    expect(proposalService.createProposal).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: '11111111-1111-1111-1111-111111111111',
        title: 'New Proposal',
        createdByUserId: 'user-1',
      })
    );
  });

  it('POST / should return 422 for invalid payload', async () => {
    await request(app)
      .post('/api/v1/proposals')
      .send({ title: 'Missing accountId' })
      .expect(422);
  });

  it('PATCH /:id should update proposal', async () => {
    (proposalService.getProposalById as jest.Mock).mockResolvedValue({
      id: 'proposal-1',
      status: 'draft',
      pricingPlanId: 'plan-1',
    });
    (proposalService.updateProposal as jest.Mock).mockResolvedValue({ id: 'proposal-1' });

    const response = await request(app)
      .patch('/api/v1/proposals/proposal-1')
      .send({ title: 'Updated' })
      .expect(200);

    expect(response.body.data.id).toBe('proposal-1');
  });

  it('PATCH /:id should return 422 for invalid payload', async () => {
    (proposalService.getProposalById as jest.Mock).mockResolvedValue({
      id: 'proposal-1',
      status: 'draft',
      pricingPlanId: 'plan-1',
    });

    await request(app)
      .patch('/api/v1/proposals/proposal-1')
      .send({ taxRate: 'invalid' })
      .expect(422);
  });

  it('PATCH /:id should return 422 when status locked for edits', async () => {
    (proposalService.getProposalById as jest.Mock).mockResolvedValue({
      id: 'proposal-1',
      status: 'accepted',
    });

    await request(app)
      .patch('/api/v1/proposals/proposal-1')
      .send({ title: 'Updated' })
      .expect(422);
  });

  it('POST /:id/send should send proposal', async () => {
    const mockProposal = {
      id: 'proposal-1',
      status: 'draft',
      pricingLocked: false,
      proposalNumber: 'PROP-001',
      title: 'Test',
      account: { id: 'acc-1', name: 'Test Account' },
      totalAmount: '100',
      validUntil: null,
    };
    (proposalService.getProposalById as jest.Mock)
      .mockResolvedValueOnce(mockProposal)
      .mockResolvedValueOnce({ ...mockProposal, id: 'proposal-1', status: 'sent' });
    (proposalService.sendProposal as jest.Mock).mockResolvedValue({ ...mockProposal, status: 'sent' });

    const response = await request(app)
      .post('/api/v1/proposals/proposal-1/send')
      .send({ emailTo: 'test@example.com' })
      .expect(200);

    expect(response.body.data.id).toBe('proposal-1');
  });

  it('POST /:id/send should return 422 if not draft', async () => {
    (proposalService.getProposalById as jest.Mock).mockResolvedValue({
      id: 'proposal-1',
      status: 'sent',
    });

    await request(app)
      .post('/api/v1/proposals/proposal-1/send')
      .send({ emailTo: 'test@example.com' })
      .expect(422);
  });

  it('POST /:id/viewed should mark proposal viewed', async () => {
    (proposalService.getProposalById as jest.Mock).mockResolvedValue({ id: 'proposal-1' });
    (proposalService.markProposalAsViewed as jest.Mock).mockResolvedValue({ id: 'proposal-1' });

    const response = await request(app)
      .post('/api/v1/proposals/proposal-1/viewed')
      .expect(200);

    expect(response.body.data.id).toBe('proposal-1');
  });

  it('POST /:id/accept should accept proposal', async () => {
    (proposalService.getProposalById as jest.Mock).mockResolvedValue({
      id: 'proposal-1',
      status: 'sent',
      proposalNumber: 'PROP-001',
      title: 'Test',
      totalAmount: '100',
      account: { id: 'acc-1', name: 'Test Account' },
      createdByUser: { id: 'user-1', email: 'test@example.com' },
    });
    (proposalService.acceptProposal as jest.Mock).mockResolvedValue({ id: 'proposal-1' });

    const response = await request(app)
      .post('/api/v1/proposals/proposal-1/accept')
      .send({ signatureName: 'Signer' })
      .expect(200);

    expect(response.body.data.id).toBe('proposal-1');
  });

  it('POST /:id/accept should return 422 for invalid status', async () => {
    (proposalService.getProposalById as jest.Mock).mockResolvedValue({
      id: 'proposal-1',
      status: 'draft',
    });

    await request(app)
      .post('/api/v1/proposals/proposal-1/accept')
      .send({ signatureName: 'Signer' })
      .expect(422);
  });

  it('POST /:id/reject should reject proposal', async () => {
    (proposalService.getProposalById as jest.Mock).mockResolvedValue({
      id: 'proposal-1',
      status: 'viewed',
      proposalNumber: 'PROP-001',
      title: 'Test',
      account: { id: 'acc-1', name: 'Test Account' },
      createdByUser: { id: 'user-1', email: 'test@example.com' },
    });
    (proposalService.rejectProposal as jest.Mock).mockResolvedValue({ id: 'proposal-1' });

    const response = await request(app)
      .post('/api/v1/proposals/proposal-1/reject')
      .send({ rejectionReason: 'Too expensive' })
      .expect(200);

    expect(response.body.data.id).toBe('proposal-1');
  });

  it('POST /:id/archive should archive proposal', async () => {
    (proposalService.getProposalById as jest.Mock).mockResolvedValue({ id: 'proposal-1' });
    (proposalService.archiveProposal as jest.Mock).mockResolvedValue({ id: 'proposal-1' });

    const response = await request(app)
      .post('/api/v1/proposals/proposal-1/archive')
      .expect(200);

    expect(response.body.data.id).toBe('proposal-1');
  });

  it('POST /:id/restore should restore proposal', async () => {
    (proposalService.getProposalById as jest.Mock).mockResolvedValue({ id: 'proposal-1' });
    (proposalService.restoreProposal as jest.Mock).mockResolvedValue({ id: 'proposal-1' });

    const response = await request(app)
      .post('/api/v1/proposals/proposal-1/restore')
      .expect(200);

    expect(response.body.data.id).toBe('proposal-1');
  });

  it('DELETE /:id should delete proposal', async () => {
    (proposalService.getProposalById as jest.Mock).mockResolvedValue({ id: 'proposal-1' });
    (proposalService.deleteProposal as jest.Mock).mockResolvedValue({ id: 'proposal-1' });

    await request(app)
      .delete('/api/v1/proposals/proposal-1')
      .expect(204);
  });

  it('POST /:id/pricing/lock should lock pricing', async () => {
    (proposalService.getProposalById as jest.Mock).mockResolvedValue({ id: 'proposal-1' });
    (proposalService.lockProposalPricing as jest.Mock).mockResolvedValue({ id: 'proposal-1' });

    const response = await request(app)
      .post('/api/v1/proposals/proposal-1/pricing/lock')
      .expect(200);

    expect(response.body.data.id).toBe('proposal-1');
  });

  it('POST /:id/pricing/unlock should unlock pricing', async () => {
    (proposalService.getProposalById as jest.Mock).mockResolvedValue({ id: 'proposal-1' });
    (proposalService.unlockProposalPricing as jest.Mock).mockResolvedValue({ id: 'proposal-1' });

    const response = await request(app)
      .post('/api/v1/proposals/proposal-1/pricing/unlock')
      .expect(200);

    expect(response.body.data.id).toBe('proposal-1');
  });

  it('POST /:id/pricing/plan should change pricing plan', async () => {
    (proposalService.getProposalById as jest.Mock).mockResolvedValue({ id: 'proposal-1' });
    (proposalService.changeProposalPricingPlan as jest.Mock).mockResolvedValue({ id: 'proposal-1' });

    const response = await request(app)
      .post('/api/v1/proposals/proposal-1/pricing/plan')
      .send({ pricingPlanId: '11111111-1111-1111-1111-111111111111' })
      .expect(200);

    expect(response.body.data.id).toBe('proposal-1');
  });

  it('POST /:id/pricing/recalculate should recalculate pricing', async () => {
    (proposalService.getProposalById as jest.Mock).mockResolvedValue({ id: 'proposal-1' });
    (proposalService.recalculateProposalPricing as jest.Mock).mockResolvedValue({ id: 'proposal-1' });

    const response = await request(app)
      .post('/api/v1/proposals/proposal-1/pricing/recalculate')
      .send({ serviceFrequency: 'weekly' })
      .expect(200);

    expect(response.body.data.id).toBe('proposal-1');
  });

  it('GET /:id/pricing/preview should return pricing preview', async () => {
    (proposalService.getProposalById as jest.Mock).mockResolvedValue({ id: 'proposal-1' });
    (proposalService.getProposalPricingPreview as jest.Mock).mockResolvedValue({ monthlyTotal: 100 });

    const response = await request(app)
      .get('/api/v1/proposals/proposal-1/pricing/preview?serviceFrequency=weekly')
      .expect(200);

    expect(response.body.data.monthlyTotal).toBe(100);
  });
});
