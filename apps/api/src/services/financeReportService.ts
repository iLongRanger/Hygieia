import { prisma } from '../lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

function toNumber(val: Decimal | number | null | undefined): number {
  if (val == null) return 0;
  return typeof val === 'number' ? val : Number(val);
}

function getDefaultDateRange(): { dateFrom: Date; dateTo: Date } {
  const now = new Date();
  const dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { dateFrom, dateTo };
}

function resolveDateRange(dateFrom?: Date, dateTo?: Date) {
  const defaults = getDefaultDateRange();
  return {
    dateFrom: dateFrom ?? defaults.dateFrom,
    dateTo: dateTo ?? defaults.dateTo,
  };
}

function formatPeriodLabel(dateFrom: Date, dateTo: Date): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  if (
    dateFrom.getMonth() === dateTo.getMonth() &&
    dateFrom.getFullYear() === dateTo.getFullYear()
  ) {
    return `${months[dateFrom.getMonth()]} ${dateFrom.getFullYear()}`;
  }
  return `${months[dateFrom.getMonth()]} ${dateFrom.getFullYear()} - ${months[dateTo.getMonth()]} ${dateTo.getFullYear()}`;
}

function formatMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86400000;
  return Math.floor((b.getTime() - a.getTime()) / msPerDay);
}

// ── Finance Overview ──────────────────────────────────────────────────

export async function getFinanceOverview(dateFrom?: Date, dateTo?: Date) {
  const range = resolveDateRange(dateFrom, dateTo);

  // Revenue: sum of amountPaid on invoices paid within the period
  const revenueResult = await prisma.invoice.aggregate({
    _sum: { amountPaid: true },
    where: {
      status: 'paid',
      paidAt: { gte: range.dateFrom, lte: range.dateTo },
    },
  });
  const totalRevenue = toNumber(revenueResult._sum.amountPaid);

  // Expenses: sum of approved expenses in period
  const expenseResult = await prisma.expense.aggregate({
    _sum: { amount: true },
    where: {
      status: 'approved',
      date: { gte: range.dateFrom, lte: range.dateTo },
    },
  });
  const totalExpenses = toNumber(expenseResult._sum.amount);

  // Outstanding AR: all time unpaid invoice balances
  const arResult = await prisma.invoice.aggregate({
    _sum: { balanceDue: true },
    where: {
      status: { notIn: ['paid', 'void', 'draft'] },
    },
  });
  const outstandingAR = toNumber(arResult._sum.balanceDue);

  // Overdue invoices count
  const now = new Date();
  const overdueInvoices = await prisma.invoice.count({
    where: {
      status: { notIn: ['paid', 'void', 'draft'] },
      dueDate: { lt: now },
    },
  });

  // Upcoming payroll: latest draft payroll run
  const draftPayroll = await prisma.payrollRun.findFirst({
    where: { status: 'draft' },
    orderBy: { createdAt: 'desc' },
    select: { totalGrossPay: true },
  });
  const upcomingPayroll = draftPayroll ? toNumber(draftPayroll.totalGrossPay) : 0;

  return {
    totalRevenue,
    totalExpenses,
    netIncome: totalRevenue - totalExpenses,
    outstandingAR,
    overdueInvoices,
    upcomingPayroll,
    periodLabel: formatPeriodLabel(range.dateFrom, range.dateTo),
  };
}

// ── AR Aging Report ───────────────────────────────────────────────────

