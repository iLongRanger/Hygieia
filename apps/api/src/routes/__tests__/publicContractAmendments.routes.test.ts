import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import type { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as contractAmendmentPublicService from '../../services/contractAmendmentPublicService';
import * as notificationService from '../../services/notificationService';
import * as emailService from '../../services/emailService';
import * as globalSettingsService from '../../services/globalSettingsService';
import { prisma } from '../../lib/prisma';
import { logContractActivity } from '../../services/contractActivityService';

jest.mock('../../services/contractAmendmentPublicService');
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
    contractAmendment: {
      findUnique: jest.fn().mockResolvedValue(null),
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

describe('Public Contract Amendment Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = createTestApp();
    const routes = (await import('../publicContractAmendments')).default;
    setupTestRoutes(app, routes, '/api/v1/public/contract-amendments');
  });

  it('POST /:token/sign should log public_signed and notify approvers', async () => {
    (contractAmendmentPublicService.signContractAmendmentPublic as jest.Mock).mockResolvedValue({
      amendment: {
        id: 'amend-1',
        amendmentNumber: 1,
        title: 'Scope change',
        contract: { id: 'contract-1', contractNumber: 'CONT-001', account: { name: 'Acme Corp' } },
      },
      signedNow: true,
    });
    (prisma.contractAmendment.findUnique as jest.Mock).mockResolvedValue({
      amendmentNumber: 1,
      title: 'Scope change',
      contract: {
        id: 'contract-1',
        contractNumber: 'CONT-001',
        account: {
          name: 'Acme Corp',
          accountManagerId: 'manager-1',
        },
      },
      createdByUser: { id: 'creator-1', email: 'creator@hygieia.test' },
    });
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: 'owner-1', email: 'owner@hygieia.test' },
    ]);
    (globalSettingsService.getGlobalSettings as jest.Mock).mockResolvedValue({
      companyName: 'Hygieia',
      companyEmail: 'ops@hygieia.test',
    });

    await request(app)
      .post('/api/v1/public/contract-amendments/token-123/sign')
      .send({ signedByName: 'Jane Client', signedByEmail: 'jane@acme.test' })
      .expect(200);

    expect(logContractActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: 'contract-1',
        action: 'public_signed',
        metadata: expect.objectContaining({
          amendmentId: 'amend-1',
          amendmentNumber: 1,
          signedByName: 'Jane Client',
          signedByEmail: 'jane@acme.test',
        }),
      })
    );
    expect(notificationService.createBulkNotifications).toHaveBeenCalledWith(
      expect.arrayContaining(['creator-1', 'manager-1', 'owner-1']),
      expect.objectContaining({
        type: 'contract_amendment_signed',
        metadata: expect.objectContaining({
          contractId: 'contract-1',
          amendmentId: 'amend-1',
          amendmentNumber: 1,
        }),
      })
    );
    expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Contract amendment #1 signed for CONT-001'),
      expect.stringContaining('Jane Client (jane@acme.test) signed amendment')
    );
  });
});
