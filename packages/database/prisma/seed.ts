import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed...')

  const roles = await prisma.role.createMany({
    data: [
      {
        key: 'owner',
        label: 'Owner',
        description: 'Full system access',
        isSystemRole: true,
        permissions: { all: true }
      },
      {
        key: 'admin',
        label: 'Admin',
        description: 'CRM, proposals, contracts, reporting',
        isSystemRole: true,
        permissions: { crm: true, proposals: true, contracts: true, reporting: true }
      },
      {
        key: 'manager',
        label: 'Manager',
        description: 'Estimates, facilities, tasks, cleaners',
        isSystemRole: true,
        permissions: { estimates: true, facilities: true, tasks: true, cleaners: true }
      },
      {
        key: 'cleaner',
        label: 'Cleaner',
        description: 'Assigned work orders only',
        isSystemRole: true,
        permissions: { work_orders: true, own_tasks_only: true }
      }
    ],
    skipDuplicates: true
  })

  console.log(`Created ${roles.count} system roles`)

  console.log('Database seed completed successfully')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('Error seeding database:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
