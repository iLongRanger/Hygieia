import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_NAME = 'Acme Office Cleaning Demo';
const DEMO_ACCOUNT_NAME = `${DEMO_NAME} Account`;
const DEMO_FACILITY_NAME = 'Acme HQ - Demo Service Location';
const DEMO_CONTRACT_NUMBER = 'DEMO-INVOICE-001';

const address = {
  street: '500 Demo Plaza',
  city: 'Vancouver',
  state: 'BC',
  postalCode: 'V6B 1A1',
  country: 'Canada',
  timezone: 'America/Vancouver',
  latitude: 49.2827,
  longitude: -123.1207,
  geofenceRadiusMeters: 250,
};

const SERVICE_SCHEDULE = {
  days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const,
  allowedWindowStart: '08:00',
  allowedWindowEnd: '17:00',
  windowAnchor: 'start_day',
  timezoneSource: 'facility',
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function utcStartOfDay(d: Date): Date {
  return new Date(`${isoDate(d)}T00:00:00.000Z`);
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isWeekday(d: Date): boolean {
  const wd = d.getUTCDay();
  return wd >= 1 && wd <= 5;
}

async function ensureRole(key: string, label: string) {
  return prisma.role.upsert({
    where: { key },
    update: {},
    create: {
      key,
      label,
      description: `${label} demo role`,
      isSystemRole: true,
      permissions: {},
    },
  });
}

async function ensureAdmin() {
  const role = await ensureRole('admin', 'Admin');
  const user = await prisma.user.upsert({
    where: { email: 'demo.admin@hygieia.local' },
    update: { fullName: 'Demo Admin', status: 'active' },
    create: {
      email: 'demo.admin@hygieia.local',
      fullName: 'Demo Admin',
      status: 'active',
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });
  return user;
}

async function main() {
  console.log('Seeding invoice automation demo data...');

  const admin = await ensureAdmin();

  // Compute window: last fully-closed month, anchored on UTC start-of-day.
  // We want the contract to have a closed billing cycle so the scheduler
  // picks it up immediately.
  const today = utcStartOfDay(new Date());
  const lastMonthStart = new Date(today);
  lastMonthStart.setUTCDate(1);
  lastMonthStart.setUTCMonth(lastMonthStart.getUTCMonth() - 1);
  const lastMonthEnd = new Date(today);
  lastMonthEnd.setUTCDate(0); // last day of previous month

  // Contract starts on the first day of last month so the first billing
  // window is [lastMonthStart, lastMonthEnd] and the scheduler will treat
  // it as closed today.
  const contractStartDate = lastMonthStart;

  console.log(`Billing window will be ${isoDate(lastMonthStart)} -> ${isoDate(lastMonthEnd)}`);

  const account = await prisma.account.upsert({
    where: { name: DEMO_ACCOUNT_NAME },
    update: {
      type: 'commercial',
      billingEmail: 'billing+demo@acme.example.com',
      billingAddress: address,
      serviceAddress: address,
      accountManagerId: admin.id,
    },
    create: {
      name: DEMO_ACCOUNT_NAME,
      type: 'commercial',
      billingEmail: 'billing+demo@acme.example.com',
      billingAddress: address,
      serviceAddress: address,
      accountManagerId: admin.id,
      createdByUserId: admin.id,
    },
  });

  const facility = await prisma.facility.upsert({
    where: {
      accountId_name: {
        accountId: account.id,
        name: DEMO_FACILITY_NAME,
      },
    },
    update: {
      address,
      status: 'active',
      facilityManagerId: admin.id,
    },
    create: {
      accountId: account.id,
      name: DEMO_FACILITY_NAME,
      address,
      buildingType: 'office',
      status: 'active',
      facilityManagerId: admin.id,
      createdByUserId: admin.id,
    },
  });

  const contract = await prisma.contract.upsert({
    where: { contractNumber: DEMO_CONTRACT_NUMBER },
    update: {
      status: 'active',
      startDate: contractStartDate,
      serviceFrequency: '5x_week',
      serviceSchedule: SERVICE_SCHEDULE as unknown as Prisma.InputJsonValue,
      billingCycle: 'monthly',
      paymentTerms: 'Net 30',
      monthlyValue: new Prisma.Decimal(2400),
      taxRate: new Prisma.Decimal(0),
    },
    create: {
      contractNumber: DEMO_CONTRACT_NUMBER,
      title: 'Acme Office Cleaning - Monthly Service (Demo)',
      status: 'active',
      serviceCategory: 'commercial',
      accountId: account.id,
      facilityId: facility.id,
      startDate: contractStartDate,
      serviceFrequency: '5x_week',
      serviceSchedule: SERVICE_SCHEDULE as unknown as Prisma.InputJsonValue,
      billingCycle: 'monthly',
      paymentTerms: 'Net 30',
      monthlyValue: new Prisma.Decimal(2400),
      taxRate: new Prisma.Decimal(0),
      compensationType: 'hourly',
      includesInitialClean: false,
      createdByUserId: admin.id,
    },
  });

  console.log(`Contract: ${contract.contractNumber} (id ${contract.id})`);

  // Wipe any existing demo jobs/invoices so reruns are idempotent
  await prisma.invoiceJobAllocation.deleteMany({
    where: { invoice: { contractId: contract.id } },
  });
  await prisma.invoiceItem.deleteMany({
    where: { invoice: { contractId: contract.id } },
  });
  await prisma.invoiceActivity.deleteMany({
    where: { invoice: { contractId: contract.id } },
  });
  await prisma.invoice.deleteMany({ where: { contractId: contract.id } });
  await prisma.jobActivity.deleteMany({ where: { job: { contractId: contract.id } } });
  await prisma.jobSettlementReview.deleteMany({ where: { job: { contractId: contract.id } } });
  await prisma.job.deleteMany({ where: { contractId: contract.id } });

  // Walk every weekday in the window and create a job
  const weekdayDates: Date[] = [];
  let cursor = new Date(lastMonthStart);
  while (cursor.getTime() <= lastMonthEnd.getTime()) {
    if (isWeekday(cursor)) weekdayDates.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }

  console.log(`Creating ${weekdayDates.length} jobs across the window...`);

  // Pick two specific dates for the demo edge cases:
  //   - second-to-last weekday: missed, no make-up scheduled (drives the credit line)
  //   - third-to-last weekday: missed, will have a make-up scheduled
  const missedNoMakeupDate = weekdayDates[weekdayDates.length - 2];
  const missedWithMakeupDate = weekdayDates[weekdayDates.length - 3];

  let counter = 0;
  for (const date of weekdayDates) {
    counter += 1;
    const jobNumber = `${DEMO_CONTRACT_NUMBER}-${String(counter).padStart(2, '0')}`;
    const scheduledStart = new Date(`${isoDate(date)}T16:00:00.000Z`); // 08:00 PT
    const scheduledEnd = new Date(`${isoDate(date)}T01:00:00.000Z`);
    scheduledEnd.setUTCDate(scheduledEnd.getUTCDate() + 1); // 17:00 PT next-day UTC
    const isMissedNoMakeup = date.getTime() === missedNoMakeupDate.getTime();
    const isMissedWithMakeup = date.getTime() === missedWithMakeupDate.getTime();
    const isMissed = isMissedNoMakeup || isMissedWithMakeup;

    const job = await prisma.job.create({
      data: {
        jobNumber,
        contractId: contract.id,
        accountId: account.id,
        facilityId: facility.id,
        jobType: 'scheduled_service',
        jobCategory: 'recurring',
        status: isMissed ? 'missed' : 'completed',
        scheduledDate: utcStartOfDay(date),
        scheduledStartTime: scheduledStart,
        scheduledEndTime: scheduledEnd,
        actualStartTime: isMissed ? null : scheduledStart,
        actualEndTime: isMissed ? null : scheduledEnd,
        actualHours: isMissed ? null : new Prisma.Decimal(8),
        completionNotes: isMissed ? null : 'Demo completed visit',
        createdByUserId: admin.id,
      },
      select: { id: true, jobNumber: true, scheduledDate: true },
    });

    if (isMissedWithMakeup) {
      // Create a make-up job a few days after the window ended
      const makeupDate = addDays(lastMonthEnd, 2);
      const makeupNumber = `${DEMO_CONTRACT_NUMBER}-MAKEUP`;
      const makeupJob = await prisma.job.create({
        data: {
          jobNumber: makeupNumber,
          contractId: contract.id,
          accountId: account.id,
          facilityId: facility.id,
          jobType: 'scheduled_service',
          jobCategory: 'recurring',
          status: 'completed',
          scheduledDate: utcStartOfDay(makeupDate),
          scheduledStartTime: new Date(`${isoDate(makeupDate)}T16:00:00.000Z`),
          scheduledEndTime: new Date(`${isoDate(addDays(makeupDate, 1))}T01:00:00.000Z`),
          actualStartTime: new Date(`${isoDate(makeupDate)}T16:00:00.000Z`),
          actualEndTime: new Date(`${isoDate(addDays(makeupDate, 1))}T01:00:00.000Z`),
          actualHours: new Prisma.Decimal(8),
          completionNotes: `Make-up for missed ${job.jobNumber}`,
          createdByUserId: admin.id,
        },
        select: { id: true, jobNumber: true },
      });
      await prisma.jobActivity.create({
        data: {
          jobId: job.id,
          action: 'make_up_created',
          performedByUserId: admin.id,
          metadata: {
            makeUpJobId: makeupJob.id,
            makeUpJobNumber: makeupJob.jobNumber,
          },
        },
      });
      await prisma.jobActivity.create({
        data: {
          jobId: makeupJob.id,
          action: 'make_up_scheduled',
          performedByUserId: admin.id,
          metadata: {
            makeUpForJobId: job.id,
            originalScheduledDate: job.scheduledDate.toISOString(),
          },
        },
      });
      console.log(`  - ${job.jobNumber}: MISSED (with make-up ${makeupJob.jobNumber})`);
    } else if (isMissedNoMakeup) {
      console.log(`  - ${job.jobNumber}: MISSED (no make-up; will trigger credit line)`);
    }
  }

  console.log('\nDemo seed complete.');
  console.log('-----------------------------------');
  console.log(`Account:   ${account.name}`);
  console.log(`Facility:  ${facility.name}`);
  console.log(`Contract:  ${contract.contractNumber}`);
  console.log(`Window:    ${isoDate(lastMonthStart)} -> ${isoDate(lastMonthEnd)}`);
  console.log(`Monthly:   $2400 (5x/week, Net 30)`);
  console.log('\nNext steps:');
  console.log(`  1. Run the invoice scheduler: it will create a pending_review`);
  console.log(`     invoice for this contract with a credit line for the`);
  console.log(`     missed-no-makeup job.`);
  console.log(`  2. From an admin user, GET /api/v1/invoices?status=pending_review`);
  console.log(`     or open the Invoices page and select the Pending Review tab.`);
  console.log(`  3. Click into the invoice and hit "Approve & Send" to email`);
  console.log(`     billing+demo@acme.example.com (requires RESEND_API_KEY).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
