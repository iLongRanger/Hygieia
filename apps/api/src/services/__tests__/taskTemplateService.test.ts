import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as taskTemplateService from '../taskTemplateService';
import { prisma } from '../../lib/prisma';
import { createTestTaskTemplate } from '../../test/helpers';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    taskTemplate: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('taskTemplateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listTaskTemplates', () => {
    it('should return paginated task templates with default parameters', async () => {
      const mockTemplates = [
        createTestTaskTemplate({ id: 'template-1', name: 'Vacuum Carpet' }),
        createTestTaskTemplate({ id: 'template-2', name: 'Mop Floor' }),
      ];

      (prisma.taskTemplate.findMany as jest.Mock).mockResolvedValue(mockTemplates);
      (prisma.taskTemplate.count as jest.Mock).mockResolvedValue(2);

      const result = await taskTemplateService.listTaskTemplates({});

      expect(prisma.taskTemplate.findMany).toHaveBeenCalledWith({
        where: { archivedAt: null },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
      expect(result.data).toEqual(mockTemplates);
      expect(result.pagination.total).toBe(2);
    });

    it('should filter by cleaningType', async () => {
      const mockTemplates = [createTestTaskTemplate()];

      (prisma.taskTemplate.findMany as jest.Mock).mockResolvedValue(mockTemplates);
      (prisma.taskTemplate.count as jest.Mock).mockResolvedValue(1);

      await taskTemplateService.listTaskTemplates({ cleaningType: 'deep' });

      expect(prisma.taskTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cleaningType: 'deep',
          }),
        })
      );
    });

    it('should filter by areaTypeId', async () => {
      const mockTemplates = [createTestTaskTemplate()];

      (prisma.taskTemplate.findMany as jest.Mock).mockResolvedValue(mockTemplates);
      (prisma.taskTemplate.count as jest.Mock).mockResolvedValue(1);

      await taskTemplateService.listTaskTemplates({ areaTypeId: 'area-type-123' });

      expect(prisma.taskTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            areaTypeId: 'area-type-123',
          }),
        })
      );
    });

    it('should filter by facilityId', async () => {
      const mockTemplates = [createTestTaskTemplate()];

      (prisma.taskTemplate.findMany as jest.Mock).mockResolvedValue(mockTemplates);
      (prisma.taskTemplate.count as jest.Mock).mockResolvedValue(1);

      await taskTemplateService.listTaskTemplates({ facilityId: 'facility-123' });

      expect(prisma.taskTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            facilityId: 'facility-123',
          }),
        })
      );
    });

    it('should filter by isGlobal', async () => {
      const mockTemplates = [createTestTaskTemplate()];

      (prisma.taskTemplate.findMany as jest.Mock).mockResolvedValue(mockTemplates);
      (prisma.taskTemplate.count as jest.Mock).mockResolvedValue(1);

      await taskTemplateService.listTaskTemplates({ isGlobal: true });

      expect(prisma.taskTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isGlobal: true,
          }),
        })
      );
    });

    it('should filter by isActive', async () => {
      const mockTemplates = [createTestTaskTemplate()];

      (prisma.taskTemplate.findMany as jest.Mock).mockResolvedValue(mockTemplates);
      (prisma.taskTemplate.count as jest.Mock).mockResolvedValue(1);

      await taskTemplateService.listTaskTemplates({ isActive: false });

      expect(prisma.taskTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: false,
          }),
        })
      );
    });

    it('should search by name and description', async () => {
      const mockTemplates = [createTestTaskTemplate()];

      (prisma.taskTemplate.findMany as jest.Mock).mockResolvedValue(mockTemplates);
      (prisma.taskTemplate.count as jest.Mock).mockResolvedValue(1);

      await taskTemplateService.listTaskTemplates({ search: 'vacuum' });

      expect(prisma.taskTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'vacuum', mode: 'insensitive' } },
              { description: { contains: 'vacuum', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    it('should include archived templates when requested', async () => {
      const mockTemplates = [createTestTaskTemplate()];

      (prisma.taskTemplate.findMany as jest.Mock).mockResolvedValue(mockTemplates);
      (prisma.taskTemplate.count as jest.Mock).mockResolvedValue(1);

      await taskTemplateService.listTaskTemplates({ includeArchived: true });

      expect(prisma.taskTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      );
    });

    it('should fallback to createdAt when sortBy is invalid', async () => {
      const mockTemplates = [createTestTaskTemplate()];

      (prisma.taskTemplate.findMany as jest.Mock).mockResolvedValue(mockTemplates);
      (prisma.taskTemplate.count as jest.Mock).mockResolvedValue(1);

      await taskTemplateService.listTaskTemplates({ sortBy: 'invalid-field' });

      expect(prisma.taskTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });
  });

  describe('getTaskTemplateById', () => {
    it('should return task template by id', async () => {
      const mockTemplate = createTestTaskTemplate({ id: 'template-123' });

      (prisma.taskTemplate.findUnique as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await taskTemplateService.getTaskTemplateById('template-123');

      expect(prisma.taskTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: 'template-123' },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockTemplate);
    });

    it('should return null for non-existent template', async () => {
      (prisma.taskTemplate.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await taskTemplateService.getTaskTemplateById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('createTaskTemplate', () => {
    it('should create task template with all fields', async () => {
      const input: taskTemplateService.TaskTemplateCreateInput = {
        name: 'Vacuum Carpet',
        description: 'Vacuum all carpeted areas',
        cleaningType: 'routine',
        areaTypeId: 'area-type-123',
        estimatedMinutes: 30,
        difficultyLevel: 2,
        requiredEquipment: ['vacuum', 'extension cord'],
        requiredSupplies: [],
        instructions: 'Start from far corner',
        isGlobal: true,
        facilityId: null,
        isActive: true,
        createdByUserId: 'user-123',
      };

      const mockTemplate = createTestTaskTemplate(input);

      (prisma.taskTemplate.create as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await taskTemplateService.createTaskTemplate(input);

      expect(prisma.taskTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: input.name,
          cleaningType: input.cleaningType,
          estimatedMinutes: input.estimatedMinutes,
        }),
        select: expect.any(Object),
      });
      expect(result).toEqual(mockTemplate);
    });

    it('should create template with default values', async () => {
      const input: taskTemplateService.TaskTemplateCreateInput = {
        name: 'Mop Floor',
        cleaningType: 'routine',
        estimatedMinutes: 20,
        createdByUserId: 'user-123',
      };

      const mockTemplate = createTestTaskTemplate(input);

      (prisma.taskTemplate.create as jest.Mock).mockResolvedValue(mockTemplate);

      await taskTemplateService.createTaskTemplate(input);

      expect(prisma.taskTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            difficultyLevel: 3,
            requiredEquipment: [],
            requiredSupplies: [],
            isGlobal: false,
            isActive: true,
          }),
        })
      );
    });
  });

  describe('updateTaskTemplate', () => {
    it('should update template with provided fields', async () => {
      const input: taskTemplateService.TaskTemplateUpdateInput = {
        name: 'Updated Name',
        estimatedMinutes: 45,
        isActive: false,
      };

      const mockTemplate = createTestTaskTemplate({ ...input, id: 'template-123' });

      (prisma.taskTemplate.update as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await taskTemplateService.updateTaskTemplate('template-123', input);

      expect(prisma.taskTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-123' },
        data: expect.objectContaining({
          name: 'Updated Name',
          estimatedMinutes: 45,
          isActive: false,
        }),
        select: expect.any(Object),
      });
      expect(result).toEqual(mockTemplate);
    });

    it('should disconnect areaType when set to null', async () => {
      const input: taskTemplateService.TaskTemplateUpdateInput = {
        areaTypeId: null,
      };

      const mockTemplate = createTestTaskTemplate({ id: 'template-123' });

      (prisma.taskTemplate.update as jest.Mock).mockResolvedValue(mockTemplate);

      await taskTemplateService.updateTaskTemplate('template-123', input);

      expect(prisma.taskTemplate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            areaType: { disconnect: true },
          }),
        })
      );
    });

    it('should connect areaType when provided', async () => {
      const input: taskTemplateService.TaskTemplateUpdateInput = {
        areaTypeId: 'area-type-456',
      };

      const mockTemplate = createTestTaskTemplate({ id: 'template-123' });

      (prisma.taskTemplate.update as jest.Mock).mockResolvedValue(mockTemplate);

      await taskTemplateService.updateTaskTemplate('template-123', input);

      expect(prisma.taskTemplate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            areaType: { connect: { id: 'area-type-456' } },
          }),
        })
      );
    });
  });

  describe('archiveTaskTemplate', () => {
    it('should set archivedAt timestamp', async () => {
      const mockTemplate = createTestTaskTemplate({ id: 'template-123', archivedAt: new Date() });

      (prisma.taskTemplate.update as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await taskTemplateService.archiveTaskTemplate('template-123');

      expect(prisma.taskTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-123' },
        data: { archivedAt: expect.any(Date) },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockTemplate);
    });
  });

  describe('restoreTaskTemplate', () => {
    it('should set archivedAt to null', async () => {
      const mockTemplate = createTestTaskTemplate({ id: 'template-123', archivedAt: null });

      (prisma.taskTemplate.update as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await taskTemplateService.restoreTaskTemplate('template-123');

      expect(prisma.taskTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-123' },
        data: { archivedAt: null },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockTemplate);
    });
  });

  describe('deleteTaskTemplate', () => {
    it('should delete template by id', async () => {
      (prisma.taskTemplate.delete as jest.Mock).mockResolvedValue({ id: 'template-123' });

      const result = await taskTemplateService.deleteTaskTemplate('template-123');

      expect(prisma.taskTemplate.delete).toHaveBeenCalledWith({
        where: { id: 'template-123' },
        select: { id: true },
      });
      expect(result).toEqual({ id: 'template-123' });
    });
  });
});
