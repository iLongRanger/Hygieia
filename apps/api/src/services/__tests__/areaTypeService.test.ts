import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as areaTypeService from '../areaTypeService';
import { prisma } from '../../lib/prisma';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    areaType: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

const createTestAreaType = (overrides?: Partial<any>) => ({
  id: 'area-type-123',
  name: 'Office',
  description: 'Standard office space',
  defaultSquareFeet: 200,
  baseCleaningTimeMinutes: 15,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  _count: { areas: 5, taskTemplates: 3 },
  ...overrides,
});

describe('areaTypeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listAreaTypes', () => {
    it('should return paginated area types', async () => {
      const mockAreaTypes = [
        createTestAreaType({ id: 'type-1', name: 'Office' }),
        createTestAreaType({ id: 'type-2', name: 'Restroom' }),
      ];

      (prisma.areaType.findMany as jest.Mock).mockResolvedValue(mockAreaTypes);
      (prisma.areaType.count as jest.Mock).mockResolvedValue(2);

      const result = await areaTypeService.listAreaTypes({});

      expect(result.data).toEqual(mockAreaTypes);
      expect(result.pagination.total).toBe(2);
    });

    it('should search by name and description', async () => {
      const mockAreaTypes = [createTestAreaType()];

      (prisma.areaType.findMany as jest.Mock).mockResolvedValue(mockAreaTypes);
      (prisma.areaType.count as jest.Mock).mockResolvedValue(1);

      await areaTypeService.listAreaTypes({ search: 'office' });

      expect(prisma.areaType.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'office', mode: 'insensitive' } },
              { description: { contains: 'office', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });
  });

  describe('getAreaTypeById', () => {
    it('should return area type by id', async () => {
      const mockAreaType = createTestAreaType();

      (prisma.areaType.findUnique as jest.Mock).mockResolvedValue(mockAreaType);

      const result = await areaTypeService.getAreaTypeById('type-123');

      expect(result).toEqual(mockAreaType);
    });
  });

  describe('getAreaTypeByName', () => {
    it('should return area type by name', async () => {
      const mockAreaType = { id: 'type-123', name: 'Office' };

      (prisma.areaType.findUnique as jest.Mock).mockResolvedValue(mockAreaType);

      const result = await areaTypeService.getAreaTypeByName('Office');

      expect(result).toEqual(mockAreaType);
    });
  });

  describe('createAreaType', () => {
    it('should create area type', async () => {
      const input: areaTypeService.AreaTypeCreateInput = {
        name: 'Lobby',
        description: 'Main entrance',
        defaultSquareFeet: 500,
        baseCleaningTimeMinutes: 30,
      };

      const mockAreaType = createTestAreaType(input);

      (prisma.areaType.create as jest.Mock).mockResolvedValue(mockAreaType);

      const result = await areaTypeService.createAreaType(input);

      expect(result).toEqual(mockAreaType);
    });
  });

  describe('updateAreaType', () => {
    it('should update area type', async () => {
      const input: areaTypeService.AreaTypeUpdateInput = {
        name: 'Updated Name',
        defaultSquareFeet: 300,
      };

      const mockAreaType = createTestAreaType(input);

      (prisma.areaType.update as jest.Mock).mockResolvedValue(mockAreaType);

      const result = await areaTypeService.updateAreaType('type-123', input);

      expect(result).toEqual(mockAreaType);
    });
  });

  describe('deleteAreaType', () => {
    it('should delete area type', async () => {
      (prisma.areaType.delete as jest.Mock).mockResolvedValue({ id: 'type-123' });

      const result = await areaTypeService.deleteAreaType('type-123');

      expect(result).toEqual({ id: 'type-123' });
    });
  });
});
