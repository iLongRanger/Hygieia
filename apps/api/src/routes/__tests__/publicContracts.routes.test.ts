import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import type { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as contractPublicService from '../../services/contractPublicService';
import * as notificationService from '../../services/notificationService';
import * as emailService from '../../services/emailService';
import * as globalSettingsService from '../../services/globalSettingsService';
import { prisma } from '../../lib/prisma';
import { logContractActivity } from '../../services/contractActivityService';

jest.mock('../../services/contractPublicService');
jest.mock('../../services/contractActivityService', () => ({
  logContractActivity: jest.fn().mockResolvedValue({ id: 'activity-1' }),
}));
jest.mock('../../services/notificationService', () => ({
  createBulkNotifications: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../services/emailService', () => ({
  sendNotificationEmail: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../services/globalSettingsService', () => ({
  getGlobalSettings: jest.fn().mockResolvedValue({
    companyName: 'Hygieia',
    companyEmail: 'ops@hygieia.test',
  }),
  getDefaultBranding: jest.fn().mockReturnValue({
    companyName: 'Hygieia',
    companyEmail: 'ops@hygieia.test',
  }),
}));
jest.mock('../../lib/prisma', () => ({
  prisma: {
    contract: {
      findUnique: jest.fn().mockResolvedValue(null),
      findUniqueOrThrow: jest.fn().mockResolvedValue(null),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));
jest.mock('../../lib/logger', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  __esModule: true,
}));

describe('Public Contract Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = createTestApp();
    const routes = (await import('../publicContracts')).default;
    setupTestRoutes(app, routes, '/api/v1/public/contracts');
  });

  it('POST /:token/sign should send notifications and email', async () => {
    (contractPublicService.signContractPublic as jest.Mock).mockResolvedValue({
      contract: {
        id: 'contract-1',
        status: 'pending_signature',
      },
      signedNow: true,
    });

    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      contractNumber: 'CONT-202602-0001',
      title: 'Janitorial Services',
      renewalNumber: 0,
      monthlyValue: '2500',
      account: { name: 'Acme Corp' },
      createdByUser: { id: 'creator-1', email: 'owner@acme.test' },
    });
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: 'admin-1', email: 'admin@hygieia.test' },
    ]);
    (globalSettingsService.getGlobalSettings as jest.Mock).mockResolvedValue({
      companyName: 'Hygieia',
      companyEmail: 'ops@hygieia.test',
    });

    await request(app)
      .post('/api/v1/public/contracts/token-123/sign')
      .send({ signedByName: 'Jane Client', signedByEmail: 'jane@acme.test' })
      .expect(200);

    expect(notificationService.createBulkNotifications).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        title: expect.stringContaining('Contract CONT-202602-0001 signed'),
      })
    );

    expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('CONT-202602-0001 signed'),
      expect.stringContaining('contract')
    );
    expect(logContractActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: 'contract-1',
        action: 'public_signed',
        ipAddress: expect.any(String),
      })
    );
  });

  it('GET /:token should not log duplicate public_viewed activity', async () => {
    (contractPublicService.getContractByPublicToken as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      contractNumber: 'CONT-202602-0001',
    });
    (contractPublicService.markPublicViewed as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      newlyViewed: false,
    });
    (globalSettingsService.getGlobalSettings as jest.Mock).mockResolvedValue({
      companyName: 'Hygieia',
      companyEmail: 'ops@hygieia.test',
    });

    const response = await request(app)
      .get('/api/v1/public/contracts/token-123');

    expect(response.status).toBe(200);
    expect(logContractActivity).not.toHaveBeenCalled();
  });

  it('GET /:token should log public_viewed with top-level ipAddress on first view', async () => {
    (contractPublicService.getContractByPublicToken as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      contractNumber: 'CONT-202602-0001',
    });
    (contractPublicService.markPublicViewed as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      newlyViewed: true,
    });
    (globalSettingsService.getGlobalSettings as jest.Mock).mockResolvedValue({
      companyName: 'Hygieia',
      companyEmail: 'ops@hygieia.test',
    });

    await request(app)
      .get('/api/v1/public/contracts/token-123')
      .expect(200);

    expect(logContractActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: 'contract-1',
        action: 'public_viewed',
        ipAddress: expect.any(String),
      })
    );
  });

  it('POST /:token/sign should skip duplicate notifications when already signed', async () => {
    (contractPublicService.signContractPublic as jest.Mock).mockResolvedValue({
      contract: {
        id: 'contract-1',
        status: 'pending_signature',
      },
      signedNow: false,
    });

    const response = await request(app)
      .post('/api/v1/public/contracts/token-123/sign')
      .send({ signedByName: 'Jane Client', signedByEmail: 'jane@acme.test' })
      .expect(200);

    expect(response.body.message).toBe('Contract already signed');
    expect(logContractActivity).not.toHaveBeenCalled();
    expect(notificationService.createBulkNotifications).not.toHaveBeenCalled();
    expect(emailService.sendNotificationEmail).not.toHaveBeenCalled();
  });
});
