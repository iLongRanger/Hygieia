import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as accountService from '../accountService';
import { prisma } from '../../lib/prisma';
import { createTestAccount } from '../../test/helpers';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    account: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    opportunity: {
      findFirst: jest.fn(),
    },
  },
}));

describe('accountService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.account.findMany as jest.Mock).mockResolvedValue([]);
  });

  describe('listAccounts', () => {
    it('should return paginated accounts with default parameters', async () => {
      const mockAccounts = [
        createTestAccount({ id: 'account-1', name: 'ACME Corp' }),
        createTestAccount({ id: 'account-2', name: 'Widget Inc' }),
      ];

      (prisma.account.findMany as jest.Mock).mockResolvedValue(mockAccounts);
      (prisma.account.count as jest.Mock).mockResolvedValue(2);

      const result = await accountService.listAccounts({});

      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: { archivedAt: null },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
      expect(result.data).toEqual(mockAccounts);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter by type', async () => {
      const mockAccounts = [createTestAccount({ accountType: 'commercial' })];

      (prisma.account.findMany as jest.Mock).mockResolvedValue(mockAccounts);
      (prisma.account.count as jest.Mock).mockResolvedValue(1);

      await accountService.listAccounts({ type: 'commercial' });

      expect(prisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'commercial',
          }),
        })
      );
    });

    it('should filter by accountManagerId', async () => {
      const mockAccounts = [createTestAccount()];

      (prisma.account.findMany as jest.Mock).mockResolvedValue(mockAccounts);
      (prisma.account.count as jest.Mock).mockResolvedValue(1);

      await accountService.listAccounts({ accountManagerId: 'manager-123' });

      expect(prisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountManagerId: 'manager-123',
          }),
        })
      );
    });

    it('should search by name and email', async () => {
      const mockAccounts = [createTestAccount()];

      (prisma.account.findMany as jest.Mock).mockResolvedValue(mockAccounts);
      (prisma.account.count as jest.Mock).mockResolvedValue(1);

      await accountService.listAccounts({ search: 'acme' });

      expect(prisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'acme', mode: 'insensitive' } },
              { billingEmail: { contains: 'acme', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    it('should include archived accounts when requested', async () => {
      const mockAccounts = [createTestAccount()];

      (prisma.account.findMany as jest.Mock).mockResolvedValue(mockAccounts);
      (prisma.account.count as jest.Mock).mockResolvedValue(1);

      await accountService.listAccounts({ includeArchived: true });

      expect(prisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      );
    });

    it('should paginate results correctly', async () => {
      const mockAccounts = [createTestAccount()];

      (prisma.account.findMany as jest.Mock).mockResolvedValue(mockAccounts);
      (prisma.account.count as jest.Mock).mockResolvedValue(100);

      const result = await accountService.listAccounts({ page: 3, limit: 10 });

      expect(prisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        })
      );
      expect(result.pagination.totalPages).toBe(10);
    });

    it('should sort by valid fields', async () => {
      const mockAccounts = [createTestAccount()];

      (prisma.account.findMany as jest.Mock).mockResolvedValue(mockAccounts);
      (prisma.account.count as jest.Mock).mockResolvedValue(1);

      await accountService.listAccounts({ sortBy: 'name', sortOrder: 'asc' });

      expect(prisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        })
      );
    });

    it('should filter ready-for-proposal accounts by opportunity walkthrough completion', async () => {
      (prisma.account.count as jest.Mock).mockResolvedValue(0);

      await accountService.listAccounts({ readyForProposal: true });

      expect(prisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            opportunities: {
              some: {
                archivedAt: null,
                appointments: {
                  some: {
                    type: 'walk_through',
                    status: 'completed',
                  },
                },
              },
            },
          }),
        })
      );
    });
  });

  describe('getAccountById', () => {
    it('should return account by id', async () => {
      const mockAccount = createTestAccount({ id: 'account-123' });

      (prisma.account.findUnique as jest.Mock).mockResolvedValue(mockAccount);

      const result = await accountService.getAccountById('account-123');

      expect(prisma.account.findUnique).toHaveBeenCalledWith({
        where: { id: 'account-123' },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockAccount);
    });

    it('should return null for non-existent account', async () => {
      (prisma.account.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await accountService.getAccountById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getAccountByName', () => {
    it('should return account by name', async () => {
      const mockAccount = { id: 'account-123', name: 'ACME Corp' };

      (prisma.account.findUnique as jest.Mock).mockResolvedValue(mockAccount);

      const result = await accountService.getAccountByName('ACME Corp');

      expect(prisma.account.findUnique).toHaveBeenCalledWith({
        where: { name: 'ACME Corp' },
        select: { id: true, name: true },
      });
      expect(result).toEqual(mockAccount);
    });

    it('should return null for non-existent name', async () => {
      (prisma.account.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await accountService.getAccountByName('Non Existent');

      expect(result).toBeNull();
    });
  });

  describe('createAccount', () => {
    it('should create account with all fields', async () => {
      const input: accountService.AccountCreateInput = {
        name: 'ACME Corp',
        type: 'commercial',
        industry: 'Manufacturing',
        website: 'https://acme.com',
        billingEmail: 'billing@acme.com',
        billingPhone: '555-0100',
        billingAddress: { street: '123 Main St', city: 'Test City' },
        taxId: '12-3456789',
        paymentTerms: 'NET45',
        creditLimit: 50000,
        accountManagerId: 'manager-123',
        notes: 'VIP customer',
        createdByUserId: 'user-123',
      };

      const mockAccount = createTestAccount(input);

      (prisma.account.create as jest.Mock).mockResolvedValue(mockAccount);

      const result = await accountService.createAccount(input);

      expect(prisma.account.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'ACME Corp',
          type: 'commercial',
          paymentTerms: 'NET45',
          createdByUserId: 'user-123',
        }),
        select: expect.any(Object),
      });
      expect(result).toEqual(mockAccount);
    });

    it('should create account with minimal fields', async () => {
      const input: accountService.AccountCreateInput = {
        name: 'Simple Co',
        type: 'commercial',
        createdByUserId: 'user-123',
      };

      const mockAccount = createTestAccount(input);

      (prisma.account.create as jest.Mock).mockResolvedValue(mockAccount);

      const result = await accountService.createAccount(input);

      expect(prisma.account.create).toHaveBeenCalled();
      expect(result).toEqual(mockAccount);
    });

    it('should default payment terms to NET30', async () => {
      const input: accountService.AccountCreateInput = {
        name: 'Test Co',
        type: 'commercial',
        createdByUserId: 'user-123',
      };

      const mockAccount = createTestAccount(input);

      (prisma.account.create as jest.Mock).mockResolvedValue(mockAccount);

      await accountService.createAccount(input);

      expect(prisma.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentTerms: 'NET30',
          }),
        })
      );
    });

    it('should block duplicate account creation by name', async () => {
      (prisma.account.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'account-1',
          name: 'ACME Corp',
          billingEmail: null,
          billingPhone: null,
        },
      ]);

      await expect(
        accountService.createAccount({
          name: ' ACME Corp ',
          type: 'commercial',
          createdByUserId: 'user-123',
        })
      ).rejects.toThrow('A matching account already exists');

      expect(prisma.account.create).not.toHaveBeenCalled();
    });

    it('should block duplicate account creation by normalized company name', async () => {
      (prisma.account.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'account-1',
          name: 'Acme Corporation, LLC',
          billingEmail: null,
          billingPhone: null,
        },
      ]);

      await expect(
        accountService.createAccount({
          name: ' ACME Corp ',
          type: 'commercial',
          createdByUserId: 'user-123',
        })
      ).rejects.toThrow('A matching account already exists');
    });

    it('should block duplicate account creation by normalized phone', async () => {
      (prisma.account.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'account-1',
          name: 'Different Name',
          billingEmail: null,
          billingPhone: '(555) 0100',
        },
      ]);

      await expect(
        accountService.createAccount({
          name: 'Fresh Name',
          type: 'commercial',
          billingPhone: '555-0100',
          createdByUserId: 'user-123',
        })
      ).rejects.toThrow('A matching account already exists');
    });
  });

  describe('updateAccount', () => {
    it('should update account with provided fields', async () => {
      const input: accountService.AccountUpdateInput = {
        name: 'Updated Name',
        billingEmail: 'new@email.com',
        creditLimit: 75000,
      };

      const mockAccount = createTestAccount({ ...input, id: 'account-123' });

      (prisma.account.findUnique as jest.Mock).mockResolvedValue({
        name: 'Original Name',
        billingEmail: 'old@email.com',
        billingPhone: '555-0000',
      });
      (prisma.account.update as jest.Mock).mockResolvedValue(mockAccount);

      const result = await accountService.updateAccount('account-123', input);

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'account-123' },
        data: expect.objectContaining({
          name: 'Updated Name',
          billingEmail: 'new@email.com',
          creditLimit: 75000,
        }),
        select: expect.any(Object),
      });
      expect(result).toEqual(mockAccount);
    });

    it('should disconnect account manager when set to null', async () => {
      const input: accountService.AccountUpdateInput = {
        accountManagerId: null,
      };

      const mockAccount = createTestAccount({ id: 'account-123' });

      (prisma.account.update as jest.Mock).mockResolvedValue(mockAccount);

      await accountService.updateAccount('account-123', input);

      expect(prisma.account.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accountManager: { disconnect: true },
          }),
        })
      );
    });

    it('should connect account manager when provided', async () => {
      const input: accountService.AccountUpdateInput = {
        accountManagerId: 'manager-456',
      };

      const mockAccount = createTestAccount({ id: 'account-123' });

      (prisma.account.update as jest.Mock).mockResolvedValue(mockAccount);

      await accountService.updateAccount('account-123', input);

      expect(prisma.account.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accountManager: { connect: { id: 'manager-456' } },
          }),
        })
      );
    });

    it('should block renaming an account to a duplicate name', async () => {
      (prisma.account.findUnique as jest.Mock).mockResolvedValue({
        name: 'Original Co',
        billingEmail: null,
        billingPhone: null,
      });
      (prisma.account.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'account-999',
          name: 'ACME Corp',
          billingEmail: null,
          billingPhone: null,
        },
      ]);

      await expect(
        accountService.updateAccount('account-123', {
          name: ' ACME Corp ',
        })
      ).rejects.toThrow('A matching account already exists');

      expect(prisma.account.update).not.toHaveBeenCalled();
    });

    it('should block updating an account to a normalized duplicate phone', async () => {
      (prisma.account.findUnique as jest.Mock).mockResolvedValue({
        name: 'Original Co',
        billingEmail: null,
        billingPhone: '555-9999',
      });
      (prisma.account.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'account-999',
          name: 'Another Co',
          billingEmail: null,
          billingPhone: '(555) 555-0100',
        },
      ]);

      await expect(
        accountService.updateAccount('account-123', {
          billingPhone: '1 (555) 555-0100',
        })
      ).rejects.toThrow('A matching account already exists');
    });
  });

  describe('archiveAccount', () => {
    it('should set archivedAt timestamp', async () => {
      const mockAccount = createTestAccount({ id: 'account-123', archivedAt: new Date() });

      (prisma.account.update as jest.Mock).mockResolvedValue(mockAccount);

      const result = await accountService.archiveAccount('account-123');

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'account-123' },
        data: { archivedAt: expect.any(Date) },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockAccount);
    });
  });

  describe('restoreAccount', () => {
    it('should set archivedAt to null', async () => {
      const mockAccount = createTestAccount({ id: 'account-123', archivedAt: null });

      (prisma.account.update as jest.Mock).mockResolvedValue(mockAccount);

      const result = await accountService.restoreAccount('account-123');

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'account-123' },
        data: { archivedAt: null },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockAccount);
    });
  });

  describe('deleteAccount', () => {
    it('should delete account by id', async () => {
      (prisma.account.delete as jest.Mock).mockResolvedValue({ id: 'account-123' });

      const result = await accountService.deleteAccount('account-123');

      expect(prisma.account.delete).toHaveBeenCalledWith({
        where: { id: 'account-123' },
        select: { id: true },
      });
      expect(result).toEqual({ id: 'account-123' });
    });
  });
});
