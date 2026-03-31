import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as teamService from '../teamService';
import { prisma } from '../../lib/prisma';
import { ConflictError, ValidationError } from '../../middleware/errorHandler';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    team: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    contract: {
      count: jest.fn(),
    },
    appointment: {
      count: jest.fn(),
    },
    job: {
      count: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    userRole: {
      create: jest.fn(),
    },
    passwordSetToken: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../../services/globalSettingsService', () => ({
  getGlobalSettings: jest.fn().mockResolvedValue({}),
  getDefaultBranding: jest.fn().mockReturnValue({}),
}));

jest.mock('../../templates/subcontractorWelcome', () => ({
  buildSubcontractorWelcomeHtml: jest.fn().mockReturnValue('<html></html>'),
  buildSubcontractorWelcomeSubject: jest.fn().mockReturnValue('Welcome'),
}));

jest.mock('../../config/email', () => ({
  isEmailConfigured: jest.fn().mockReturnValue(false),
}));

jest.mock('../emailService', () => ({
  sendNotificationEmail: jest.fn().mockResolvedValue(true),
}));

describe('teamService', () => {
  const originalFrontendUrl = process.env.FRONTEND_URL;
  const originalWebAppUrl = process.env.WEB_APP_URL;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.FRONTEND_URL = originalFrontendUrl;
    process.env.WEB_APP_URL = originalWebAppUrl;
  });

  it('listTeams should return paginated teams', async () => {
    (prisma.team.findMany as jest.Mock).mockResolvedValue([{ id: 'team-1', name: 'Alpha Team' }]);
    (prisma.team.count as jest.Mock).mockResolvedValue(1);

    const result = await teamService.listTeams({ page: 1, limit: 10 });

    expect(result.data).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  it('createTeam should persist a team', async () => {
    (prisma.team.create as jest.Mock).mockResolvedValue({ id: 'team-1', name: 'Alpha Team' });

    const result = await teamService.createTeam({
      name: 'Alpha Team',
      createdByUserId: 'user-1',
    });

    expect(result.id).toBe('team-1');
    expect(prisma.team.create).toHaveBeenCalled();
  });

  it('archiveTeam should reject while live assignments still exist', async () => {
    (prisma.contract.count as jest.Mock).mockResolvedValue(1);
    (prisma.appointment.count as jest.Mock).mockResolvedValue(0);
    (prisma.job.count as jest.Mock).mockResolvedValue(2);

    await expect(teamService.archiveTeam('team-1')).rejects.toThrow(ConflictError);
    expect(prisma.team.update).not.toHaveBeenCalled();
  });

  it('resendSubcontractorInvite should fail before creating a token when app URL is missing', async () => {
    delete process.env.FRONTEND_URL;
    delete process.env.WEB_APP_URL;

    (prisma.team.findUnique as jest.Mock).mockResolvedValue({
      id: 'team-1',
      name: 'Alpha Team',
      contactName: 'Alex Alpha',
      contactEmail: 'alpha@example.com',
      users: [],
    });
    (prisma.role.findUnique as jest.Mock).mockResolvedValue({
      id: 'role-1',
      key: 'subcontractor',
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'alpha@example.com',
      roles: [{ role: { key: 'subcontractor' } }],
    });

    await expect(teamService.resendSubcontractorInvite('team-1')).rejects.toThrow(ValidationError);
    expect(prisma.passwordSetToken.create).not.toHaveBeenCalled();
  });

  it('resendSubcontractorInvite should reject when contact email belongs to another team user', async () => {
    (prisma.team.findUnique as jest.Mock).mockResolvedValue({
      id: 'team-1',
      name: 'Alpha Team',
      contactName: 'Alex Alpha',
      contactEmail: 'shared@example.com',
      users: [],
    });
    (prisma.role.findUnique as jest.Mock).mockResolvedValue({
      id: 'role-1',
      key: 'subcontractor',
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-9',
      email: 'shared@example.com',
      teamId: 'team-9',
      fullName: 'Shared User',
      status: 'active',
      roles: [{ role: { key: 'subcontractor' } }],
    });

    await expect(teamService.resendSubcontractorInvite('team-1')).rejects.toThrow(ConflictError);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
