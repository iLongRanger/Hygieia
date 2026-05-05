import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prisma } from '../../lib/prisma';
import { getExpenseByIdScoped, listExpenses } from '../expenseService';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    expense: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

describe('expenseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('listExpenses scopes managers to their own and managed account expenses', async () => {
    (prisma.expense.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.expense.count as jest.Mock).mockResolvedValue(0);

    await listExpenses({}, { role: 'manager', userId: 'manager-1' });

    const expectedScope = expect.arrayContaining([
      { createdByUserId: 'manager-1' },
      { contract: { account: { accountManagerId: 'manager-1' } } },
      { facility: { account: { accountManagerId: 'manager-1' } } },
      { job: { account: { accountManagerId: 'manager-1' } } },
    ]);
    expect(prisma.expense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expectedScope }),
      })
    );
    expect(prisma.expense.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expectedScope }),
      })
    );
  });

  it('getExpenseByIdScoped hides expenses outside manager scope', async () => {
    (prisma.expense.findUnique as jest.Mock).mockResolvedValue({
      id: 'expense-1',
      createdByUserId: 'other-user',
      createdByUser: { id: 'other-user', fullName: 'Other User', teamId: null },
    });
    (prisma.expense.count as jest.Mock).mockResolvedValue(0);

    await expect(
      getExpenseByIdScoped('expense-1', { role: 'manager', userId: 'manager-1' })
    ).rejects.toThrow('Expense not found');
  });
});
