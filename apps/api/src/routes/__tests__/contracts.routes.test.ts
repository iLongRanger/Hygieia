import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as contractService from '../../services/contractService';
import * as contractPublicService from '../../services/contractPublicService';
import * as contractAmendmentPublicService from '../../services/contractAmendmentPublicService';
import * as contractAmendmentService from '../../services/contractAmendmentService';
import * as contractAmendmentWorkflowService from '../../services/contractAmendmentWorkflowService';
import * as emailService from '../../services/emailService';
import * as emailConfig from '../../config/email';
import * as notificationService from '../../services/notificationService';
import * as jobService from '../../services/jobService';
import * as proposalService from '../../services/proposalService';
import { prisma } from '../../lib/prisma';
import { ensureOwnershipAccess } from '../../middleware/ownership';

const mockAuthUser: { id: string; role: string; teamId?: string } = {
  id: 'user-1',
  role: 'owner',
};

const mockOwnership = {
  deniedKeys: new Set<string>(),
};

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = mockAuthUser;
    next();
  },
}));

jest.mock('../../middleware/rbac', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../middleware/ownership', () => ({
  verifyOwnership:
    ({ resourceType, paramName = 'id' }: { resourceType: string; paramName?: string }) =>
    (req: any, _res: any, next: any) => {
      const { ForbiddenError } = require('../../middleware/errorHandler');
      const key = `${req.user?.role}:${resourceType}:${req.params[paramName]}`;
      if (mockOwnership.deniedKeys.has(key)) {
        return next(new ForbiddenError('Access denied'));
      }
      next();
    },
  ensureOwnershipAccess: jest.fn(async (user: any, context: any) => {
    const { ForbiddenError } = require('../../middleware/errorHandler');
    const key = `${user?.role}:${context.resourceType}:${context.resourceId}`;
    if (mockOwnership.deniedKeys.has(key)) {
      throw new ForbiddenError('Access denied');
    }
  }),
  ensureManagerAccountAccess: jest.fn(async () => undefined),
}));

jest.mock('../../services/contractService');
jest.mock('../../services/contractAmendmentService');
jest.mock('../../services/contractAmendmentWorkflowService');

jest.mock('../../services/contractActivityService', () => ({
  logContractActivity: jest.fn().mockResolvedValue({}),
  getContractActivities: jest.fn().mockResolvedValue({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
}));

jest.mock('../../services/pdfService', () => ({
  generateContractPdf: jest.fn().mockResolvedValue(Buffer.from('fake-pdf')),
}));

jest.mock('../../services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/contractPublicService', () => ({
  generatePublicToken: jest.fn().mockResolvedValue('contract-public-token'),
}));
jest.mock('../../services/contractAmendmentPublicService', () => ({
  generatePublicToken: jest.fn().mockResolvedValue('amendment-public-token'),
}));

jest.mock('../../services/notificationService', () => ({
  createBulkNotifications: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../services/jobService', () => ({
  autoGenerateRecurringJobsForContract: jest.fn().mockResolvedValue({ created: 0 }),
  createJob: jest.fn().mockResolvedValue({ id: 'job-1', jobNumber: 'WO-2026-0001' }),
  generateJobsFromContract: jest.fn().mockResolvedValue({ created: 0, jobs: [] }),
  regenerateRecurringJobsForContract: jest.fn().mockResolvedValue({ created: 0, canceled: 0 }),
}));

jest.mock('../../config/email', () => ({
  isEmailConfigured: jest.fn().mockReturnValue(false),
}));

jest.mock('../../services/globalSettingsService', () => ({
  getGlobalSettings: jest.fn().mockResolvedValue({
    companyName: 'Hygieia',
    companyEmail: 'ops@hygieia.test',
    companyPhone: '555-111-2222',
    companyWebsite: 'https://hygieia.test',
    companyAddress: '123 Main St',
    logoDataUrl: null,
    themePrimaryColor: '#1a1a2e',
    themeAccentColor: '#d4af37',
    themeBackgroundColor: '#f5f5f5',
    themeTextColor: '#333333',
    companyTimezone: 'UTC',
  }),
  getDefaultBranding: jest.fn().mockReturnValue({
    companyName: 'Hygieia',
    companyEmail: 'ops@hygieia.test',
    companyPhone: '555-111-2222',
    companyWebsite: 'https://hygieia.test',
    companyAddress: '123 Main St',
    logoDataUrl: null,
    themePrimaryColor: '#1a1a2e',
    themeAccentColor: '#d4af37',
    themeBackgroundColor: '#f5f5f5',
    themeTextColor: '#333333',
    companyTimezone: 'UTC',
  }),
}));

jest.mock('../../templates/contractActivated', () => ({
  buildContractActivatedHtmlWithBranding: jest.fn().mockReturnValue('<html></html>'),
  buildContractActivatedSubject: jest.fn().mockReturnValue('Subject'),
}));

jest.mock('../../templates/contractTerminated', () => ({
  buildContractTerminatedHtmlWithBranding: jest.fn().mockReturnValue('<html></html>'),
  buildContractTerminatedSubject: jest.fn().mockReturnValue('Subject'),
}));

jest.mock('../../templates/contractSent', () => ({
  buildContractSentHtmlWithBranding: jest.fn().mockReturnValue('<html></html>'),
  buildContractSentSubject: jest.fn().mockReturnValue('Subject'),
}));

jest.mock('../../services/teamService', () => ({
  ensureSubcontractorRoleForTeamUsers: jest.fn().mockResolvedValue(undefined),
  getSubcontractorTeamUsers: jest.fn().mockResolvedValue([]),
  createSubcontractorUser: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../services/proposalService', () => ({
  getProposalById: jest.fn(),
}));

jest.mock('../../lib/prisma', () => ({
  prisma: {
    contract: { findUnique: jest.fn().mockResolvedValue(null) },
    job: { findFirst: jest.fn().mockResolvedValue(null) },
    area: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findUnique: jest.fn().mockResolvedValue(null) },
    account: { findUnique: jest.fn().mockResolvedValue(null) },
    facility: { findUnique: jest.fn().mockResolvedValue(null) },
    contact: { findMany: jest.fn().mockResolvedValue([]) },
    notification: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
    userRole: { findMany: jest.fn().mockResolvedValue([]) },
    team: { findUnique: jest.fn().mockResolvedValue(null) },
    contractAmendment: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
    },
  },
}));

