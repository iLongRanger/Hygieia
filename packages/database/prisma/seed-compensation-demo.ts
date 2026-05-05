import { Prisma, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const today = new Date()
const todayIso = today.toISOString().slice(0, 10)
const scheduledDate = new Date(`${todayIso}T00:00:00.000Z`)

const address = {
  street: '100 Demo Way',
  city: 'Vancouver',
  state: 'BC',
  postalCode: 'V6B 1A1',
  country: 'Canada',
  latitude: 49.2827,
  longitude: -123.1207,
  geofenceRadiusMeters: 250,
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
  })
}

async function ensureUser(input: {
  email: string
  fullName: string
  roleKey: string
  teamId?: string | null
  payType?: string | null
  hourlyPayRate?: number | null
}) {
  const role = await ensureRole(input.roleKey, input.roleKey.replace(/_/g, ' '))
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      fullName: input.fullName,
      teamId: input.teamId ?? null,
      status: 'active',
      payType: input.payType ?? null,
      hourlyPayRate:
        input.hourlyPayRate != null ? new Prisma.Decimal(input.hourlyPayRate) : null,
    },
    create: {
      email: input.email,
      fullName: input.fullName,
      teamId: input.teamId ?? null,
      status: 'active',
      payType: input.payType ?? null,
      hourlyPayRate:
        input.hourlyPayRate != null ? new Prisma.Decimal(input.hourlyPayRate) : null,
    },
  })

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  })

  return user
}

async function ensureJob(input: {
  jobNumber: string
  contractId: string
  accountId: string
  facilityId: string
  createdByUserId: string
  assignedTeamId?: string | null
  assignedToUserId?: string | null
  compensationType: 'hourly' | 'percentage'
  subcontractorPercentageSnapshot?: number | null
  jobRevenueSnapshot: number
  actualHours?: number | null
}) {
  return prisma.job.upsert({
    where: { jobNumber: input.jobNumber },
    update: {
      contractId: input.contractId,
      accountId: input.accountId,
      facilityId: input.facilityId,
      assignedTeamId: input.assignedTeamId ?? null,
      assignedToUserId: input.assignedToUserId ?? null,
      compensationType: input.compensationType,
      subcontractorPercentageSnapshot:
        input.subcontractorPercentageSnapshot != null
          ? new Prisma.Decimal(input.subcontractorPercentageSnapshot)
          : null,
      jobRevenueSnapshot: new Prisma.Decimal(input.jobRevenueSnapshot),
      status: 'completed',
      scheduledDate,
      actualStartTime: new Date(`${todayIso}T09:00:00.000Z`),
      actualEndTime: new Date(`${todayIso}T13:00:00.000Z`),
      actualHours:
        input.actualHours != null ? new Prisma.Decimal(input.actualHours) : null,
      completionNotes: 'Compensation demo completed job',
    },
    create: {
      jobNumber: input.jobNumber,
      contractId: input.contractId,
      accountId: input.accountId,
      facilityId: input.facilityId,
      assignedTeamId: input.assignedTeamId ?? null,
      assignedToUserId: input.assignedToUserId ?? null,
      compensationType: input.compensationType,
      subcontractorPercentageSnapshot:
        input.subcontractorPercentageSnapshot != null
          ? new Prisma.Decimal(input.subcontractorPercentageSnapshot)
          : null,
      jobRevenueSnapshot: new Prisma.Decimal(input.jobRevenueSnapshot),
      jobType: 'scheduled_service',
      jobCategory: 'recurring',
      status: 'completed',
      scheduledDate,
      scheduledStartTime: new Date(`${todayIso}T09:00:00.000Z`),
      scheduledEndTime: new Date(`${todayIso}T13:00:00.000Z`),
      actualStartTime: new Date(`${todayIso}T09:00:00.000Z`),
      actualEndTime: new Date(`${todayIso}T13:00:00.000Z`),
      actualHours:
        input.actualHours != null ? new Prisma.Decimal(input.actualHours) : null,
      completionNotes: 'Compensation demo completed job',
      createdByUserId: input.createdByUserId,
    },
  })
}

