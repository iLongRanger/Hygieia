import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as proposalTemplateService from '../proposalTemplateService';
import { prisma } from '../../lib/prisma';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    proposalTemplate: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe('proposalTemplateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('listTemplates should exclude archived by default', async () => {
    (prisma.proposalTemplate.findMany as jest.Mock).mockResolvedValue([{ id: 'template-1' }]);

    const result = await proposalTemplateService.listTemplates();

    expect(result).toHaveLength(1);
    expect(prisma.proposalTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { archivedAt: null },
      })
    );
  });

  it('createTemplate should unset existing defaults when new template is default', async () => {
    (prisma.proposalTemplate.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.proposalTemplate.create as jest.Mock).mockResolvedValue({ id: 'template-1', isDefault: true });

    const result = await proposalTemplateService.createTemplate({
      name: 'Default Terms',
      termsAndConditions: 'Terms content',
      isDefault: true,
      createdByUserId: 'user-1',
    });

    expect(prisma.proposalTemplate.updateMany).toHaveBeenCalledWith({
      where: { isDefault: true },
      data: { isDefault: false },
    });
    expect(prisma.proposalTemplate.create).toHaveBeenCalled();
    expect(result.id).toBe('template-1');
  });

  it('updateTemplate should update only provided fields', async () => {
    (prisma.proposalTemplate.update as jest.Mock).mockResolvedValue({ id: 'template-1', name: 'Updated' });

    const result = await proposalTemplateService.updateTemplate('template-1', {
      name: 'Updated',
    });

    expect(prisma.proposalTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'template-1' },
        data: expect.objectContaining({ name: 'Updated' }),
      })
    );
    expect(result.id).toBe('template-1');
  });
});
