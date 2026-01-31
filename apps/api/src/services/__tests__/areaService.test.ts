import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as areaService from '../areaService';
import { prisma } from '../../lib/prisma';

jest.mock('../../lib/prisma', () => {
  const area = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };
  const areaTemplate = {
    findUnique: jest.fn(),
  };
  const taskTemplate = {
    findMany: jest.fn(),
  };
  const facilityTask = {
    createMany: jest.fn(),
  };
  const prisma = {
    area,
    areaTemplate,
    taskTemplate,
    facilityTask,
    $transaction: jest.fn((fn: any) => fn({
      area,
      areaTemplate,
      taskTemplate,
      facilityTask,
    })),
  };
  return { prisma };
});

const createTestArea = (overrides?: Partial<any>) => ({
  id: 'area-123',
  facilityId: 'facility-123',
  areaTypeId: 'type-123',
  name: 'Main Office',
  quantity: 1,
  squareFeet: 500,
  conditionLevel: 'good',
  notes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  archivedAt: null,
  facility: { id: 'facility-123', name: 'HQ', accountId: 'account-123' },
  areaType: { id: 'type-123', name: 'Office', defaultSquareFeet: 200, baseCleaningTimeMinutes: 15 },
  createdByUser: { id: 'user-123', fullName: 'Test User' },
  _count: { facilityTasks: 0 },
  ...overrides,
});

describe('areaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation((fn: any) => fn(prisma));
    (prisma.areaTemplate.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.taskTemplate.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.facilityTask.createMany as jest.Mock).mockResolvedValue({ count: 0 });
  });

  describe('listAreas', () => {
    it('should return paginated areas', async () => {
      const mockAreas = [
        createTestArea({ id: 'area-1' }),
        createTestArea({ id: 'area-2' }),
      ];

      (prisma.area.findMany as jest.Mock).mockResolvedValue(mockAreas);
      (prisma.area.count as jest.Mock).mockResolvedValue(2);

      const result = await areaService.listAreas({});

      expect(result.data).toEqual(mockAreas);
      expect(result.pagination.total).toBe(2);
    });

    it('should filter by facilityId', async () => {
      const mockAreas = [createTestArea()];

      (prisma.area.findMany as jest.Mock).mockResolvedValue(mockAreas);
      (prisma.area.count as jest.Mock).mockResolvedValue(1);

      await areaService.listAreas({ facilityId: 'facility-123' });

      expect(prisma.area.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            facilityId: 'facility-123',
          }),
        })
      );
    });

    it('should filter by areaTypeId', async () => {
      const mockAreas = [createTestArea()];

      (prisma.area.findMany as jest.Mock).mockResolvedValue(mockAreas);
      (prisma.area.count as jest.Mock).mockResolvedValue(1);

      await areaService.listAreas({ areaTypeId: 'type-123' });

      expect(prisma.area.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            areaTypeId: 'type-123',
          }),
        })
      );
    });
  });

  describe('getAreaById', () => {
    it('should return area by id', async () => {
      const mockArea = createTestArea();

      (prisma.area.findUnique as jest.Mock).mockResolvedValue(mockArea);

      const result = await areaService.getAreaById('area-123');

      expect(result).toEqual(mockArea);
    });
  });

  describe('createArea', () => {
    it('should create area', async () => {
      const input: areaService.AreaCreateInput = {
        facilityId: 'facility-123',
        areaTypeId: 'type-123',
        name: 'Conference Room',
        quantity: 2,
        squareFeet: 400,
        conditionLevel: 'good',
        createdByUserId: 'user-123',
      };

      const mockArea = createTestArea(input);

      (prisma.area.create as jest.Mock).mockResolvedValue(mockArea);

      const result = await areaService.createArea(input);

      expect(result).toMatchObject({
        ...mockArea,
        _appliedTemplate: { tasksCreated: 0 },
      });
    });
  });

  describe('updateArea', () => {
    it('should update area', async () => {
      const input: areaService.AreaUpdateInput = {
        name: 'Updated Name',
        squareFeet: 600,
      };

      const mockArea = createTestArea(input);

      (prisma.area.update as jest.Mock).mockResolvedValue(mockArea);

      const result = await areaService.updateArea('area-123', input);

      expect(result).toEqual(mockArea);
    });
  });

  describe('archiveArea', () => {
    it('should archive area', async () => {
      const mockArea = createTestArea({ archivedAt: new Date() });

      (prisma.area.update as jest.Mock).mockResolvedValue(mockArea);

      await areaService.archiveArea('area-123');

      expect(prisma.area.update).toHaveBeenCalledWith({
        where: { id: 'area-123' },
        data: { archivedAt: expect.any(Date) },
        select: expect.any(Object),
      });
    });
  });

  describe('restoreArea', () => {
    it('should restore area', async () => {
      const mockArea = createTestArea({ archivedAt: null });

      (prisma.area.update as jest.Mock).mockResolvedValue(mockArea);

      await areaService.restoreArea('area-123');

      expect(prisma.area.update).toHaveBeenCalledWith({
        where: { id: 'area-123' },
        data: { archivedAt: null },
        select: expect.any(Object),
      });
    });
  });

  describe('deleteArea', () => {
    it('should delete area', async () => {
      (prisma.area.delete as jest.Mock).mockResolvedValue({ id: 'area-123' });

      const result = await areaService.deleteArea('area-123');

      expect(result).toEqual({ id: 'area-123' });
    });
  });
});
