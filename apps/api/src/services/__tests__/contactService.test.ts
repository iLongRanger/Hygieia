import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as contactService from '../contactService';
import { prisma } from '../../lib/prisma';
import { createTestContact } from '../../test/helpers';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    contact: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('contactService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listContacts', () => {
    it('should return paginated contacts', async () => {
      const mockContacts = [
        createTestContact({ id: 'contact-1', name: 'John Doe' }),
        createTestContact({ id: 'contact-2', name: 'Jane Smith' }),
      ];

      (prisma.contact.findMany as jest.Mock).mockResolvedValue(mockContacts);
      (prisma.contact.count as jest.Mock).mockResolvedValue(2);

      const result = await contactService.listContacts({});

      expect(result.data).toEqual(mockContacts);
      expect(result.pagination.total).toBe(2);
    });

    it('should filter by accountId', async () => {
      const mockContacts = [createTestContact()];

      (prisma.contact.findMany as jest.Mock).mockResolvedValue(mockContacts);
      (prisma.contact.count as jest.Mock).mockResolvedValue(1);

      await contactService.listContacts({ accountId: 'account-123' });

      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountId: 'account-123',
          }),
        })
      );
    });

    it('should filter by isPrimary', async () => {
      const mockContacts = [createTestContact({ isPrimary: true })];

      (prisma.contact.findMany as jest.Mock).mockResolvedValue(mockContacts);
      (prisma.contact.count as jest.Mock).mockResolvedValue(1);

      await contactService.listContacts({ isPrimary: true });

      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isPrimary: true,
          }),
        })
      );
    });

    it('should filter by isBilling', async () => {
      const mockContacts = [createTestContact({ isBilling: true })];

      (prisma.contact.findMany as jest.Mock).mockResolvedValue(mockContacts);
      (prisma.contact.count as jest.Mock).mockResolvedValue(1);

      await contactService.listContacts({ isBilling: true });

      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isBilling: true,
          }),
        })
      );
    });

    it('should search by name and email', async () => {
      const mockContacts = [createTestContact()];

      (prisma.contact.findMany as jest.Mock).mockResolvedValue(mockContacts);
      (prisma.contact.count as jest.Mock).mockResolvedValue(1);

      await contactService.listContacts({ search: 'john' });

      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'john', mode: 'insensitive' } },
              { email: { contains: 'john', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });
  });

  describe('getContactById', () => {
    it('should return contact by id', async () => {
      const mockContact = createTestContact({ id: 'contact-123' });

      (prisma.contact.findUnique as jest.Mock).mockResolvedValue(mockContact);

      const result = await contactService.getContactById('contact-123');

      expect(result).toEqual(mockContact);
    });
  });

  describe('createContact', () => {
    it('should create contact with all fields', async () => {
      const input: contactService.ContactCreateInput = {
        accountId: 'account-123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-0100',
        mobile: '555-0101',
        title: 'Manager',
        department: 'Operations',
        isPrimary: true,
        isBilling: false,
        notes: 'Main contact',
        createdByUserId: 'user-123',
      };

      const mockContact = createTestContact(input);

      (prisma.contact.create as jest.Mock).mockResolvedValue(mockContact);

      const result = await contactService.createContact(input);

      expect(result).toEqual(mockContact);
    });

    it('should default isPrimary and isBilling to false', async () => {
      const input: contactService.ContactCreateInput = {
        name: 'Jane Doe',
        createdByUserId: 'user-123',
      };

      const mockContact = createTestContact(input);

      (prisma.contact.create as jest.Mock).mockResolvedValue(mockContact);

      await contactService.createContact(input);

      expect(prisma.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isPrimary: false,
            isBilling: false,
          }),
        })
      );
    });
  });

  describe('updateContact', () => {
    it('should update contact fields', async () => {
      const input: contactService.ContactUpdateInput = {
        name: 'Updated Name',
        email: 'updated@example.com',
        isPrimary: true,
      };

      const mockContact = createTestContact(input);

      (prisma.contact.update as jest.Mock).mockResolvedValue(mockContact);

      const result = await contactService.updateContact('contact-123', input);

      expect(result).toEqual(mockContact);
    });

    it('should disconnect account when set to null', async () => {
      const mockContact = createTestContact({ id: 'contact-123' });

      (prisma.contact.update as jest.Mock).mockResolvedValue(mockContact);

      await contactService.updateContact('contact-123', { accountId: null });

      expect(prisma.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            account: { disconnect: true },
          }),
        })
      );
    });
  });

  describe('archiveContact', () => {
    it('should archive contact', async () => {
      const mockContact = createTestContact({ id: 'contact-123', archivedAt: new Date() });

      (prisma.contact.update as jest.Mock).mockResolvedValue(mockContact);

      await contactService.archiveContact('contact-123');

      expect(prisma.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact-123' },
        data: { archivedAt: expect.any(Date) },
        select: expect.any(Object),
      });
    });
  });

  describe('restoreContact', () => {
    it('should restore contact', async () => {
      const mockContact = createTestContact({ id: 'contact-123' });

      (prisma.contact.update as jest.Mock).mockResolvedValue(mockContact);

      await contactService.restoreContact('contact-123');

      expect(prisma.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact-123' },
        data: { archivedAt: null },
        select: expect.any(Object),
      });
    });
  });

  describe('deleteContact', () => {
    it('should delete contact', async () => {
      (prisma.contact.delete as jest.Mock).mockResolvedValue({ id: 'contact-123' });

      const result = await contactService.deleteContact('contact-123');

      expect(result).toEqual({ id: 'contact-123' });
    });
  });
});
