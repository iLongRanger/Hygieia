import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as areaTemplateService from '../areaTemplateService';
import { prisma } from '../../lib/prisma';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    areaTemplate: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    taskTemplate: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('areaTemplateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listAreaTemplates', () => {
    it('should return paginated results with defaults', async () => {
      const mockTemplates = [
        { id: 'template-1', name: 'Office' },
        { id: 'template-2', name: 'Lobby' },
      ];

      (prisma.areaTemplate.findMany as jest.Mock).mockResolvedValue(mockTemplates);
      (prisma.areaTemplate.count as jest.Mock).mockResolvedValue(2);

      const result = await areaTemplateService.listAreaTemplates({});

      expect(prisma.areaTemplate.findMany).toHaveBeenCalledWith({
        where: {},
        select: expect.any(Object),
        orderBy: { updatedAt: 'desc' },
        skip: 0,
        take: 50,
      });
      expect(result.data).toEqual(mockTemplates);
      expect(result.pagination.total).toBe(2);
    });

    it('should filter by areaTypeId and search', async () => {
      (prisma.areaTemplate.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.areaTemplate.count as jest.Mock).mockResolvedValue(0);

      await areaTemplateService.listAreaTemplates({
        areaTypeId: 'area-type-123',
        search: 'office',
      });

      expect(prisma.areaTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            areaTypeId: 'area-type-123',
            OR: [
              { name: { contains: 'office', mode: 'insensitive' } },
              { areaType: { name: { contains: 'office', mode: 'insensitive' } } },
            ],
          },
        })
      );
    });
  });

  describe('getAreaTemplateById', () => {
    it('should return template by id', async () => {
      const mockTemplate = { id: 'template-123', name: 'Office' };
      (prisma.areaTemplate.findUnique as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await areaTemplateService.getAreaTemplateById('template-123');

      expect(prisma.areaTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: 'template-123' },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockTemplate);
    });
  });

  describe('getAreaTemplateByAreaType', () => {
    it('should return template by area type', async () => {
      const mockTemplate = { id: 'template-123', name: 'Office' };
      (prisma.areaTemplate.findUnique as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await areaTemplateService.getAreaTemplateByAreaType('area-type-123');

      expect(prisma.areaTemplate.findUnique).toHaveBeenCalledWith({
        where: { areaTypeId: 'area-type-123' },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockTemplate);
    });
  });

  describe('createAreaTemplate', () => {
    it('should create template with items and task templates', async () => {
      const input: areaTemplateService.AreaTemplateCreateInput = {
        areaTypeId: 'area-type-123',
        name: 'Office Default',
        defaultSquareFeet: 1000,
        items: [
          {
            fixtureTypeId: 'fixture-1',
            defaultCount: 2,
            minutesPerItem: 5,
            sortOrder: 1,
          },
        ],
        taskTemplates: [{ id: 'task-template-1', sortOrder: 2 }],
        createdByUserId: 'user-123',
      };

      const mockTemplate = { id: 'template-123', name: 'Office Default' };
      (prisma.areaTemplate.create as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await areaTemplateService.createAreaTemplate(input);

      expect(prisma.areaTemplate.create).toHaveBeenCalledWith({
        data: {
          areaTypeId: input.areaTypeId,
          name: input.name,
          defaultSquareFeet: input.defaultSquareFeet,
          createdByUserId: input.createdByUserId,
          items: {
            create: [
              {
                fixtureTypeId: 'fixture-1',
                defaultCount: 2,
                minutesPerItem: 5,
                sortOrder: 1,
              },
            ],
          },
          tasks: {
            create: [
              {
                taskTemplateId: 'task-template-1',
                sortOrder: 2,
              },
            ],
          },
        },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockTemplate);
    });
  });

  describe('updateAreaTemplate', () => {
    it('should update items and task template links when provided', async () => {
      const input: areaTemplateService.AreaTemplateUpdateInput = {
        items: [
          {
            fixtureTypeId: 'fixture-1',
            defaultCount: 1,
            minutesPerItem: 4,
            sortOrder: 0,
          },
        ],
        taskTemplateIds: ['task-template-1', 'task-template-2'],
      };

      (prisma.areaTemplate.findUnique as jest.Mock).mockResolvedValue({
        createdByUserId: 'user-123',
        areaTypeId: 'area-type-123',
      });
      (prisma.areaTemplate.update as jest.Mock).mockResolvedValue({ id: 'template-123' });

      await areaTemplateService.updateAreaTemplate('template-123', input);

      expect(prisma.areaTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-123' },
        data: expect.objectContaining({
          items: {
            deleteMany: {},
            create: [
              {
                fixtureTypeId: 'fixture-1',
                defaultCount: 1,
                minutesPerItem: 4,
                sortOrder: 0,
              },
            ],
          },
          tasks: {
            deleteMany: {},
            create: [
              { taskTemplateId: 'task-template-1', sortOrder: 0 },
              { taskTemplateId: 'task-template-2', sortOrder: 1 },
            ],
          },
        }),
        select: expect.any(Object),
      });
    });
  });

  describe('deleteAreaTemplate', () => {
    it('should delete template by id', async () => {
      (prisma.areaTemplate.delete as jest.Mock).mockResolvedValue({ id: 'template-123' });

      const result = await areaTemplateService.deleteAreaTemplate('template-123');

      expect(prisma.areaTemplate.delete).toHaveBeenCalledWith({
        where: { id: 'template-123' },
        select: { id: true },
      });
      expect(result).toEqual({ id: 'template-123' });
    });
  });
});