async function main() {
  console.log('Seeding compensation demo data...')

  const admin = await ensureUser({
    email: 'demo.admin@hygieia.local',
    fullName: 'Demo Admin',
    roleKey: 'admin',
  })

  const employee = await ensureUser({
    email: 'demo.employee@hygieia.local',
    fullName: 'Demo Hourly Employee',
    roleKey: 'cleaner',
    payType: 'hourly',
    hourlyPayRate: 24,
  })

  const team = await prisma.team.upsert({
    where: { name: 'Demo Subcontractor Team' },
    update: {
      isActive: true,
      contactName: 'Demo Subcontractor Lead',
      contactEmail: 'demo.subteam@hygieia.local',
      calendarColor: '#14b8a6',
    },
    create: {
      name: 'Demo Subcontractor Team',
      contactName: 'Demo Subcontractor Lead',
      contactEmail: 'demo.subteam@hygieia.local',
      isActive: true,
      calendarColor: '#14b8a6',
      createdByUserId: admin.id,
    },
  })

  const subcontractor = await ensureUser({
    email: 'demo.subcontractor@hygieia.local',
    fullName: 'Demo Percentage Subcontractor',
    roleKey: 'subcontractor',
    teamId: team.id,
    payType: 'percentage',
  })

  const hourlyAccount = await prisma.account.upsert({
    where: { name: 'Demo Hourly Compensation Account' },
    update: { type: 'commercial', accountManagerId: admin.id },
    create: {
      name: 'Demo Hourly Compensation Account',
      type: 'commercial',
      billingEmail: 'hourly.demo@example.com',
      billingAddress: address,
      serviceAddress: address,
      accountManagerId: admin.id,
      createdByUserId: admin.id,
    },
  })

  const percentageAccount = await prisma.account.upsert({
    where: { name: 'Demo Percentage Compensation Account' },
    update: { type: 'commercial', accountManagerId: admin.id },
    create: {
      name: 'Demo Percentage Compensation Account',
      type: 'commercial',
      billingEmail: 'percentage.demo@example.com',
      billingAddress: address,
      serviceAddress: address,
      accountManagerId: admin.id,
      createdByUserId: admin.id,
    },
  })

  const hourlyFacility = await prisma.facility.upsert({
    where: {
      accountId_name: {
        accountId: hourlyAccount.id,
        name: 'Demo Hourly Service Location',
      },
    },
    update: { address, status: 'active', facilityManagerId: admin.id },
    create: {
      accountId: hourlyAccount.id,
      name: 'Demo Hourly Service Location',
      address,
      buildingType: 'office',
      status: 'active',
      facilityManagerId: admin.id,
      createdByUserId: admin.id,
    },
  })

  const percentageFacility = await prisma.facility.upsert({
    where: {
      accountId_name: {
        accountId: percentageAccount.id,
        name: 'Demo Percentage Service Location',
      },
    },
    update: { address, status: 'active', facilityManagerId: admin.id },
    create: {
      accountId: percentageAccount.id,
      name: 'Demo Percentage Service Location',
      address,
      buildingType: 'office',
      status: 'active',
      facilityManagerId: admin.id,
      createdByUserId: admin.id,
    },
  })

  const hourlyContract = await prisma.contract.upsert({
    where: { contractNumber: 'DEMO-COMP-HOURLY' },
    update: {
      status: 'active',
      assignedToUserId: employee.id,
      assignedTeamId: null,
      compensationType: 'hourly',
      subcontractorPercentage: null,
    },
    create: {
      contractNumber: 'DEMO-COMP-HOURLY',
      title: 'Demo Hourly Compensation Contract',
      status: 'active',
      serviceCategory: 'commercial',
      accountId: hourlyAccount.id,
      facilityId: hourlyFacility.id,
      assignedToUserId: employee.id,
      compensationType: 'hourly',
      startDate: scheduledDate,
      serviceFrequency: 'weekly',
      monthlyValue: new Prisma.Decimal(1200),
      billingCycle: 'monthly',
      paymentTerms: 'Net 30',
      createdByUserId: admin.id,
    },
  })

  const percentageContract = await prisma.contract.upsert({
    where: { contractNumber: 'DEMO-COMP-PERCENTAGE' },
    update: {
      status: 'active',
      assignedTeamId: team.id,
      assignedToUserId: null,
      compensationType: 'percentage',
      subcontractorTier: 'premium',
      subcontractorPercentage: new Prisma.Decimal(0.65),
    },
    create: {
      contractNumber: 'DEMO-COMP-PERCENTAGE',
      title: 'Demo Percentage Compensation Contract',
      status: 'active',
      serviceCategory: 'commercial',
      accountId: percentageAccount.id,
      facilityId: percentageFacility.id,
      assignedTeamId: team.id,
      compensationType: 'percentage',
      subcontractorTier: 'premium',
      subcontractorPercentage: new Prisma.Decimal(0.65),
      startDate: scheduledDate,
      serviceFrequency: 'weekly',
      monthlyValue: new Prisma.Decimal(1000),
      billingCycle: 'monthly',
      paymentTerms: 'Net 30',
      createdByUserId: admin.id,
    },
  })

  const hourlyJob = await ensureJob({
    jobNumber: 'DEMO-JOB-HOURLY',
    contractId: hourlyContract.id,
    accountId: hourlyAccount.id,
    facilityId: hourlyFacility.id,
    createdByUserId: admin.id,
    assignedToUserId: employee.id,
    compensationType: 'hourly',
    jobRevenueSnapshot: 277.14,
    actualHours: 4,
  })

  const percentageJob = await ensureJob({
    jobNumber: 'DEMO-JOB-PERCENTAGE',
    contractId: percentageContract.id,
    accountId: percentageAccount.id,
    facilityId: percentageFacility.id,
    createdByUserId: admin.id,
    assignedTeamId: team.id,
    compensationType: 'percentage',
    subcontractorPercentageSnapshot: 0.65,
    jobRevenueSnapshot: 230.95,
  })

  await prisma.payrollRun.deleteMany({
    where: {
      entries: {
        some: {
          jobAllocations: {
            some: {
              jobId: { in: [hourlyJob.id, percentageJob.id] },
            },
          },
        },
      },
    },
  })

  await prisma.timeEntry.deleteMany({
    where: { jobId: { in: [hourlyJob.id, percentageJob.id] } },
  })

  await prisma.timeEntry.createMany({
    data: [
      {
        userId: employee.id,
        jobId: hourlyJob.id,
        contractId: hourlyContract.id,
        facilityId: hourlyFacility.id,
        entryType: 'clock_in',
        clockIn: new Date(`${todayIso}T09:00:00.000Z`),
        clockOut: new Date(`${todayIso}T13:00:00.000Z`),
        totalHours: new Prisma.Decimal(4),
        status: 'approved',
        approvedByUserId: admin.id,
        approvedAt: new Date(),
      },
      {
        userId: subcontractor.id,
        jobId: percentageJob.id,
        contractId: percentageContract.id,
        facilityId: percentageFacility.id,
        entryType: 'attendance',
        clockIn: new Date(`${todayIso}T09:00:00.000Z`),
        clockOut: new Date(`${todayIso}T13:00:00.000Z`),
        totalHours: null,
        status: 'completed',
      },
    ],
  })

  console.log('Compensation demo data ready:')
  console.log(`- Hourly contract: ${hourlyContract.contractNumber}`)
  console.log(`- Percentage contract: ${percentageContract.contractNumber}`)
  console.log(`- Hourly job: ${hourlyJob.jobNumber}`)
  console.log(`- Percentage job: ${percentageJob.jobNumber}`)
  console.log(`- Payroll period to test: ${todayIso} to ${todayIso}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