export async function getArAgingReport() {
  const now = new Date();

  const unpaidInvoices = await prisma.invoice.findMany({
    where: {
      status: { notIn: ['paid', 'void'] },
    },
    select: {
      id: true,
      invoiceNumber: true,
      totalAmount: true,
      balanceDue: true,
      dueDate: true,
      account: { select: { name: true } },
    },
    orderBy: { dueDate: 'asc' },
  });

  const bucketDefs = [
    { label: 'Current', min: 0, max: 0 },
    { label: '1-30 Days', min: 1, max: 30 },
    { label: '31-60 Days', min: 31, max: 60 },
    { label: '61-90 Days', min: 61, max: 90 },
    { label: '90+ Days', min: 91, max: null as number | null },
  ];

  const buckets = bucketDefs.map((def) => ({
    ...def,
    total: 0,
    count: 0,
    invoices: [] as {
      id: string;
      invoiceNumber: string;
      accountName: string;
      totalAmount: number;
      balanceDue: number;
      dueDate: Date;
      daysOverdue: number;
    }[],
  }));

  let totalOutstanding = 0;
  let totalOverdue = 0;

  for (const inv of unpaidInvoices) {
    const daysOverdue = Math.max(0, daysBetween(new Date(inv.dueDate), now));
    const balance = toNumber(inv.balanceDue);
    totalOutstanding += balance;

    if (daysOverdue > 0) {
      totalOverdue += balance;
    }

    const invoiceData = {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      accountName: inv.account.name,
      totalAmount: toNumber(inv.totalAmount),
      balanceDue: balance,
      dueDate: inv.dueDate,
      daysOverdue,
    };

    // Find the right bucket
    for (const bucket of buckets) {
      const inBucket =
        bucket.max === null
          ? daysOverdue >= bucket.min
          : daysOverdue >= bucket.min && daysOverdue <= bucket.max;
      if (inBucket) {
        bucket.total += balance;
        bucket.count += 1;
        bucket.invoices.push(invoiceData);
        break;
      }
    }
  }

  return {
    buckets,
    summary: { totalOutstanding, totalOverdue },
  };
}

// ── Profitability Report ──────────────────────────────────────────────

export async function getProfitabilityReport(
  dateFrom?: Date,
  dateTo?: Date,
  groupBy: 'contract' | 'facility' = 'contract'
) {
  const range = resolveDateRange(dateFrom, dateTo);

  if (groupBy === 'contract') {
    // Get all active contracts
    const contracts = await prisma.contract.findMany({
      where: { status: { not: 'cancelled' } },
      select: {
        id: true,
        monthlyValue: true,
        account: { select: { name: true } },
        facility: { select: { id: true, name: true } },
      },
    });

    // Revenue per contract
    const invoiceRevenue = await prisma.invoice.groupBy({
      by: ['contractId'],
      _sum: { totalAmount: true },
      where: {
        status: 'paid',
        paidAt: { gte: range.dateFrom, lte: range.dateTo },
        contractId: { not: null },
      },
    });
    const revenueMap = new Map(
      invoiceRevenue.map((r) => [r.contractId, toNumber(r._sum.totalAmount)])
    );

    // Expenses per contract
    const expensesByContract = await prisma.expense.groupBy({
      by: ['contractId'],
      _sum: { amount: true },
      where: {
        status: 'approved',
        date: { gte: range.dateFrom, lte: range.dateTo },
        contractId: { not: null },
      },
    });
    const expenseMap = new Map(
      expensesByContract.map((e) => [e.contractId, toNumber(e._sum.amount)])
    );

    // Labor per contract (payroll entries from approved/paid runs)
    const laborEntries = await prisma.payrollEntry.groupBy({
      by: ['contractId'],
      _sum: { grossPay: true },
      where: {
        contractId: { not: null },
        payrollRun: {
          status: { in: ['approved', 'paid'] },
          periodStart: { gte: range.dateFrom },
          periodEnd: { lte: range.dateTo },
        },
      },
    });
    const laborMap = new Map(
      laborEntries.map((l) => [l.contractId, toNumber(l._sum.grossPay)])
    );

    const rows = contracts.map((c) => {
      const revenue = revenueMap.get(c.id) ?? 0;
      const expenses = expenseMap.get(c.id) ?? 0;
      const labor = laborMap.get(c.id) ?? 0;
      const profit = revenue - expenses - labor;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        id: c.id,
        name: c.account.name,
        facilityName: c.facility?.name ?? null,
        revenue,
        expenses,
        labor,
        profit,
        margin: Math.round(margin * 100) / 100,
      };
    });

    rows.sort((a, b) => b.profit - a.profit);
    return { rows, groupBy };
  }

  // groupBy === 'facility'
  const facilities = await prisma.facility.findMany({
    select: {
      id: true,
      name: true,
      account: { select: { name: true } },
    },
  });

  const invoiceRevenue = await prisma.invoice.groupBy({
    by: ['facilityId'],
    _sum: { totalAmount: true },
    where: {
      status: 'paid',
      paidAt: { gte: range.dateFrom, lte: range.dateTo },
      facilityId: { not: null },
    },
  });
  const revenueMap = new Map(
    invoiceRevenue.map((r) => [r.facilityId, toNumber(r._sum.totalAmount)])
  );

  const expensesByFacility = await prisma.expense.groupBy({
    by: ['facilityId'],
    _sum: { amount: true },
    where: {
      status: 'approved',
      date: { gte: range.dateFrom, lte: range.dateTo },
      facilityId: { not: null },
    },
  });
  const expenseMap = new Map(
    expensesByFacility.map((e) => [e.facilityId, toNumber(e._sum.amount)])
  );

  // For facility grouping, get labor through contract -> facility relation
  const laborByFacility = await prisma.payrollEntry.findMany({
    where: {
      contractId: { not: null },
      payrollRun: {
        status: { in: ['approved', 'paid'] },
        periodStart: { gte: range.dateFrom },
        periodEnd: { lte: range.dateTo },
      },
    },
    select: {
      grossPay: true,
      contract: { select: { facilityId: true } },
    },
  });
  const laborMap = new Map<string, number>();
  for (const entry of laborByFacility) {
    const fId = entry.contract?.facilityId;
    if (fId) {
      laborMap.set(fId, (laborMap.get(fId) ?? 0) + toNumber(entry.grossPay));
    }
  }

  const rows = facilities.map((f) => {
    const revenue = revenueMap.get(f.id) ?? 0;
    const expenses = expenseMap.get(f.id) ?? 0;
    const labor = laborMap.get(f.id) ?? 0;
    const profit = revenue - expenses - labor;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      id: f.id,
      name: f.name,
      accountName: f.account.name,
      revenue,
      expenses,
      labor,
      profit,
      margin: Math.round(margin * 100) / 100,
    };
  });

  rows.sort((a, b) => b.profit - a.profit);
  return { rows, groupBy };
}

