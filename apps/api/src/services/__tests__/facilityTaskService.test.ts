import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as facilityTaskService from '../facilityTaskService';
import { prisma } from '../../lib/prisma';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    facilityTask: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      createMany: jest.fn(),
    },
    taskTemplate: {
      findMany: jest.fn(),
    },
  },
}));

const createTestFacilityTask = (overrides?: Partial<any>) => ({
  id: 'task-123',
  facilityId: 'facility-123',
  areaId: 'area-123',
  taskTemplateId: 'template-123',
  customName: 'Custom Task',
  customInstructions: 'Instructions here',
  estimatedMinutes: 30,
  isRequired: true,
  cleaningFrequency: 'daily',
  conditionMultiplier: 1.0,
  priority: 3,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  archivedAt: null,
  facility: { id: 'facility-123', name: 'HQ', accountId: 'account-123' },
  area: { id: 'area-123', name: 'Lobby', areaType: { id: 'type-123', name: 'Office' } },
  taskTemplate: { id: 'template-123', name: 'Vacuum', cleaningType: 'daily', estimatedMinutes: 30, difficultyLevel: 'medium' },
  createdByUser: { id: 'user-123', fullName: 'Test User' },
  ...overrides,
});

describe('facilityTaskService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listFacilityTasks', () => {
    it('should return paginated facility tasks', async () => {
      const mockTasks = [
        createTestFacilityTask({ id: 'task-1' }),
        createTestFacilityTask({ id: 'task-2' }),
      ];

      (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue(mockTasks);
      (prisma.facilityTask.count as jest.Mock).mockResolvedValue(2);

      const result = await facilityTaskService.listFacilityTasks({});

      expect(result.data).toEqual(mockTasks);
      expect(result.pagination.total).toBe(2);
    });

    it('should filter by facilityId', async () => {
      const mockTasks = [createTestFacilityTask()];

      (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue(mockTasks);
      (prisma.facilityTask.count as jest.Mock).mockResolvedValue(1);

      await facilityTaskService.listFacilityTasks({ facilityId: 'facility-123' });

      expect(prisma.facilityTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            facilityId: 'facility-123',
          }),
        })
      );
    });

    it('should filter by areaId', async () => {
      const mockTasks = [createTestFacilityTask()];

      (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue(mockTasks);
      (prisma.facilityTask.count as jest.Mock).mockResolvedValue(1);

      await facilityTaskService.listFacilityTasks({ areaId: 'area-123' });

      expect(prisma.facilityTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            areaId: 'area-123',
          }),
        })
      );
    });

    it('should filter by taskTemplateId', async () => {
      const mockTasks = [createTestFacilityTask()];

      (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue(mockTasks);
      (prisma.facilityTask.count as jest.Mock).mockResolvedValue(1);

      await facilityTaskService.listFacilityTasks({ taskTemplateId: 'template-123' });

      expect(prisma.facilityTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            taskTemplateId: 'template-123',
          }),
        })
      );
    });

    it('should filter by cleaningFrequency', async () => {
      const mockTasks = [createTestFacilityTask()];

      (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue(mockTasks);
      (prisma.facilityTask.count as jest.Mock).mockResolvedValue(1);

      await facilityTaskService.listFacilityTasks({ cleaningFrequency: 'weekly' });

      expect(prisma.facilityTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cleaningFrequency: 'weekly',
          }),
        })
      );
    });

    it('should filter by isRequired', async () => {
      const mockTasks = [createTestFacilityTask()];

      (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue(mockTasks);
      (prisma.facilityTask.count as jest.Mock).mockResolvedValue(1);

      await facilityTaskService.listFacilityTasks({ isRequired: true });

      expect(prisma.facilityTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isRequired: true,
          }),
        })
      );
    });

    it('should filter by priority', async () => {
      const mockTasks = [createTestFacilityTask()];

      (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue(mockTasks);
      (prisma.facilityTask.count as jest.Mock).mockResolvedValue(1);

      await facilityTaskService.listFacilityTasks({ priority: 5 });

      expect(prisma.facilityTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            priority: 5,
          }),
        })
      );
    });

    it('should search by customName and taskTemplate name', async () => {
      const mockTasks = [createTestFacilityTask()];

      (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue(mockTasks);
      (prisma.facilityTask.count as jest.Mock).mockResolvedValue(1);

      await facilityTaskService.listFacilityTasks({ search: 'vacuum' });

      expect(prisma.facilityTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { customName: { contains: 'vacuum', mode: 'insensitive' } },
              { taskTemplate: { name: { contains: 'vacuum', mode: 'insensitive' } } },
            ],
          }),
        })
      );
    });

    it('should sort by priority by default', async () => {
      const mockTasks = [createTestFacilityTask()];

      (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue(mockTasks);
      (prisma.facilityTask.count as jest.Mock).mockResolvedValue(1);

      await facilityTaskService.listFacilityTasks({});

      expect(prisma.facilityTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { priority: 'asc' },
        })
      );
    });
  });

  describe('getFacilityTaskById', () => {
    it('should return facility task by id', async () => {
      const mockTask = createTestFacilityTask();

      (prisma.facilityTask.findUnique as jest.Mock).mockResolvedValue(mockTask);

      const result = await facilityTaskService.getFacilityTaskById('task-123');

      expect(result).toEqual(mockTask);
    });
  });

  describe('createFacilityTask', () => {
    it('should create facility task', async () => {
      const input: facilityTaskService.FacilityTaskCreateInput = {
        facilityId: 'facility-123',
        areaId: 'area-123',
        taskTemplateId: 'template-123',
        customName: 'Custom Vacuum',
        customInstructions: 'Use special vacuum',
        estimatedMinutes: 45,
        isRequired: true,
        cleaningFrequency: 'weekly',
        conditionMultiplier: 1.2,
        priority: 5,
        createdByUserId: 'user-123',
      };

      const mockTask = createTestFacilityTask(input);

      (prisma.facilityTask.create as jest.Mock).mockResolvedValue(mockTask);

      const result = await facilityTaskService.createFacilityTask(input);

      expect(result).toEqual(mockTask);
    });

    it('should default isRequired to true', async () => {
      const input: facilityTaskService.FacilityTaskCreateInput = {
        facilityId: 'facility-123',
        createdByUserId: 'user-123',
      };

      const mockTask = createTestFacilityTask(input);

      (prisma.facilityTask.create as jest.Mock).mockResolvedValue(mockTask);

      await facilityTaskService.createFacilityTask(input);

      expect(prisma.facilityTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isRequired: true,
          }),
        })
      );
    });

    it('should default cleaningFrequency to daily', async () => {
      const input: facilityTaskService.FacilityTaskCreateInput = {
        facilityId: 'facility-123',
        createdByUserId: 'user-123',
      };

      const mockTask = createTestFacilityTask(input);

      (prisma.facilityTask.create as jest.Mock).mockResolvedValue(mockTask);

      await facilityTaskService.createFacilityTask(input);

      expect(prisma.facilityTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cleaningFrequency: 'daily',
          }),
        })
      );
    });

    it('should default conditionMultiplier to 1.0', async () => {
      const input: facilityTaskService.FacilityTaskCreateInput = {
        facilityId: 'facility-123',
        createdByUserId: 'user-123',
      };

      const mockTask = createTestFacilityTask(input);

      (prisma.facilityTask.create as jest.Mock).mockResolvedValue(mockTask);

      await facilityTaskService.createFacilityTask(input);

      expect(prisma.facilityTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            conditionMultiplier: 1.0,
          }),
        })
      );
    });

    it('should default priority to 3', async () => {
      const input: facilityTaskService.FacilityTaskCreateInput = {
        facilityId: 'facility-123',
        createdByUserId: 'user-123',
      };

      const mockTask = createTestFacilityTask(input);

      (prisma.facilityTask.create as jest.Mock).mockResolvedValue(mockTask);

      await facilityTaskService.createFacilityTask(input);

      expect(prisma.facilityTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            priority: 3,
          }),
        })
      );
    });
  });

  describe('updateFacilityTask', () => {
    it('should update facility task', async () => {
      const input: facilityTaskService.FacilityTaskUpdateInput = {
        customName: 'Updated Task',
        estimatedMinutes: 60,
        priority: 1,
      };

      const mockTask = createTestFacilityTask(input);

      (prisma.facilityTask.update as jest.Mock).mockResolvedValue(mockTask);

      const result = await facilityTaskService.updateFacilityTask('task-123', input);

      expect(result).toEqual(mockTask);
    });

    it('should disconnect area when set to null', async () => {
      const mockTask = createTestFacilityTask({ areaId: null });

      (prisma.facilityTask.update as jest.Mock).mockResolvedValue(mockTask);

      await facilityTaskService.updateFacilityTask('task-123', { areaId: null });

      expect(prisma.facilityTask.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            area: { disconnect: true },
          }),
        })
      );
    });

    it('should disconnect taskTemplate when set to null', async () => {
      const mockTask = createTestFacilityTask({ taskTemplateId: null });

      (prisma.facilityTask.update as jest.Mock).mockResolvedValue(mockTask);

      await facilityTaskService.updateFacilityTask('task-123', { taskTemplateId: null });

      expect(prisma.facilityTask.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taskTemplate: { disconnect: true },
          }),
        })
      );
    });
  });

  describe('archiveFacilityTask', () => {
    it('should archive facility task', async () => {
      const mockTask = createTestFacilityTask({ archivedAt: new Date() });

      (prisma.facilityTask.update as jest.Mock).mockResolvedValue(mockTask);

      await facilityTaskService.archiveFacilityTask('task-123');

      expect(prisma.facilityTask.update).toHaveBeenCalledWith({
        where: { id: 'task-123' },
        data: { archivedAt: expect.any(Date) },
        select: expect.any(Object),
      });
    });
  });

  describe('restoreFacilityTask', () => {
    it('should restore facility task', async () => {
      const mockTask = createTestFacilityTask({ archivedAt: null });

      (prisma.facilityTask.update as jest.Mock).mockResolvedValue(mockTask);

      await facilityTaskService.restoreFacilityTask('task-123');

      expect(prisma.facilityTask.update).toHaveBeenCalledWith({
        where: { id: 'task-123' },
        data: { archivedAt: null },
        select: expect.any(Object),
      });
    });
  });

  describe('deleteFacilityTask', () => {
    it('should delete facility task', async () => {
      (prisma.facilityTask.delete as jest.Mock).mockResolvedValue({ id: 'task-123' });

      const result = await facilityTaskService.deleteFacilityTask('task-123');

      expect(result).toEqual({ id: 'task-123' });
    });
  });

  describe('bulkCreateFacilityTasks', () => {
    it('should create multiple facility tasks from templates', async () => {
      const mockTemplates = [
        { id: 'template-1', estimatedMinutes: 30 },
        { id: 'template-2', estimatedMinutes: 45 },
      ];

      (prisma.taskTemplate.findMany as jest.Mock).mockResolvedValue(mockTemplates);
      (prisma.facilityTask.createMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await facilityTaskService.bulkCreateFacilityTasks(
        'facility-123',
        ['template-1', 'template-2'],
        'user-123'
      );

      expect(prisma.taskTemplate.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['template-1', 'template-2'] } },
        select: {
          id: true,
          cleaningType: true,
          estimatedMinutes: true,
        },
      });

      expect(prisma.facilityTask.createMany).toHaveBeenCalledWith({
        data: [
          {
            facilityId: 'facility-123',
            taskTemplateId: 'template-1',
            estimatedMinutes: 30,
            createdByUserId: 'user-123',
            areaId: null,
            cleaningFrequency: 'daily',
          },
          {
            facilityId: 'facility-123',
            taskTemplateId: 'template-2',
            estimatedMinutes: 45,
            createdByUserId: 'user-123',
            areaId: null,
            cleaningFrequency: 'daily',
          },
        ],
      });

      expect(result).toEqual({ count: 2 });
    });
  });
});
