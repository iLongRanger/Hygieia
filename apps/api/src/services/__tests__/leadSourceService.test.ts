import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as leadSourceService from '../leadSourceService';
import { prisma } from '../../lib/prisma';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    leadSource: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const createTestLeadSource = (overrides?: Partial<any>) => ({
  id: 'source-123',
  name: 'Website',
  description: 'Website inquiries',
  color: '#3B82F6',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

describe('leadSourceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listLeadSources', () => {
    it('should return all lead sources', async () => {
      const mockSources = [
        createTestLeadSource({ id: 'source-1', name: 'Website' }),
        createTestLeadSource({ id: 'source-2', name: 'Referral' }),
      ];

      (prisma.leadSource.findMany as jest.Mock).mockResolvedValue(mockSources);

      const result = await leadSourceService.listLeadSources();

      expect(prisma.leadSource.findMany).toHaveBeenCalledWith({
        where: {},
        select: expect.any(Object),
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(mockSources);
    });

    it('should filter by isActive', async () => {
      const mockSources = [createTestLeadSource({ isActive: true })];

      (prisma.leadSource.findMany as jest.Mock).mockResolvedValue(mockSources);

      await leadSourceService.listLeadSources(true);

      expect(prisma.leadSource.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        select: expect.any(Object),
        orderBy: { name: 'asc' },
      });
    });

    it('should return inactive sources when specified', async () => {
      const mockSources = [createTestLeadSource({ isActive: false })];

      (prisma.leadSource.findMany as jest.Mock).mockResolvedValue(mockSources);

      await leadSourceService.listLeadSources(false);

      expect(prisma.leadSource.findMany).toHaveBeenCalledWith({
        where: { isActive: false },
        select: expect.any(Object),
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('getLeadSourceById', () => {
    it('should return lead source by id', async () => {
      const mockSource = createTestLeadSource({ id: 'source-123' });

      (prisma.leadSource.findUnique as jest.Mock).mockResolvedValue(mockSource);

      const result = await leadSourceService.getLeadSourceById('source-123');

      expect(prisma.leadSource.findUnique).toHaveBeenCalledWith({
        where: { id: 'source-123' },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockSource);
    });

    it('should return null for non-existent source', async () => {
      (prisma.leadSource.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await leadSourceService.getLeadSourceById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getLeadSourceByName', () => {
    it('should return lead source by name', async () => {
      const mockSource = createTestLeadSource({ name: 'Website' });

      (prisma.leadSource.findUnique as jest.Mock).mockResolvedValue(mockSource);

      const result = await leadSourceService.getLeadSourceByName('Website');

      expect(prisma.leadSource.findUnique).toHaveBeenCalledWith({
        where: { name: 'Website' },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockSource);
    });
  });

  describe('createLeadSource', () => {
    it('should create lead source with all fields', async () => {
      const input: leadSourceService.LeadSourceCreateInput = {
        name: 'Trade Show',
        description: 'Trade show leads',
        color: '#10B981',
        isActive: true,
      };

      const mockSource = createTestLeadSource(input);

      (prisma.leadSource.create as jest.Mock).mockResolvedValue(mockSource);

      const result = await leadSourceService.createLeadSource(input);

      expect(prisma.leadSource.create).toHaveBeenCalledWith({
        data: {
          name: 'Trade Show',
          description: 'Trade show leads',
          color: '#10B981',
          isActive: true,
        },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockSource);
    });

    it('should default color to gray', async () => {
      const input: leadSourceService.LeadSourceCreateInput = {
        name: 'New Source',
      };

      const mockSource = createTestLeadSource({ ...input, color: '#6B7280' });

      (prisma.leadSource.create as jest.Mock).mockResolvedValue(mockSource);

      await leadSourceService.createLeadSource(input);

      expect(prisma.leadSource.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            color: '#6B7280',
          }),
        })
      );
    });

    it('should default isActive to true', async () => {
      const input: leadSourceService.LeadSourceCreateInput = {
        name: 'New Source',
      };

      const mockSource = createTestLeadSource(input);

      (prisma.leadSource.create as jest.Mock).mockResolvedValue(mockSource);

      await leadSourceService.createLeadSource(input);

      expect(prisma.leadSource.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });
  });

  describe('updateLeadSource', () => {
    it('should update lead source fields', async () => {
      const input: leadSourceService.LeadSourceUpdateInput = {
        name: 'Updated Name',
        color: '#EF4444',
        isActive: false,
      };

      const mockSource = createTestLeadSource(input);

      (prisma.leadSource.update as jest.Mock).mockResolvedValue(mockSource);

      const result = await leadSourceService.updateLeadSource('source-123', input);

      expect(prisma.leadSource.update).toHaveBeenCalledWith({
        where: { id: 'source-123' },
        data: {
          name: 'Updated Name',
          color: '#EF4444',
          isActive: false,
        },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockSource);
    });

    it('should update only provided fields', async () => {
      const input: leadSourceService.LeadSourceUpdateInput = {
        isActive: false,
      };

      const mockSource = createTestLeadSource({ isActive: false });

      (prisma.leadSource.update as jest.Mock).mockResolvedValue(mockSource);

      await leadSourceService.updateLeadSource('source-123', input);

      expect(prisma.leadSource.update).toHaveBeenCalledWith({
        where: { id: 'source-123' },
        data: {
          isActive: false,
        },
        select: expect.any(Object),
      });
    });
  });

  describe('deleteLeadSource', () => {
    it('should delete lead source by id', async () => {
      (prisma.leadSource.delete as jest.Mock).mockResolvedValue({ id: 'source-123' });

      const result = await leadSourceService.deleteLeadSource('source-123');

      expect(prisma.leadSource.delete).toHaveBeenCalledWith({
        where: { id: 'source-123' },
        select: { id: true },
      });
      expect(result).toEqual({ id: 'source-123' });
    });
  });
});