jest.mock('../../lib/logger', () => {
  const logger = { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: logger };
});

describe('Contract Routes', () => {
  let app: Application;
  const originalFrontendUrl = process.env.FRONTEND_URL;
  const originalWebAppUrl = process.env.WEB_APP_URL;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.FRONTEND_URL = 'https://app.example.com';
    process.env.WEB_APP_URL = 'https://portal.example.com';
    mockAuthUser.role = 'owner';
    delete mockAuthUser.teamId;
    mockOwnership.deniedKeys.clear();
    app = createTestApp();
    const routes = (await import('../contracts')).default;
    setupTestRoutes(app, routes, '/api/v1/contracts');
  });

  afterEach(() => {
    process.env.FRONTEND_URL = originalFrontendUrl;
    process.env.WEB_APP_URL = originalWebAppUrl;
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

  it('GET / should pass cleaner scope to contract list service', async () => {
    mockAuthUser.role = 'cleaner';
    (contractService.listContracts as jest.Mock).mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    await request(app)
      .get('/api/v1/contracts?page=1&limit=20')
      .expect(200);

    expect(contractService.listContracts).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 20,
      }),
      expect.objectContaining({
        userRole: 'cleaner',
        userId: 'user-1',
      })
    );
  });

  it('GET / should pass subcontractor scope to contract list service', async () => {
    mockAuthUser.role = 'subcontractor';
    mockAuthUser.teamId = 'team-1';
    (contractService.listContracts as jest.Mock).mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    await request(app)
      .get('/api/v1/contracts?page=1&limit=20')
      .expect(200);

    expect(contractService.listContracts).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 20,
      }),
      expect.objectContaining({
        userRole: 'subcontractor',
        userId: 'user-1',
        userTeamId: 'team-1',
      })
    );
  });

  it('GET / should return subcontractor payout fields for subcontractor users', async () => {
    mockAuthUser.role = 'subcontractor';
    mockAuthUser.teamId = 'team-1';

    (contractService.listContracts as jest.Mock).mockResolvedValue({
      data: [
        {
          id: 'contract-1',
          contractNumber: 'CONT-001',
          title: 'Main Office Cleaning',
          monthlyValue: 1000,
          totalValue: 12000,
          subcontractorTier: 'labor_only',
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const response = await request(app).get('/api/v1/contracts').expect(200);

    expect(response.body.data[0]).toMatchObject({
      id: 'contract-1',
      subcontractorTier: 'labor_only',
      subcontractorPayout: 400,
    });
    expect(response.body.data[0].monthlyValue).toBeUndefined();
    expect(response.body.data[0].totalValue).toBeUndefined();
  });

  it('GET / should return 422 for invalid query', async () => {
    await request(app)
      .get('/api/v1/contracts?limit=0')
      .expect(422);
  });

  it('GET /summary should pass user scope to contract summary service', async () => {
    mockAuthUser.role = 'manager';
    (contractService.getContractsSummary as jest.Mock).mockResolvedValue({
      total: 1,
      byStatus: { draft: 0, sent: 0, viewed: 0, pendingSignature: 0, active: 1 },
      unassigned: 0,
      nearingRenewal: 0,
      renewalWindowDays: 30,
    });

    await request(app)
      .get('/api/v1/contracts/summary')
      .expect(200);

    expect(contractService.getContractsSummary).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        userRole: 'manager',
        userId: 'user-1',
      })
    );
  });

  it('GET /summary should pass subcontractor scope to contract summary service', async () => {
    mockAuthUser.role = 'subcontractor';
    mockAuthUser.teamId = 'team-1';
    (contractService.getContractsSummary as jest.Mock).mockResolvedValue({
      total: 0,
      byStatus: { draft: 0, sent: 0, viewed: 0, pendingSignature: 0, active: 0 },
      unassigned: 0,
      nearingRenewal: 0,
      renewalWindowDays: 30,
    });

    await request(app)
      .get('/api/v1/contracts/summary')
      .expect(200);

    expect(contractService.getContractsSummary).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        userRole: 'subcontractor',
        userId: 'user-1',
        userTeamId: 'team-1',
      })
    );
  });

  it('GET /expiring should pass cleaner scope to expiring contracts service', async () => {
    mockAuthUser.role = 'cleaner';
    (contractService.getExpiringContracts as jest.Mock).mockResolvedValue([]);

    await request(app)
      .get('/api/v1/contracts/expiring?days=14')
      .expect(200);

    expect(contractService.getExpiringContracts).toHaveBeenCalledWith(
      14,
      expect.objectContaining({
        userRole: 'cleaner',
        userId: 'user-1',
      })
    );
  });

  it('GET /expiring should pass subcontractor scope to expiring contracts service', async () => {
    mockAuthUser.role = 'subcontractor';
    mockAuthUser.teamId = 'team-1';
    (contractService.getExpiringContracts as jest.Mock).mockResolvedValue([]);

    await request(app)
      .get('/api/v1/contracts/expiring?days=14')
      .expect(200);

    expect(contractService.getExpiringContracts).toHaveBeenCalledWith(
      14,
      expect.objectContaining({
        userRole: 'subcontractor',
        userId: 'user-1',
        userTeamId: 'team-1',
      })
    );
  });

  it('GET /:id should return contract', async () => {
    (contractService.getContractById as jest.Mock).mockResolvedValue({ id: 'contract-1' });

    const response = await request(app)
      .get('/api/v1/contracts/contract-1')
      .expect(200);

    expect(response.body.data.id).toBe('contract-1');
  });

  it('GET /:id should include facility areas and tasks for subcontractor users', async () => {
    mockAuthUser.role = 'subcontractor';
    mockAuthUser.teamId = 'team-1';

    (contractService.getContractById as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      contractNumber: 'CONT-001',
      title: 'Main Office Cleaning',
      monthlyValue: 2000,
      totalValue: 24000,
      subcontractorTier: 'standard',
      facility: { id: 'facility-1', name: 'HQ', address: {} },
    });
    (prisma.area.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'area-1',
        name: 'Lobby',
        squareFeet: '1200',
        floorType: 'tile',
        roomCount: 0,
        unitCount: 0,
        areaType: { name: 'Common Area' },
      },
    ]);
    (contractService.getFacilityTasksForContract as jest.Mock).mockResolvedValue([
      {
        taskTemplate: { name: 'Vacuum' },
        customName: null,
        area: { name: 'Lobby' },
        cleaningFrequency: 'daily',
      },
    ]);

    const response = await request(app).get('/api/v1/contracts/contract-1').expect(200);

    expect(response.body.data.subcontractorPayout).toBe(1000);
    expect(response.body.data.monthlyValue).toBeUndefined();
    expect(response.body.data.totalValue).toBeUndefined();
    expect(response.body.data.facility.areas).toEqual([
      expect.objectContaining({
        id: 'area-1',
        name: 'Lobby',
        areaType: 'Common Area',
        squareFeet: 1200,
      }),
    ]);
    expect(response.body.data.facility.tasks).toEqual([
      expect.objectContaining({
        name: 'Vacuum',
        areaName: 'Lobby',
        cleaningFrequency: 'daily',
      }),
    ]);
  });

  it('GET /:id should return 404 when not found', async () => {
    (contractService.getContractById as jest.Mock).mockResolvedValue(null);

    await request(app)
      .get('/api/v1/contracts/missing')
      .expect(404);
  });

  it('GET /:id should return 403 when cleaner lacks contract ownership', async () => {
    mockAuthUser.role = 'cleaner';
    mockOwnership.deniedKeys.add('cleaner:contract:contract-locked');

    await request(app)
      .get('/api/v1/contracts/contract-locked')
      .expect(403);

    expect(contractService.getContractById).not.toHaveBeenCalled();
  });

  it('GET /:id should return 403 when subcontractor lacks contract ownership', async () => {
    mockAuthUser.role = 'subcontractor';
    mockAuthUser.teamId = 'team-1';
    mockOwnership.deniedKeys.add('subcontractor:contract:contract-locked');

    await request(app)
      .get('/api/v1/contracts/contract-locked')
      .expect(403);

    expect(contractService.getContractById).not.toHaveBeenCalled();
  });

  it('POST / should create contract', async () => {
    (contractService.createContract as jest.Mock).mockResolvedValue({ id: 'contract-1' });

    const response = await request(app)
      .post('/api/v1/contracts')
      .send({
        title: 'New Contract',
        accountId: '11111111-1111-1111-1111-111111111111',
        facilityId: '22222222-2222-2222-2222-222222222222',
        startDate: '2026-01-01',
        monthlyValue: 1000,
      })
      .expect(201);

    expect(response.body.data.id).toBe('contract-1');
    expect(contractService.createContract).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Contract',
        accountId: '11111111-1111-1111-1111-111111111111',
        facilityId: '22222222-2222-2222-2222-222222222222',
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
    (proposalService.getProposalById as jest.Mock).mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
    });
    (contractService.createContractFromProposal as jest.Mock).mockResolvedValue({ id: 'contract-1' });

    const response = await request(app)
      .post('/api/v1/contracts/from-proposal/11111111-1111-1111-1111-111111111111')
      .send({ title: 'From Proposal' })
      .expect(201);

    expect(response.body.data.id).toBe('contract-1');
    expect(contractService.createContractFromProposal).toHaveBeenCalled();
    expect(ensureOwnershipAccess).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1', role: 'owner' }),
      expect.objectContaining({
        resourceType: 'proposal',
        resourceId: '11111111-1111-1111-1111-111111111111',
      })
    );
  });

  it('POST /from-proposal/:proposalId should return 404 when proposal is missing', async () => {
    (proposalService.getProposalById as jest.Mock).mockResolvedValue(null);

    await request(app)
      .post('/api/v1/contracts/from-proposal/11111111-1111-1111-1111-111111111111')
      .send({ title: 'From Proposal' })
      .expect(404);

    expect(contractService.createContractFromProposal).not.toHaveBeenCalled();
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
    expect(jobService.autoGenerateRecurringJobsForContract).not.toHaveBeenCalled();
  });

  it('PATCH /:id/status should return 403 when manager lacks contract ownership', async () => {
    mockAuthUser.role = 'manager';
    mockOwnership.deniedKeys.add('manager:contract:contract-locked');

    await request(app)
      .patch('/api/v1/contracts/contract-locked/status')
      .send({ status: 'active' })
      .expect(403);

    expect(contractService.updateContractStatus).not.toHaveBeenCalled();
  });

  it('PATCH /:id/status should notify assignment required when activating without team', async () => {
    (contractService.updateContractStatus as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      contractNumber: 'CONT-001',
      title: 'Main Service Agreement',
      account: { name: 'Acme Corp' },
      monthlyValue: '2500',
      startDate: '2026-02-01',
      assignedTeam: null,
    });
    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      createdByUserId: 'user-1',
      createdByUser: { email: 'owner@example.com' },
      account: {
        accountManagerId: null,
        accountManager: null,
      },
    });
    (prisma.userRole.findMany as jest.Mock).mockResolvedValue([]);

    await request(app)
      .patch('/api/v1/contracts/contract-1/status')
      .send({ status: 'active' })
      .expect(200);

    expect(notificationService.createBulkNotifications).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        type: 'contract_assignment_required',
        metadata: expect.objectContaining({
          contractId: 'contract-1',
          action: 'assign_team_or_employee',
        }),
      })
    );
  });

  it('PATCH /:id/team should assign team', async () => {
    (contractService.getContractById as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      status: 'active',
      assignedTeam: null,
      assignedToUser: null,
    });
    (contractService.assignContractTeam as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      contractNumber: 'CONT-001',
      title: 'Main Service Agreement',
    });
    (prisma.userRole.findMany as jest.Mock).mockResolvedValue([
      { user: { id: 'sub-user-1', email: 'sub1@example.com', fullName: 'Sub User One' } },
    ]);

    const response = await request(app)
      .patch('/api/v1/contracts/contract-1/team')
      .send({ teamId: '11111111-1111-1111-1111-111111111111' })
      .expect(200);

    expect(response.body.data.id).toBe('contract-1');
    expect(contractService.assignContractTeam).toHaveBeenCalledWith(
      'contract-1',
      '11111111-1111-1111-1111-111111111111',
      null,
      undefined
    );
    expect(jobService.autoGenerateRecurringJobsForContract).toHaveBeenCalled();
    expect(notificationService.createBulkNotifications).toHaveBeenCalledWith(
      ['sub-user-1'],
      expect.objectContaining({
        type: 'contract_team_assigned',
        metadata: expect.objectContaining({
          contractId: 'contract-1',
          teamId: '11111111-1111-1111-1111-111111111111',
        }),
      })
    );
    expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
      'sub1@example.com',
      'Contract CONT-001 assigned to your team',
      expect.stringContaining('Please view it in the web app for full details')
    );
  });

  it('PATCH /:id/team should return 403 when subcontractor lacks contract ownership', async () => {
    mockAuthUser.role = 'subcontractor';
    mockAuthUser.teamId = 'team-1';
    mockOwnership.deniedKeys.add('subcontractor:contract:contract-locked');

    await request(app)
      .patch('/api/v1/contracts/contract-locked/team')
      .send({ teamId: '11111111-1111-1111-1111-111111111111' })
      .expect(403);

    expect(contractService.assignContractTeam).not.toHaveBeenCalled();
  });

  it('PATCH /:id/team should assign internal employee', async () => {
    (contractService.getContractById as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      status: 'active',
      assignedTeam: null,
      assignedToUser: null,
    });
    (contractService.assignContractTeam as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      contractNumber: 'CONT-001',
      title: 'Main Service Agreement',
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      email: 'employee@example.com',
      fullName: 'Employee One',
      status: 'active',
    });

    const response = await request(app)
      .patch('/api/v1/contracts/contract-1/team')
      .send({ teamId: null, assignedToUserId: '22222222-2222-2222-2222-222222222222' })
      .expect(200);

    expect(response.body.data.id).toBe('contract-1');
    expect(contractService.assignContractTeam).toHaveBeenCalledWith(
      'contract-1',
      null,
      '22222222-2222-2222-2222-222222222222',
      undefined
    );
    expect(notificationService.createBulkNotifications).toHaveBeenCalledWith(
      ['22222222-2222-2222-2222-222222222222'],
      expect.objectContaining({
        type: 'contract_assignment_required',
        metadata: expect.objectContaining({
          contractId: 'contract-1',
          assignedToUserId: '22222222-2222-2222-2222-222222222222',
        }),
      })
    );
    expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
      'employee@example.com',
      'Contract CONT-001 assigned to you',
      expect.stringContaining('Please view it in the web app for full details')
    );
  });

  it('POST /:id/send should return 422 for non-sendable statuses', async () => {
    (contractService.getContractById as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      status: 'terminated',
    });

    await request(app)
      .post('/api/v1/contracts/contract-1/send')
      .send({})
      .expect(422);
  });

  it('POST /:id/send should generate token and send email when configured', async () => {
    const contract = {
      id: 'contract-1',
      status: 'draft',
      contractNumber: 'CONT-001',
      title: 'Main Service Agreement',
      renewalNumber: null,
      monthlyValue: '2500',
      startDate: '2026-02-01',
      account: { id: 'account-1', name: 'Acme Corp' },
    };
    (emailConfig.isEmailConfigured as jest.Mock).mockReturnValue(true);
    (contractService.getContractById as jest.Mock)
      .mockResolvedValueOnce(contract)
      .mockResolvedValueOnce({ ...contract, status: 'sent' });
    (contractService.sendContract as jest.Mock).mockResolvedValue({
      ...contract,
      status: 'sent',
    });
    (prisma.contact.findMany as jest.Mock).mockResolvedValue([
      { name: 'Jane Client', email: 'jane@acme.com', isPrimary: true },
    ]);

    await request(app)
      .post('/api/v1/contracts/contract-1/send')
      .send({})
      .expect(200);

    expect(contractPublicService.generatePublicToken).toHaveBeenCalledWith('contract-1');
    expect(contractService.sendContract).toHaveBeenCalledWith('contract-1');
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'jane@acme.com',
      })
    );
  });

  it('POST /:id/send should return 422 when FRONTEND_URL is missing', async () => {
    delete process.env.FRONTEND_URL;
    delete process.env.WEB_APP_URL;
    delete process.env.CORS_ORIGIN;
    (contractService.getContractById as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      status: 'draft',
      contractNumber: 'CONT-001',
      title: 'Main Service Agreement',
      account: { id: 'account-1', name: 'Acme Corp' },
    });

    await request(app)
      .post('/api/v1/contracts/contract-1/send')
      .send({})
      .expect(422);

    expect(contractPublicService.generatePublicToken).not.toHaveBeenCalled();
    expect(contractService.sendContract).not.toHaveBeenCalled();
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

  it('POST /:id/renew should renew contract', async () => {
    (contractService.renewContract as jest.Mock).mockResolvedValue({ id: 'contract-1' });

    const response = await request(app)
      .post('/api/v1/contracts/contract-1/renew')
      .send({ startDate: '2026-02-01' })
      .expect(200);

    expect(response.body.data.id).toBe('contract-1');
  });

  it('GET /:id/amendments should list amendments', async () => {
    (contractAmendmentService.listContractAmendments as jest.Mock).mockResolvedValue([
      { id: 'amend-1', contractId: 'contract-1', amendmentNumber: 1, status: 'draft' },
    ]);

    const response = await request(app)
      .get('/api/v1/contracts/contract-1/amendments')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(contractAmendmentService.listContractAmendments).toHaveBeenCalledWith('contract-1');
  });

  it('POST /:id/amendments should create amendment draft', async () => {
    (contractAmendmentService.createContractAmendment as jest.Mock).mockResolvedValue({
      id: 'amend-1',
      contractId: 'contract-1',
      amendmentNumber: 1,
      status: 'draft',
    });

    const response = await request(app)
      .post('/api/v1/contracts/contract-1/amendments')
      .send({
        title: 'Scope change',
        effectiveDate: '2026-03-15',
      })
      .expect(201);

    expect(response.body.data.id).toBe('amend-1');
    expect(contractAmendmentService.createContractAmendment).toHaveBeenCalledWith(
      'contract-1',
      expect.objectContaining({ title: 'Scope change' }),
      'user-1'
    );
  });

  it('GET /:id/amendments/:amendmentId should return amendment detail', async () => {
    (contractAmendmentService.getContractAmendmentById as jest.Mock).mockResolvedValue({
      id: 'amend-1',
      contractId: 'contract-1',
      amendmentNumber: 1,
      status: 'draft',
      snapshots: [],
      activities: [],
    });

    const response = await request(app)
      .get('/api/v1/contracts/contract-1/amendments/amend-1')
      .expect(200);

    expect(response.body.data.id).toBe('amend-1');
  });

  it('PATCH /:id/amendments/:amendmentId should update amendment draft', async () => {
    (contractAmendmentService.getContractAmendmentById as jest.Mock).mockResolvedValue({
      id: 'amend-1',
      contractId: 'contract-1',
      amendmentNumber: 1,
      status: 'draft',
    });
    (contractAmendmentService.updateContractAmendment as jest.Mock).mockResolvedValue({
      id: 'amend-1',
      contractId: 'contract-1',
      amendmentNumber: 1,
      status: 'submitted',
    });

    const response = await request(app)
      .patch('/api/v1/contracts/contract-1/amendments/amend-1')
      .send({ status: 'submitted' })
      .expect(200);

    expect(response.body.data.status).toBe('submitted');
    expect(contractAmendmentService.updateContractAmendment).toHaveBeenCalledWith(
      'amend-1',
      expect.objectContaining({ status: 'submitted' }),
      'user-1'
    );
  });

  it('PATCH /:id/amendments/:amendmentId should notify approvers when submitted', async () => {
    (contractAmendmentService.getContractAmendmentById as jest.Mock).mockResolvedValue({
      id: 'amend-1',
      contractId: 'contract-1',
      amendmentNumber: 1,
      status: 'draft',
    });
    (contractAmendmentService.updateContractAmendment as jest.Mock).mockResolvedValue({
      id: 'amend-1',
      contractId: 'contract-1',
      amendmentNumber: 1,
      status: 'submitted',
    });
    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      contractNumber: 'C-1001',
      title: 'Downtown Janitorial',
      createdByUserId: 'creator-1',
      createdByUser: { email: 'creator@example.com' },
      account: {
        accountManagerId: 'manager-1',
        accountManager: { email: 'manager@example.com' },
      },
    });
    (prisma.userRole.findMany as jest.Mock).mockResolvedValue([
      { user: { id: 'owner-1', email: 'owner@example.com' } },
      { user: { id: 'admin-1', email: 'admin@example.com' } },
    ]);

    await request(app)
      .patch('/api/v1/contracts/contract-1/amendments/amend-1')
      .send({ status: 'submitted' })
      .expect(200);

    expect(notificationService.createBulkNotifications).toHaveBeenCalledWith(
      expect.arrayContaining(['creator-1', 'manager-1', 'owner-1', 'admin-1']),
      expect.objectContaining({
        type: 'contract_amendment_submitted',
        metadata: expect.objectContaining({
          contractId: 'contract-1',
          amendmentId: 'amend-1',
          amendmentNumber: 1,
          status: 'submitted',
        }),
      })
    );
  });

  it('PATCH /:id/status should generate recurring residential jobs on activation', async () => {
    (contractService.updateContractStatus as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      contractNumber: 'CONT-001',
      title: 'Weekly Home Cleaning',
      account: { id: 'account-1', name: 'Jane Doe Residence' },
      facility: { id: 'facility-1', name: 'Jane Doe Residence' },
      monthlyValue: '480',
      startDate: '2026-02-01',
      assignedTeam: null,
      assignedToUser: null,
      serviceCategory: 'residential',
      residentialServiceType: 'recurring_standard',
    });
    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      createdByUserId: 'user-1',
      createdByUser: { email: 'owner@example.com' },
      account: {
        accountManagerId: null,
        accountManager: null,
      },
    });
    (prisma.userRole.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.job.findFirst as jest.Mock).mockResolvedValue(null);

    await request(app)
      .patch('/api/v1/contracts/contract-1/status')
      .send({ status: 'active' })
      .expect(200);

    expect(jobService.generateJobsFromContract).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: 'contract-1',
        createdByUserId: 'user-1',
      })
    );
    expect(jobService.createJob).not.toHaveBeenCalled();
  });

  it('PATCH /:id/status should create one-time residential job on activation', async () => {
    (contractService.updateContractStatus as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      contractNumber: 'CONT-001',
      title: 'Move Out Clean',
      account: { id: 'account-1', name: 'Jane Doe Residence' },
      facility: { id: 'facility-1', name: 'Jane Doe Residence' },
      monthlyValue: '480',
      startDate: '2026-02-01',
      assignedTeam: null,
      assignedToUser: null,
      specialInstructions: 'Focus on kitchen and bathrooms',
      serviceCategory: 'residential',
      residentialServiceType: 'move_in_out',
      homeProfileSnapshot: {},
    });
    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      createdByUserId: 'user-1',
      createdByUser: { email: 'owner@example.com' },
      account: {
        accountManagerId: null,
        accountManager: null,
      },
    });
    (prisma.userRole.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.job.findFirst as jest.Mock).mockResolvedValue(null);

    await request(app)
      .patch('/api/v1/contracts/contract-1/status')
      .send({ status: 'active' })
      .expect(200);

    expect(jobService.createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: 'contract-1',
        facilityId: 'facility-1',
        accountId: 'account-1',
        createdByUserId: 'user-1',
        jobCategory: 'one_time',
      })
    );
  });

  it('PATCH /:id/amendments/:amendmentId should reject mismatched frequency day counts', async () => {
    (contractAmendmentService.getContractAmendmentById as jest.Mock).mockResolvedValue({
      id: 'amend-1',
      contractId: 'contract-1',
      amendmentNumber: 1,
      status: 'draft',
    });

    const response = await request(app)
      .patch('/api/v1/contracts/contract-1/amendments/amend-1')
      .send({
        newServiceFrequency: '5x_week',
        newServiceSchedule: {
          days: ['monday'],
          allowedWindowStart: '18:00',
          allowedWindowEnd: '06:00',
        },
      })
      .expect(422);

    expect(response.body.error.message).toContain('exactly 5 service days');
    expect(contractAmendmentService.updateContractAmendment).not.toHaveBeenCalled();
  });

  it('POST /:id/amendments/:amendmentId/recalculate should recalculate amendment pricing', async () => {
    (contractAmendmentService.getContractAmendmentById as jest.Mock).mockResolvedValue({
      id: 'amend-1',
      contractId: 'contract-1',
      amendmentNumber: 1,
      status: 'draft',
    });
    (contractAmendmentService.recalculateContractAmendment as jest.Mock).mockResolvedValue({
      amendment: {
        id: 'amend-1',
        contractId: 'contract-1',
        amendmentNumber: 1,
        status: 'draft',
        newMonthlyValue: 3200,
        pricingPlanId: 'plan-1',
      },
      pricing: {
        monthlyTotal: 3200,
      },
    });

    const response = await request(app)
      .post('/api/v1/contracts/contract-1/amendments/amend-1/recalculate')
      .send({
        pricingPlanId: '11111111-1111-1111-1111-111111111111',
        newServiceFrequency: 'weekly',
        workingScope: { areas: [], tasks: [] },
      })
      .expect(200);

    expect(response.body.data.amendment.id).toBe('amend-1');
    expect(contractAmendmentService.recalculateContractAmendment).toHaveBeenCalledWith(
      'amend-1',
      expect.objectContaining({
        newServiceFrequency: 'weekly',
      }),
      'user-1'
    );
  });

  it('POST /:id/amendments/:amendmentId/approve should approve amendment', async () => {
    (contractAmendmentService.getContractAmendmentById as jest.Mock).mockResolvedValue({
      id: 'amend-1',
      contractId: 'contract-1',
      amendmentNumber: 1,
      status: 'submitted',
    });
    (contractAmendmentService.approveContractAmendment as jest.Mock).mockResolvedValue({
      id: 'amend-1',
      contractId: 'contract-1',
      amendmentNumber: 1,
      status: 'approved',
    });

    const response = await request(app)
      .post('/api/v1/contracts/contract-1/amendments/amend-1/approve')
      .expect(200);

    expect(response.body.data.status).toBe('approved');
    expect(contractAmendmentService.approveContractAmendment).toHaveBeenCalledWith(
      'amend-1',
      'user-1'
    );
  });

  it('POST /:id/amendments/:amendmentId/send should send approved amendment to client', async () => {
    (contractAmendmentPublicService.generatePublicToken as jest.Mock).mockResolvedValueOnce(
      'amendment-public-token'
    );
    (contractAmendmentService.getContractAmendmentById as jest.Mock)
      .mockResolvedValueOnce({
        id: 'amend-1',
        contractId: 'contract-1',
        amendmentNumber: 1,
        title: 'Scope change',
        status: 'approved',
        publicToken: null,
      })
      .mockResolvedValueOnce({
        id: 'amend-1',
        contractId: 'contract-1',
        amendmentNumber: 1,
        title: 'Scope change',
        status: 'sent',
        publicToken: 'amendment-public-token',
        contract: {
          contractNumber: 'CONT-001',
          account: { name: 'Acme Corp' },
        },
        oldMonthlyValue: 1000,
        newMonthlyValue: 1200,
        effectiveDate: '2026-03-20',
      });
    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      account: {
        name: 'Acme Corp',
        contacts: [{ name: 'Jane Client', email: 'jane@acme.test', isPrimary: true }],
      },
    });

    const response = await request(app)
      .post('/api/v1/contracts/contract-1/amendments/amend-1/send')
      .send({})
      .expect(200);

    expect(contractAmendmentPublicService.generatePublicToken).toHaveBeenCalledWith('amend-1');
    expect(prisma.contractAmendment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'amend-1' },
        data: expect.objectContaining({
          status: 'sent',
          sentAt: expect.any(Date),
        }),
      })
    );
    expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
      'jane@acme.test',
      expect.stringContaining('Contract Amendment #1: Scope change'),
      expect.stringContaining('/ca/amendment-public-token')
    );
    expect(response.body.data.publicViewUrl).toContain('/ca/amendment-public-token');
  });

  it('POST /:id/amendments/:amendmentId/send should preserve viewed status on resend', async () => {
    (contractAmendmentService.getContractAmendmentById as jest.Mock)
      .mockResolvedValueOnce({
        id: 'amend-1',
        contractId: 'contract-1',
        amendmentNumber: 1,
        title: 'Scope change',
        status: 'viewed',
        publicToken: 'amendment-public-token',
        contract: {
          contractNumber: 'CONT-001',
          account: { name: 'Acme Corp' },
        },
        oldMonthlyValue: 1000,
        newMonthlyValue: 1200,
        effectiveDate: '2026-03-20',
      })
      .mockResolvedValueOnce({
        id: 'amend-1',
        contractId: 'contract-1',
        amendmentNumber: 1,
        title: 'Scope change',
        status: 'viewed',
        publicToken: 'amendment-public-token',
        contract: {
          contractNumber: 'CONT-001',
          account: { name: 'Acme Corp' },
        },
        oldMonthlyValue: 1000,
        newMonthlyValue: 1200,
        effectiveDate: '2026-03-20',
      });
    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      account: {
        name: 'Acme Corp',
        contacts: [{ name: 'Jane Client', email: 'jane@acme.test', isPrimary: true }],
      },
    });

    await request(app)
      .post('/api/v1/contracts/contract-1/amendments/amend-1/send')
      .send({})
      .expect(200);

    expect(prisma.contractAmendment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'amend-1' },
        data: expect.objectContaining({
          status: 'viewed',
          sentAt: expect.any(Date),
        }),
      })
    );
  });

  it('POST /:id/amendments/:amendmentId/reject should reject amendment', async () => {
    (contractAmendmentService.getContractAmendmentById as jest.Mock).mockResolvedValue({
      id: 'amend-1',
      contractId: 'contract-1',
      amendmentNumber: 1,
      status: 'submitted',
    });
    (contractAmendmentService.rejectContractAmendment as jest.Mock).mockResolvedValue({
      id: 'amend-1',
      contractId: 'contract-1',
      amendmentNumber: 1,
      status: 'rejected',
      rejectedReason: 'Scope not approved',
    });

    const response = await request(app)
      .post('/api/v1/contracts/contract-1/amendments/amend-1/reject')
      .send({ rejectedReason: 'Scope not approved' })
      .expect(200);

    expect(response.body.data.status).toBe('rejected');
    expect(contractAmendmentService.rejectContractAmendment).toHaveBeenCalledWith(
      'amend-1',
      'Scope not approved',
      'user-1'
    );
  });

  it('POST /:id/amendments/:amendmentId/apply should apply amendment', async () => {
    (contractAmendmentService.getContractAmendmentById as jest.Mock).mockResolvedValue({
      id: 'amend-1',
      contractId: 'contract-1',
      amendmentNumber: 1,
      status: 'approved',
      effectiveDate: new Date('2026-03-06T00:00:00.000Z'),
    });
    (contractAmendmentWorkflowService.applyContractAmendmentWorkflow as jest.Mock).mockResolvedValue({
      amendment: {
        id: 'amend-1',
        contractId: 'contract-1',
        amendmentNumber: 1,
        status: 'applied',
      },
      recurringJobs: { created: 0, canceled: 0 },
      appliedEarly: false,
    });

    const response = await request(app)
      .post('/api/v1/contracts/contract-1/amendments/amend-1/apply')
      .expect(200);

    expect(response.body.data.amendment.status).toBe('applied');
    expect(contractAmendmentWorkflowService.applyContractAmendmentWorkflow).toHaveBeenCalledWith(
      'amend-1',
      expect.objectContaining({
        appliedByUserId: 'user-1',
        forceApply: false,
        source: 'manual',
      })
    );
  });

  it('POST / should reject mismatched contract service day counts', async () => {
    const response = await request(app)
      .post('/api/v1/contracts')
      .send({
        title: 'Invalid Schedule Contract',
        accountId: '11111111-1111-1111-1111-111111111111',
        facilityId: '22222222-2222-2222-2222-222222222222',
        startDate: '2026-03-17',
        serviceFrequency: '5x_week',
        serviceSchedule: {
          days: ['monday'],
          allowedWindowStart: '18:00',
          allowedWindowEnd: '06:00',
        },
        monthlyValue: 2400,
      })
      .expect(422);

    expect(response.body.error.message).toContain('exactly 5 service days');
    expect(contractService.createContract).not.toHaveBeenCalled();
  });

  it('POST /:id/amendments/:amendmentId/apply should block early apply without override', async () => {
    const futureEffectiveDate = new Date('2099-03-20T00:00:00.000Z');
    (contractAmendmentService.getContractAmendmentById as jest.Mock).mockResolvedValue({
      id: 'amend-1',
      contractId: 'contract-1',
      amendmentNumber: 1,
      status: 'approved',
      effectiveDate: futureEffectiveDate,
    });

    const response = await request(app)
      .post('/api/v1/contracts/contract-1/amendments/amend-1/apply')
      .expect(422);

    expect(response.body.error.message).toMatch(/starts on 2099-03-20/i);
    expect(contractAmendmentWorkflowService.applyContractAmendmentWorkflow).not.toHaveBeenCalled();
  });

  it('POST /:id/amendments/:amendmentId/apply should allow early apply with override', async () => {
    const futureEffectiveDate = new Date('2099-03-20T00:00:00.000Z');
    (contractAmendmentService.getContractAmendmentById as jest.Mock).mockResolvedValue({
      id: 'amend-1',
      contractId: 'contract-1',
      amendmentNumber: 1,
      status: 'approved',
      effectiveDate: futureEffectiveDate,
    });
    (contractAmendmentWorkflowService.applyContractAmendmentWorkflow as jest.Mock).mockResolvedValue({
      amendment: {
        id: 'amend-1',
        contractId: 'contract-1',
        amendmentNumber: 1,
        status: 'applied',
      },
      recurringJobs: { created: 0, canceled: 0 },
      appliedEarly: true,
    });

    const response = await request(app)
      .post('/api/v1/contracts/contract-1/amendments/amend-1/apply')
      .send({ forceApply: true })
      .expect(200);

    expect(response.body.data.amendment.status).toBe('applied');
    expect(contractAmendmentWorkflowService.applyContractAmendmentWorkflow).toHaveBeenCalledWith(
      'amend-1',
      expect.objectContaining({
        appliedByUserId: 'user-1',
        forceApply: true,
        source: 'manual',
      })
    );
  });

  it('POST /standalone should create standalone contract', async () => {
    (contractService.createStandaloneContract as jest.Mock).mockResolvedValue({ id: 'contract-1' });

    const response = await request(app)
      .post('/api/v1/contracts/standalone')
      .send({
        title: 'Standalone',
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