// ── Revenue Report ────────────────────────────────────────────────────

export async function getRevenueReport(dateFrom?: Date, dateTo?: Date) {
  const range = resolveDateRange(dateFrom, dateTo);

  const paidInvoices = await prisma.invoice.findMany({
    where: {
      status: 'paid',
      paidAt: { gte: range.dateFrom, lte: range.dateTo },
    },
    select: {
      accountId: true,
      totalAmount: true,
      paidAt: true,
      account: { select: { name: true } },
    },
  });

  // Build month labels
  const monthSet = new Set<string>();
  const accountMap = new Map<
    string,
    { accountName: string; monthlyRevenue: Record<string, number>; total: number }
  >();

  for (const inv of paidInvoices) {
    const monthKey = formatMonthKey(new Date(inv.paidAt!));
    monthSet.add(monthKey);

    let entry = accountMap.get(inv.accountId);
    if (!entry) {
      entry = {
        accountName: inv.account.name,
        monthlyRevenue: {},
        total: 0,
      };
      accountMap.set(inv.accountId, entry);
    }

    const amount = toNumber(inv.totalAmount);
    entry.monthlyRevenue[monthKey] = (entry.monthlyRevenue[monthKey] ?? 0) + amount;
    entry.total += amount;
  }

  const monthLabels = Array.from(monthSet).sort();

  const rows = Array.from(accountMap.entries()).map(([accountId, data]) => ({
    accountId,
    accountName: data.accountName,
    monthlyRevenue: data.monthlyRevenue,
    total: data.total,
  }));

  rows.sort((a, b) => b.total - a.total);

  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);

  return { rows, monthLabels, grandTotal };
}

// ── Expense Summary Report ────────────────────────────────────────────

