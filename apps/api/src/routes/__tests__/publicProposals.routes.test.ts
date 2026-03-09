import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as proposalPublicService from '../../services/proposalPublicService';
import * as proposalActivityService from '../../services/proposalActivityService';
import * as pdfService from '../../services/pdfService';
import * as notificationService from '../../services/notificationService';
import * as emailService from '../../services/emailService';
import { prisma } from '../../lib/prisma';

jest.mock('../../services/proposalPublicService');
jest.mock('../../services/proposalActivityService', () => ({
  logActivity: jest.fn().mockResolvedValue({ id: 'activity-1' }),
}));
jest.mock('../../services/pdfService', () => ({
  generateProposalPdf: jest.fn().mockResolvedValue(Buffer.from('pdf-bytes')),
}));
jest.mock('../../services/emailService', () => ({
  sendNotificationEmail: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../services/notificationService', () => ({
  createBulkNotifications: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../services/globalSettingsService', () => {
  const branding = {
    companyName: 'Test Co',
    companyEmail: null,
    companyPhone: null,
    companyWebsite: null,
    companyAddress: null,
    logoDataUrl: null,
    themePrimaryColor: '#111111',
    themeAccentColor: '#222222',
    themeBackgroundColor: '#ffffff',
    themeTextColor: '#000000',
  };
  return {
    getGlobalSettings: jest.fn().mockResolvedValue(branding),
    getDefaultBranding: jest.fn().mockReturnValue(branding),
  };
});
jest.mock('../../templates/proposalAccepted', () => ({
  buildProposalAcceptedHtmlWithBranding: jest.fn().mockReturnValue('<html></html>'),
  buildProposalAcceptedSubject: jest.fn().mockReturnValue('Accepted'),
}));
jest.mock('../../templates/proposalRejected', () => ({
  buildProposalRejectedHtmlWithBranding: jest.fn().mockReturnValue('<html></html>'),
  buildProposalRejectedSubject: jest.fn().mockReturnValue('Rejected'),
}));
jest.mock('../../lib/prisma', () => ({
  prisma: {
    proposal: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    notification: {
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));
jest.mock('../../lib/logger', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  __esModule: true,
}));

describe('Public Proposal Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = createTestApp();
    const routes = (await import('../publicProposals')).default;
    setupTestRoutes(app, routes, '/api/v1/public/proposals');
  });

  it('GET /:token should return proposal payload and mark viewed', async () => {
    (proposalPublicService.getProposalByPublicToken as jest.Mock).mockResolvedValue({
      id: 'proposal-1',
      proposalNumber: 'PROP-001',
      status: 'sent',
    });
    (proposalPublicService.markPublicViewed as jest.Mock).mockResolvedValue({
      id: 'proposal-1',
      newlyViewed: true,
    });

    const response = await request(app).get('/api/v1/public/proposals/token-123').expect(200);

    expect(response.body.data.proposalNumber).toBe('PROP-001');
    expect(proposalPublicService.markPublicViewed).toHaveBeenCalledWith('token-123', expect.any(String));
    expect(proposalActivityService.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ proposalId: 'proposal-1', action: 'public_viewed' })
    );
  });

  it('GET /:token should return 404 when not found', async () => {
    (proposalPublicService.getProposalByPublicToken as jest.Mock).mockResolvedValue(null);
    await request(app).get('/api/v1/public/proposals/missing').expect(404);
  });

  it('POST /:token/accept should return 422 for invalid payload', async () => {
    await request(app)
      .post('/api/v1/public/proposals/token-123/accept')
      .send({ signatureName: '' })
      .expect(422);
  });

  it('POST /:token/accept should accept proposal', async () => {
    (proposalPublicService.acceptProposalPublic as jest.Mock).mockResolvedValue({
      proposal: {
        id: 'proposal-1',
        status: 'accepted',
      },
      acceptedNow: true,
    });
    (prisma.proposal.findUnique as jest.Mock).mockResolvedValue({
      proposalNumber: 'PROP-001',
      title: 'Test Proposal',
      totalAmount: '1200',
      account: { name: 'Acme Corp' },
      createdByUser: { id: 'user-1', email: 'owner@example.com' },
    });

    const response = await request(app)
      .post('/api/v1/public/proposals/token-123/accept')
      .send({ signatureName: 'Jane Client' })
      .expect(200);

    expect(response.body.data.status).toBe('accepted');
    expect(proposalPublicService.acceptProposalPublic).toHaveBeenCalledWith(
      'token-123',
      'Jane Client',
      expect.any(String)
    );
    expect(proposalActivityService.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ proposalId: 'proposal-1', action: 'public_accepted' })
    );
  });

  it('POST /:token/accept should skip duplicate acceptance side effects', async () => {
    (proposalPublicService.acceptProposalPublic as jest.Mock).mockResolvedValue({
      proposal: {
        id: 'proposal-1',
        status: 'accepted',
      },
      acceptedNow: false,
    });

    const response = await request(app)
      .post('/api/v1/public/proposals/token-123/accept')
      .send({ signatureName: 'Jane Client' })
      .expect(200);

    expect(response.body.message).toBe('Proposal already accepted');
    expect(proposalActivityService.logActivity).not.toHaveBeenCalled();
    expect(notificationService.createBulkNotifications).not.toHaveBeenCalled();
    expect(emailService.sendNotificationEmail).not.toHaveBeenCalled();
  });

  it('POST /:token/reject should reject proposal', async () => {
    (proposalPublicService.rejectProposalPublic as jest.Mock).mockResolvedValue({
      id: 'proposal-1',
      status: 'rejected',
    });

    const response = await request(app)
      .post('/api/v1/public/proposals/token-123/reject')
      .send({ rejectionReason: 'Budget constraints' })
      .expect(200);

    expect(response.body.data.status).toBe('rejected');
    expect(proposalPublicService.rejectProposalPublic).toHaveBeenCalledWith(
      'token-123',
      'Budget constraints',
      expect.any(String)
    );
    expect(proposalActivityService.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ proposalId: 'proposal-1', action: 'public_rejected' })
    );
  });

  it('GET /:token/pdf should return 404 when proposal token is invalid', async () => {
    (proposalPublicService.getProposalByPublicToken as jest.Mock).mockResolvedValue(null);

    await request(app).get('/api/v1/public/proposals/token-123/pdf').expect(404);
    expect(pdfService.generateProposalPdf).not.toHaveBeenCalled();
  });
});
