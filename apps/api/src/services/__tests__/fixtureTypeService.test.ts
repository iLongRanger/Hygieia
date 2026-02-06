import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as fixtureTypeService from '../fixtureTypeService';
import { prisma } from '../../lib/prisma';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    fixtureType: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('fixtureTypeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('listFixtureTypes should return paginated result', async () => {
    (prisma.fixtureType.findMany as jest.Mock).mockResolvedValue([{ id: 'fixture-1', name: 'Chair' }]);
    (prisma.fixtureType.count as jest.Mock).mockResolvedValue(1);

    const result = await fixtureTypeService.listFixtureTypes({
      page: 1,
      limit: 50,
      search: 'Cha',
      sortBy: 'name',
      sortOrder: 'asc',
    });

    expect(result.data).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
    expect(prisma.fixtureType.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { name: 'asc' },
        where: expect.objectContaining({
          name: { contains: 'Cha', mode: 'insensitive' },
        }),
      })
    );
  });

  it('createFixtureType should apply defaults', async () => {
    (prisma.fixtureType.create as jest.Mock).mockResolvedValue({ id: 'fixture-1', name: 'Desk' });

    await fixtureTypeService.createFixtureType({ name: 'Desk' });

    expect(prisma.fixtureType.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Desk',
          category: 'fixture',
          defaultMinutesPerItem: 0,
          isActive: true,
        }),
      })
    );
  });

  it('updateFixtureType should only include provided fields', async () => {
    (prisma.fixtureType.update as jest.Mock).mockResolvedValue({ id: 'fixture-1', name: 'Updated' });

    await fixtureTypeService.updateFixtureType('fixture-1', { name: 'Updated', isActive: false });

    expect(prisma.fixtureType.update).toHaveBeenCalledWith({
      where: { id: 'fixture-1' },
      data: { name: 'Updated', isActive: false },
      select: expect.any(Object),
    });
  });
});
