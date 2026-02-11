import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as teamService from '../teamService';
import { prisma } from '../../lib/prisma';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    team: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('teamService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