export async function getExpenseSummaryReport(dateFrom?: Date, dateTo?: Date) {
  const range = resolveDateRange(dateFrom, dateTo);

  const grouped = await prisma.expense.groupBy({
    by: ['categoryId'],
    _sum: { amount: true },
    _count: { id: true },
    where: {
      status: 'approved',
      date: { gte: range.dateFrom, lte: range.dateTo },
    },
  });

  // Get category names
  const categoryIds = grouped.map((g) => g.categoryId);
  const categories = await prisma.expenseCategory.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });
  const categoryNameMap = new Map(categories.map((c) => [c.id, c.name]));

  const rows = grouped.map((g) => ({
    categoryId: g.categoryId,
    categoryName: categoryNameMap.get(g.categoryId) ?? 'Unknown',
    total: toNumber(g._sum.amount),
    count: g._count.id,
  }));

  rows.sort((a, b) => b.total - a.total);

  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);

  return { rows, grandTotal };
}

// ── Labor Cost Report ─────────────────────────────────────────────────

export async function getLaborCostReport(dateFrom?: Date, dateTo?: Date) {
  const range = resolveDateRange(dateFrom, dateTo);

  const entries = await prisma.payrollEntry.findMany({
    where: {
      payrollRun: {
        status: { in: ['approved', 'paid'] },
        periodStart: { gte: range.dateFrom },
        periodEnd: { lte: range.dateTo },
      },
    },
    select: {
      userId: true,
      payType: true,
      grossPay: true,
      scheduledHours: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  });

  const userMap = new Map<
    string,
    {
      userName: string;
      userRole: string;
      payType: string;
      totalHours: number;
      totalGrossPay: number;
      entriesCount: number;
    }
  >();

  for (const entry of entries) {
    let data = userMap.get(entry.userId);
    if (!data) {
      data = {
        userName: `${entry.user.firstName} ${entry.user.lastName}`,
        userRole: entry.user.role,
        payType: entry.payType,
        totalHours: 0,
        totalGrossPay: 0,
        entriesCount: 0,
      };
      userMap.set(entry.userId, data);
    }
    data.totalHours += toNumber(entry.scheduledHours);
    data.totalGrossPay += toNumber(entry.grossPay);
    data.entriesCount += 1;
  }

  const rows = Array.from(userMap.entries()).map(([userId, data]) => ({
    userId,
    ...data,
  }));

  rows.sort((a, b) => b.totalGrossPay - a.totalGrossPay);

  const grandTotal = rows.reduce((sum, r) => sum + r.totalGrossPay, 0);

  return { rows, grandTotal };
}

// ── Payroll Summary Report ────────────────────────────────────────────

export async function getPayrollSummaryReport(dateFrom?: Date, dateTo?: Date) {
  const range = resolveDateRange(dateFrom, dateTo);

  const runs = await prisma.payrollRun.findMany({
    where: {
      OR: [
        { periodStart: { gte: range.dateFrom, lte: range.dateTo } },
        { periodEnd: { gte: range.dateFrom, lte: range.dateTo } },
      ],
    },
    select: {
      id: true,
      periodStart: true,
      periodEnd: true,
      status: true,
      totalGrossPay: true,
      totalEntries: true,
      approvedAt: true,
      paidAt: true,
    },
    orderBy: { periodStart: 'desc' },
  });

  const rows = runs.map((r) => ({
    id: r.id,
    periodStart: r.periodStart,
    periodEnd: r.periodEnd,
    status: r.status,
    totalGrossPay: toNumber(r.totalGrossPay),
    totalEntries: r.totalEntries,
    approvedAt: r.approvedAt,
    paidAt: r.paidAt,
  }));

  const totalPaid = rows
    .filter((r) => r.status === 'paid')
    .reduce((sum, r) => sum + r.totalGrossPay, 0);
  const totalApproved = rows
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + r.totalGrossPay, 0);
  const totalDraft = rows
    .filter((r) => r.status === 'draft')
    .reduce((sum, r) => sum + r.totalGrossPay, 0);

  return {
    rows,
    summary: { totalPaid, totalApproved, totalDraft },
  };
}
